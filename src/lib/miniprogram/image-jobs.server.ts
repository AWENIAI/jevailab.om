import { and, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  imageAssets,
  imageCreditLedger,
  imageGenerationJobs,
  imageGenerationOutputs,
  imageQuotes,
} from '@/db/image-creator.schema';
import { imageDispatchOutbox } from '@/db/miniprogram.schema';
import {
  createImageCreatorDraftFingerprint,
  getImageCreatorQuote,
} from '@/lib/image-creator/pricing';
import {
  findImageTemplate,
  imageTemplateSeeds,
  toPublicImageTemplate,
} from '@/lib/image-creator/templates.server';
import {
  imageCreatorDraftSchema,
  validateImageCreatorDraft,
} from '@/lib/image-creator/validation';
import type {
  ImageCreatorDraft,
  ImageCreatorMode,
  ImageCreatorRatio,
} from '@/lib/image-creator/types';
import { createPrivateMiniProgramUserUrl } from './private-media-url.server';
import { MiniProgramApiError } from './responses.server';
import {
  getOrCreateImageWallet,
  releaseGenerationReservation,
  reserveGenerationCredits,
} from './wallet.server';

const QUOTE_TTL_MS = 5 * 60_000;
const ACTIVE_JOB_STATUSES = [
  'queued',
  'running',
  'moderating',
  'reconciling',
] as const;

function parseDraft(input: Record<string, unknown>): ImageCreatorDraft {
  const parsed = imageCreatorDraftSchema.safeParse({
    templateId: input.templateId ?? null,
    referenceAssetId: input.referenceAssetId ?? null,
    mode: input.mode,
    ratio: input.ratio,
    count: input.count,
    extraPrompt: input.extraPrompt ?? '',
  });
  if (!parsed.success) {
    throw new MiniProgramApiError(
      'BAD_REQUEST',
      parsed.error.issues[0]?.message ?? '创作参数有误'
    );
  }
  if (parsed.data.count > 4) {
    throw new MiniProgramApiError('BAD_REQUEST', '单次最多生成 4 张图片');
  }
  return parsed.data;
}

function getTemplateOrThrow(templateId: string | null) {
  if (!templateId) return null;
  const template = findImageTemplate(templateId);
  if (!template) {
    throw new MiniProgramApiError('BAD_REQUEST', '所选模板已下架');
  }
  return template;
}

function validateDraftOrThrow(
  template: ReturnType<typeof getTemplateOrThrow>,
  draft: ImageCreatorDraft
) {
  try {
    return validateImageCreatorDraft({ template, draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创作参数有误';
    if (message.includes('reference image')) {
      throw new MiniProgramApiError(
        template?.inputPolicy === 'required'
          ? 'REFERENCE_REQUIRED'
          : 'REFERENCE_FORBIDDEN',
        template?.inputPolicy === 'required'
          ? '当前模板需要上传一张参考图'
          : '当前模板不支持参考图'
      );
    }
    throw new MiniProgramApiError('BAD_REQUEST', message);
  }
}

export async function listTemplates(input: { category?: string; q?: string }) {
  const category = input.category?.trim();
  const query = input.q?.trim().toLowerCase();
  const items = imageTemplateSeeds.filter((template) => {
    if (category && category !== '全部' && template.category !== category) {
      return false;
    }
    if (!query) return true;
    return [template.name, template.description, ...template.tags]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  return {
    items: items.map(toPublicImageTemplate),
    categories: Array.from(
      new Set(imageTemplateSeeds.map((template) => template.category))
    ),
  };
}

export function getCapabilities() {
  return {
    modes: ['1K_SD', '2K_HD'],
    ratios: ['AUTO', '9:16', '2:3', '3:4', '1:1', '4:3', '3:2', '16:9', '21:9'],
    maxCount: 4,
    referenceImage: {
      maxBytes: 10 * 1024 * 1024,
      mediaTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  };
}

export function getPolicy() {
  return {
    version: '2026-10-20',
    privacyUrl: '/privacy',
    termsUrl: '/terms',
  };
}

async function assertReferenceAsset(
  userId: string,
  assetId: string | null
): Promise<void> {
  if (!assetId) return;
  const [asset] = await getDb()
    .select({ id: imageAssets.id })
    .from(imageAssets)
    .where(
      and(
        eq(imageAssets.id, assetId),
        eq(imageAssets.userId, userId),
        eq(imageAssets.state, 'ready'),
        isNull(imageAssets.deletedAt)
      )
    )
    .limit(1);
  if (!asset) {
    throw new MiniProgramApiError('REFERENCE_UNAVAILABLE');
  }
}

export async function quoteDraft(
  userId: string,
  input: Record<string, unknown>
) {
  const draft = parseDraft(input);
  const template = getTemplateOrThrow(draft.templateId);
  const validated = validateDraftOrThrow(template, draft);
  await assertReferenceAsset(userId, validated.referenceAssetId);
  const quote = getImageCreatorQuote(validated);
  const paramsHash = await createImageCreatorDraftFingerprint(validated);
  const wallet = await getOrCreateImageWallet(userId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QUOTE_TTL_MS);
  const quoteId = crypto.randomUUID();
  await getDb()
    .insert(imageQuotes)
    .values({
      id: quoteId,
      userId,
      templateId: template?.id ?? null,
      templateRevision: template?.revision ?? null,
      referenceAssetId: validated.referenceAssetId,
      paramsHash,
      mode: validated.mode,
      ratio: validated.ratio,
      resolvedRatio: validated.ratio === 'AUTO' ? 'auto' : validated.ratio,
      outputCount: validated.count,
      unitCredits: quote.unitCredits,
      totalCredits: quote.totalCredits,
      priceVersion: quote.priceVersion,
      createdAt: now,
      expiresAt,
    });
  return {
    ...quote,
    quoteId,
    resolvedRatio: validated.ratio === 'AUTO' ? 'auto' : validated.ratio,
    expiresAt: expiresAt.toISOString(),
    walletAvailable: wallet.availableCredits,
    walletEstimatedAfter: wallet.availableCredits - quote.totalCredits,
  };
}

export async function createGeneration(
  userId: string,
  input: Record<string, unknown>,
  idempotencyHeader: string | null
) {
  const idempotencyKey =
    typeof input.idempotencyKey === 'string'
      ? input.idempotencyKey
      : idempotencyHeader;
  if (!idempotencyKey || !/^[A-Za-z0-9_.:-]{8,100}$/.test(idempotencyKey)) {
    throw new MiniProgramApiError('BAD_REQUEST', '缺少有效的幂等键');
  }
  if (input.consentAccepted !== true) {
    throw new MiniProgramApiError('BAD_REQUEST', '请先同意内容安全与隐私条款');
  }
  const db = getDb();
  const [existing] = await db
    .select()
    .from(imageGenerationJobs)
    .where(
      and(
        eq(imageGenerationJobs.userId, userId),
        eq(imageGenerationJobs.idempotencyKey, idempotencyKey)
      )
    )
    .limit(1);
  if (existing) return serializeJob(existing, []);

  const quoteId = typeof input.quoteId === 'string' ? input.quoteId : '';
  if (!quoteId) {
    throw new MiniProgramApiError('BAD_REQUEST', '缺少报价编号');
  }
  const draft = parseDraft(input);
  const template = getTemplateOrThrow(draft.templateId);
  const validated = validateDraftOrThrow(template, draft);
  await assertReferenceAsset(userId, validated.referenceAssetId);
  const paramsHash = await createImageCreatorDraftFingerprint(validated);
  const now = new Date();
  const [quote] = await db
    .select()
    .from(imageQuotes)
    .where(
      and(
        eq(imageQuotes.id, quoteId),
        eq(imageQuotes.userId, userId),
        isNull(imageQuotes.consumedAt),
        gte(imageQuotes.expiresAt, now)
      )
    )
    .limit(1);
  if (!quote) {
    throw new MiniProgramApiError('QUOTE_EXPIRED');
  }
  if (
    quote.paramsHash !== paramsHash ||
    quote.mode !== validated.mode ||
    quote.ratio !== validated.ratio ||
    quote.outputCount !== validated.count ||
    (quote.templateId ?? null) !== validated.templateId ||
    (quote.referenceAssetId ?? null) !== validated.referenceAssetId
  ) {
    throw new MiniProgramApiError(
      'CONFLICT',
      '创作参数与报价不一致，请重新报价'
    );
  }

  const jobId = crypto.randomUUID();
  const outboxId = crypto.randomUUID();
  const prompt =
    template?.basePrompt && validated.extraPrompt
      ? `${template.basePrompt}\n\n${validated.extraPrompt}`
      : template?.basePrompt || validated.extraPrompt;
  const account = await reserveGenerationCredits({
    userId,
    credits: quote.totalCredits,
  });
  try {
    const results = await db.batch([
      db
        .update(imageQuotes)
        .set({ consumedAt: now })
        .where(
          and(
            eq(imageQuotes.id, quote.id),
            eq(imageQuotes.userId, userId),
            isNull(imageQuotes.consumedAt),
            gte(imageQuotes.expiresAt, now)
          )
        )
        .returning({ id: imageQuotes.id }),
      db.insert(imageGenerationJobs).values({
        id: jobId,
        userId,
        quoteId: quote.id,
        idempotencyKey,
        paramsHash,
        templateId: template?.id ?? null,
        templateRevision: template?.revision ?? null,
        referenceAssetId: validated.referenceAssetId,
        mode: validated.mode,
        ratio: validated.ratio,
        resolvedRatio: validated.ratio === 'AUTO' ? 'auto' : validated.ratio,
        requestedCount: validated.count,
        deliveredCount: 0,
        unitCredits: quote.unitCredits,
        reservedCredits: quote.totalCredits,
        chargedCredits: 0,
        releasedCredits: 0,
        priceVersion: quote.priceVersion,
        status: 'queued',
        internalRequestSnapshot: JSON.stringify({
          prompt,
          templateId: template?.id ?? null,
          mode: validated.mode,
          ratio: validated.ratio,
          count: validated.count,
          referenceAssetId: validated.referenceAssetId,
        }),
        userPromptSnapshot: validated.extraPrompt,
        policyVersion:
          typeof input.policyVersion === 'string'
            ? input.policyVersion
            : '2026-10-20',
        consentAcceptedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(imageGenerationOutputs).values(
        Array.from({ length: validated.count }, (_, sequenceNo) => ({
          id: crypto.randomUUID(),
          jobId,
          sequenceNo,
          state: 'pending',
          createdAt: now,
          updatedAt: now,
        }))
      ),
      db.insert(imageDispatchOutbox).values({
        id: outboxId,
        jobId,
        state: 'PENDING',
        attemptNo: 0,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(imageCreditLedger).values({
        id: crypto.randomUUID(),
        eventKey: `hold:${jobId}`,
        userId,
        jobId,
        eventType: 'HOLD',
        availableDelta: -quote.totalCredits,
        reservedDelta: quote.totalCredits,
        availableAfter: account.availableCredits,
        reservedAfter: account.reservedCredits,
        reason: 'image-generation-hold',
        createdAt: now,
      }),
    ]);
    if (results[0].length === 0) {
      throw new MiniProgramApiError(
        'QUOTE_EXPIRED',
        '报价已被使用，请重新获取'
      );
    }
  } catch (error) {
    await releaseGenerationReservation({
      userId,
      credits: quote.totalCredits,
    });
    throw error;
  }
  return {
    id: jobId,
    status: 'queued',
    templateId: template?.id ?? null,
    templateName: template?.name ?? '自由创作',
    mode: validated.mode,
    ratio: validated.ratio,
    count: validated.count,
    requestedCount: validated.count,
    prompt: validated.extraPrompt,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    outputs: [],
    walletAvailable: account.availableCredits,
    walletReserved: account.reservedCredits,
  };
}

type PersistedJob = typeof imageGenerationJobs.$inferSelect;
type PersistedOutput = typeof imageGenerationOutputs.$inferSelect;

async function outputToDto(output: PersistedOutput) {
  const url =
    output.state === 'ready' && output.privateStorageKey
      ? await createPrivateMiniProgramUserUrl(output.privateStorageKey)
      : null;
  return {
    id: output.id,
    state: output.state,
    url,
    downloadRequired: Boolean(url),
    expiresAt: url ? Date.now() + 15 * 60_000 : null,
    width: output.width,
    height: output.height,
    mediaType: output.mediaType,
  };
}

async function serializeJob(job: PersistedJob, outputs: PersistedOutput[]) {
  if (outputs.length === 0 && job.status !== 'failed') {
    outputs = await getDb()
      .select()
      .from(imageGenerationOutputs)
      .where(eq(imageGenerationOutputs.jobId, job.id))
      .orderBy(imageGenerationOutputs.sequenceNo);
  }
  const template = job.templateId
    ? findImageTemplate(job.templateId)
    : undefined;
  const visibleOutputs = outputs.filter((output) => output.state === 'ready');
  return {
    id: job.id,
    status: job.status,
    templateId: job.templateId,
    templateName: template?.name ?? '自由创作',
    mode: job.mode,
    ratio: job.ratio,
    count: job.requestedCount,
    requestedCount: job.requestedCount,
    deliveredCount: job.deliveredCount,
    chargedCredits: job.chargedCredits,
    prompt: job.userPromptSnapshot,
    createdAt: job.createdAt.getTime(),
    updatedAt: job.updatedAt.getTime(),
    outputs: await Promise.all(visibleOutputs.map(outputToDto)),
    errorCode: job.errorCode,
  };
}

export async function listGenerations(userId: string) {
  const db = getDb();
  const jobs = await db
    .select()
    .from(imageGenerationJobs)
    .where(
      and(
        eq(imageGenerationJobs.userId, userId),
        isNull(imageGenerationJobs.deletedAt)
      )
    )
    .orderBy(desc(imageGenerationJobs.createdAt))
    .limit(50);
  if (jobs.length === 0) return { items: [] };
  const outputs = await db
    .select()
    .from(imageGenerationOutputs)
    .where(
      inArray(
        imageGenerationOutputs.jobId,
        jobs.map((job) => job.id)
      )
    );
  const byJob = new Map<string, PersistedOutput[]>();
  for (const output of outputs) {
    const list = byJob.get(output.jobId) ?? [];
    list.push(output);
    byJob.set(output.jobId, list);
  }
  return {
    items: await Promise.all(
      jobs.map((job) => serializeJob(job, byJob.get(job.id) ?? []))
    ),
  };
}

export async function getGeneration(userId: string, jobId: string) {
  const db = getDb();
  const [job] = await db
    .select()
    .from(imageGenerationJobs)
    .where(
      and(
        eq(imageGenerationJobs.id, jobId),
        eq(imageGenerationJobs.userId, userId),
        isNull(imageGenerationJobs.deletedAt)
      )
    )
    .limit(1);
  if (!job) throw new MiniProgramApiError('NOT_FOUND');
  const outputs = await db
    .select()
    .from(imageGenerationOutputs)
    .where(eq(imageGenerationOutputs.jobId, jobId))
    .orderBy(imageGenerationOutputs.sequenceNo);
  return serializeJob(job, outputs);
}

export async function deleteGeneration(userId: string, jobId: string) {
  const db = getDb();
  const [job] = await db
    .select()
    .from(imageGenerationJobs)
    .where(
      and(
        eq(imageGenerationJobs.id, jobId),
        eq(imageGenerationJobs.userId, userId),
        isNull(imageGenerationJobs.deletedAt)
      )
    )
    .limit(1);
  if (!job) throw new MiniProgramApiError('NOT_FOUND');
  if (
    ACTIVE_JOB_STATUSES.includes(
      job.status as (typeof ACTIVE_JOB_STATUSES)[number]
    )
  ) {
    throw new MiniProgramApiError('JOB_RUNNING');
  }
  await db
    .update(imageGenerationJobs)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(imageGenerationJobs.id, jobId),
        eq(imageGenerationJobs.userId, userId)
      )
    );
  return { deleted: true };
}

export async function getOutputDownloadUrl(userId: string, outputId: string) {
  const [row] = await getDb()
    .select({
      state: imageGenerationOutputs.state,
      privateStorageKey: imageGenerationOutputs.privateStorageKey,
    })
    .from(imageGenerationOutputs)
    .innerJoin(
      imageGenerationJobs,
      eq(imageGenerationJobs.id, imageGenerationOutputs.jobId)
    )
    .where(
      and(
        eq(imageGenerationOutputs.id, outputId),
        eq(imageGenerationJobs.userId, userId),
        isNull(imageGenerationJobs.deletedAt)
      )
    )
    .limit(1);
  if (!row || row.state !== 'ready' || !row.privateStorageKey) {
    throw new MiniProgramApiError('NOT_FOUND');
  }
  return {
    url: await createPrivateMiniProgramUserUrl(row.privateStorageKey),
  };
}

export function getImageCreatorModeLabel(mode: ImageCreatorMode) {
  return mode === '2K_HD' ? '2K 高清' : '1K 标准';
}

export function getImageCreatorRatioLabel(ratio: ImageCreatorRatio) {
  return ratio === 'AUTO' ? '自动' : ratio;
}

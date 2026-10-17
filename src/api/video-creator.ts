import { createServerFn } from '@tanstack/react-start';
import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { userFiles } from '@/db/app.schema';
import { getDb } from '@/db';
import {
  videoAssets,
  videoCreditAccounts,
  videoCreditLedger,
  videoDispatchOutbox,
  videoJobs,
  videoOutputs,
  videoQuotes,
} from '@/db/video-creator.schema';
import { getVideoCreatorCapabilitySnapshot } from '@/lib/video-creator/capabilities';
import {
  getVideoFeatureFlags,
  getVideoRuntimeLimits,
} from '@/lib/video-creator/config.server';
import { getVideoBudgetDecision } from '@/lib/video-creator/budget';
import { estimateVideoProviderCostMicros } from '@/lib/video-creator/pricing';
import { quoteConfiguredVideoCredits } from '@/lib/video-creator/pricing.server';
import type {
  VideoModel,
  VideoResolution,
} from '@/lib/video-creator/contracts';
import {
  findEnabledVideoTemplate,
  listEnabledVideoTemplates,
} from '@/lib/video-creator/templates.server';
import {
  validateVideoReferenceImageMetadata,
  videoGenerateInputSchema,
  videoQuoteInputSchema,
  videoReferenceUploadSchema,
} from '@/lib/video-creator/validation';
import { getRuntimeModerationProvider } from '@/lib/image-creator/moderation.server';
import { getBaseUrl } from '@/lib/urls';
import { authApiMiddleware } from '@/middlewares/auth-middleware';
import { deleteFile, uploadFile } from '@/storage';

const listJobsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(12),
});
const deleteOutputSchema = z.object({ outputId: z.string().min(8).max(128) });
const jobIdSchema = z.object({ jobId: z.string().min(8).max(128) });

function assertGenerationEnabled() {
  const flags = getVideoFeatureFlags();
  if (!flags.enabled || !flags.providerSendEnabled || !flags.liveTestEnabled) {
    throw new Error(
      'AI video creation is in safe review mode and cannot accept paid jobs.'
    );
  }
  if (!flags.allowPromoCredits) {
    // Paid balances are intentionally separate; this branch documents that
    // promotional balances are never used by the workflow below.
  }
}

function estimatePersistedVideoCostMicros({
  model,
  resolution,
  inputSeconds,
  outputSeconds,
}: {
  model: string;
  resolution: string;
  inputSeconds: number;
  outputSeconds: number;
}) {
  try {
    return estimateVideoProviderCostMicros({
      model: model as VideoModel,
      resolution: resolution as VideoResolution,
      inputSeconds,
      outputSeconds,
    });
  } catch {
    // An unknown historical price configuration must stop new spend until it is
    // reconciled, rather than being accidentally treated as zero cost.
    return Number.MAX_SAFE_INTEGER;
  }
}

async function getOrCreateVideoCreditAccount(userId: string) {
  const db = getDb();
  const now = new Date();
  await db
    .insert(videoCreditAccounts)
    .values({ userId, updatedAt: now })
    .onConflictDoNothing();
  const [account] = await db
    .select()
    .from(videoCreditAccounts)
    .where(eq(videoCreditAccounts.userId, userId))
    .limit(1);
  if (!account) throw new Error('Video credit account could not be created.');
  return account;
}

export const getVideoCreatorCapabilities = createServerFn({
  method: 'GET',
}).handler(async () => ({
  ...getVideoCreatorCapabilitySnapshot(),
  featureEnabled: getVideoFeatureFlags().enabled,
}));

export const getVideoCreatorTemplates = createServerFn({
  method: 'GET',
}).handler(async () => ({ items: await listEnabledVideoTemplates() }));

export const uploadVideoCreatorReference = createServerFn({ method: 'POST' })
  .validator(videoReferenceUploadSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data, context }) => {
    await validateVideoReferenceImageMetadata(data.file);
    const result = await uploadFile(data.file, data.file.name, data.file.type, {
      folder: 'video-assets',
      userId: context.userId,
      requestOrigin: getBaseUrl(),
    });
    if (!result.metadata)
      throw new Error('Video asset upload did not return metadata.');

    const moderation = await getRuntimeModerationProvider().review({
      kind: 'reference_image',
      assetId: result.metadata.id,
      storageKey: result.key,
    });
    if (moderation.decision !== 'approved') {
      await deleteFile(result.key);
      throw new Error(
        moderation.decision === 'unavailable'
          ? 'Reference image review is temporarily unavailable.'
          : 'Reference image cannot be used for video creation.'
      );
    }

    const now = result.metadata.uploadedAt;
    const db = getDb();
    await db.batch([
      db.insert(userFiles).values({
        id: result.metadata.id,
        userId: context.userId,
        filename: result.metadata.filename,
        originalName: result.metadata.originalName,
        contentType: result.metadata.contentType,
        size: result.metadata.size,
        r2Key: result.metadata.r2Key,
        isPublic: false,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(videoAssets).values({
        id: result.metadata.id,
        userId: context.userId,
        storageKey: result.key,
        sourceFilename: data.file.name,
        mediaType: data.file.type,
        byteSize: data.file.size,
        state: 'READY',
        moderationVersion: moderation.policyVersion,
        authorizationAcceptedAt: now,
        createdAt: now,
      }),
    ]);
    return { assetId: result.metadata.id, fileName: data.file.name };
  });

export const quoteVideoCreatorDraft = createServerFn({ method: 'POST' })
  .validator(videoQuoteInputSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data, context }) => {
    const template = await findEnabledVideoTemplate(data.templateId);
    if (!template || template.authorizationStatus !== 'approved') {
      throw new Error('This video template is not available for generation.');
    }
    const quote = await quoteConfiguredVideoCredits({
      model: data.model,
      resolution: data.resolution,
      inputSeconds: template.durationSeconds,
      outputSeconds: template.durationSeconds,
    });
    const account = await getOrCreateVideoCreditAccount(context.userId);
    const now = new Date();
    const limits = getVideoRuntimeLimits();
    const quoteId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + limits.quoteTtlSeconds * 1000);
    await getDb().insert(videoQuotes).values({
      id: quoteId,
      userId: context.userId,
      templateId: template.id,
      templateVersion: template.version,
      model: data.model,
      resolution: data.resolution,
      inputSeconds: template.durationSeconds,
      outputSeconds: template.durationSeconds,
      priceVersion: quote.priceVersion,
      quotedUnits: quote.quotedUnits,
      expiresAt,
      createdAt: now,
    });
    return {
      quoteId,
      creditUnits: quote.quotedUnits,
      credits: quote.quotedUnits / 10,
      priceVersion: quote.priceVersion,
      templateSeconds: template.durationSeconds,
      outputSeconds: template.durationSeconds,
      aspectRatio: template.aspectRatio,
      expiresAt: expiresAt.toISOString(),
      paidAvailableUnits: account.paidAvailableUnits,
      paidAvailableCredits: account.paidAvailableUnits / 10,
    };
  });

export const startVideoCreatorGeneration = createServerFn({ method: 'POST' })
  .validator(videoGenerateInputSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data, context }) => {
    assertGenerationEnabled();
    const db = getDb();
    const now = new Date();
    const limits = getVideoRuntimeLimits();
    const [existing] = await db
      .select({ id: videoJobs.id, status: videoJobs.status })
      .from(videoJobs)
      .where(
        and(
          eq(videoJobs.userId, context.userId),
          eq(videoJobs.idempotencyKey, data.idempotencyKey)
        )
      )
      .limit(1);
    if (existing)
      return { jobId: existing.id, status: existing.status, replayed: true };

    const [quote] = await db
      .select()
      .from(videoQuotes)
      .where(
        and(
          eq(videoQuotes.id, data.quoteId),
          eq(videoQuotes.userId, context.userId),
          isNull(videoQuotes.consumedAt),
          gte(videoQuotes.expiresAt, now)
        )
      )
      .limit(1);
    if (!quote) throw new Error('Quote expired or has already been used.');

    const [asset] = await db
      .select()
      .from(videoAssets)
      .where(
        and(
          eq(videoAssets.id, data.assetId),
          eq(videoAssets.userId, context.userId),
          eq(videoAssets.state, 'READY'),
          isNull(videoAssets.deletedAt)
        )
      )
      .limit(1);
    if (!asset) throw new Error('Reference image is unavailable.');

    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [activeCount, dayCount, weekCount, globalActiveCount, recentJobs] =
      await Promise.all([
        db
          .select({ total: count() })
          .from(videoJobs)
          .where(
            and(
              eq(videoJobs.userId, context.userId),
              sql`${videoJobs.status} IN ('QUEUED', 'DISPATCHING', 'SUBMITTED', 'PROCESSING')`
            )
          ),
        db
          .select({ total: count() })
          .from(videoJobs)
          .where(
            and(
              eq(videoJobs.userId, context.userId),
              gte(videoJobs.createdAt, dayAgo)
            )
          ),
        db
          .select({ total: count() })
          .from(videoJobs)
          .where(
            and(
              eq(videoJobs.userId, context.userId),
              gte(videoJobs.createdAt, weekAgo)
            )
          ),
        db
          .select({ total: count() })
          .from(videoJobs)
          .where(
            sql`${videoJobs.status} IN ('DISPATCHING', 'SUBMITTED', 'PROCESSING')`
          ),
        db
          .select({
            userId: videoJobs.userId,
            model: videoJobs.model,
            resolution: videoJobs.resolution,
            inputSeconds: videoJobs.inputSeconds,
            outputSeconds: videoJobs.outputSeconds,
            createdAt: videoJobs.createdAt,
          })
          .from(videoJobs)
          .where(gte(videoJobs.createdAt, dayAgo)),
      ]);
    if ((activeCount[0]?.total ?? 0) >= limits.maxActivePerUser) {
      throw new Error('You already have an active video job.');
    }
    if ((dayCount[0]?.total ?? 0) >= limits.maxJobsPerUserDay) {
      throw new Error('Daily video job limit reached.');
    }
    if ((weekCount[0]?.total ?? 0) >= limits.maxJobsPerUserWeek) {
      throw new Error('Weekly video job limit reached.');
    }

    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const requestedMicros = estimatePersistedVideoCostMicros(quote);
    const hourlyReservedMicros = recentJobs
      .filter((job) => job.createdAt >= hourAgo)
      .reduce((total, job) => total + estimatePersistedVideoCostMicros(job), 0);
    const dailyReservedMicros = recentJobs.reduce(
      (total, job) => total + estimatePersistedVideoCostMicros(job),
      0
    );
    const userDailyReservedMicros = recentJobs
      .filter((job) => job.userId === context.userId)
      .reduce((total, job) => total + estimatePersistedVideoCostMicros(job), 0);
    const budget = getVideoBudgetDecision({
      providerMaxInflight: limits.providerMaxInflight,
      hourlyBudgetMicros: limits.hourlyBudgetMicros,
      dailyBudgetMicros: limits.dailyBudgetMicros,
      perUserDailyBudgetMicros: limits.perUserDailyBudgetMicros,
      activeProviderJobs: globalActiveCount[0]?.total ?? 0,
      hourlyReservedMicros,
      dailyReservedMicros,
      userDailyReservedMicros,
      requestedMicros,
    });
    if (!budget.allowed) {
      throw new Error(`Video safety limit reached: ${budget.reason}.`);
    }

    const account = await getOrCreateVideoCreditAccount(context.userId);
    if (account.paidAvailableUnits < quote.quotedUnits) {
      throw new Error('Insufficient paid video credits.');
    }

    const jobId = crypto.randomUUID();
    const outboxId = crypto.randomUUID();
    const updated = await db
      .update(videoCreditAccounts)
      .set({
        paidAvailableUnits: sql`${videoCreditAccounts.paidAvailableUnits} - ${quote.quotedUnits}`,
        heldUnits: sql`${videoCreditAccounts.heldUnits} + ${quote.quotedUnits}`,
        version: sql`${videoCreditAccounts.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(videoCreditAccounts.userId, context.userId),
          gte(videoCreditAccounts.paidAvailableUnits, quote.quotedUnits),
          eq(videoCreditAccounts.version, account.version)
        )
      )
      .returning({
        paidAvailableUnits: videoCreditAccounts.paidAvailableUnits,
        heldUnits: videoCreditAccounts.heldUnits,
      });
    const updatedAccount = updated[0];
    if (!updatedAccount)
      throw new Error('Video credit balance changed. Request a new quote.');

    try {
      await db.batch([
        db
          .update(videoQuotes)
          .set({ consumedAt: now })
          .where(
            and(eq(videoQuotes.id, quote.id), isNull(videoQuotes.consumedAt))
          ),
        db.insert(videoJobs).values({
          id: jobId,
          userId: context.userId,
          quoteId: quote.id,
          idempotencyKey: data.idempotencyKey,
          assetId: asset.id,
          templateId: quote.templateId,
          templateVersion: quote.templateVersion,
          model: quote.model,
          resolution: quote.resolution,
          inputSeconds: quote.inputSeconds,
          outputSeconds: quote.outputSeconds,
          priceVersion: quote.priceVersion,
          quotedUnits: quote.quotedUnits,
          heldUnits: quote.quotedUnits,
          status: 'QUEUED',
          authorizationAcceptedAt: now,
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(videoCreditLedger).values({
          id: crypto.randomUUID(),
          eventKey: `hold:${jobId}`,
          userId: context.userId,
          jobId,
          eventType: 'HOLD',
          paidAvailableDelta: -quote.quotedUnits,
          heldDelta: quote.quotedUnits,
          paidAvailableAfter: updatedAccount.paidAvailableUnits,
          heldAfter: updatedAccount.heldUnits,
          reason: 'video-generation-hold',
          createdAt: now,
        }),
        db.insert(videoDispatchOutbox).values({
          id: outboxId,
          jobId,
          state: 'PENDING',
          createdAt: now,
          updatedAt: now,
        }),
      ]);
    } catch (error) {
      await db
        .update(videoCreditAccounts)
        .set({
          paidAvailableUnits: sql`${videoCreditAccounts.paidAvailableUnits} + ${quote.quotedUnits}`,
          heldUnits: sql`${videoCreditAccounts.heldUnits} - ${quote.quotedUnits}`,
          version: sql`${videoCreditAccounts.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(videoCreditAccounts.userId, context.userId));
      throw error;
    }
    return { jobId, status: 'QUEUED', replayed: false };
  });

export const listVideoCreatorJobs = createServerFn({ method: 'GET' })
  .validator(listJobsSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data, context }) => {
    const items = await getDb()
      .select({
        id: videoJobs.id,
        status: videoJobs.status,
        createdAt: videoJobs.createdAt,
        errorCode: videoJobs.errorCode,
        outputId: videoOutputs.id,
      })
      .from(videoJobs)
      .leftJoin(
        videoOutputs,
        and(
          eq(videoOutputs.jobId, videoJobs.id),
          isNull(videoOutputs.deletedAt)
        )
      )
      .where(
        and(eq(videoJobs.userId, context.userId), isNull(videoJobs.deletedAt))
      )
      .orderBy(desc(videoJobs.createdAt))
      .limit(data.limit);
    return { items };
  });

export const getVideoCreatorJob = createServerFn({ method: 'GET' })
  .validator(jobIdSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data, context }) => {
    const [job] = await getDb()
      .select({
        id: videoJobs.id,
        status: videoJobs.status,
        createdAt: videoJobs.createdAt,
        errorCode: videoJobs.errorCode,
        outputId: videoOutputs.id,
        outputStorageKey: videoOutputs.storageKey,
        outputMediaType: videoOutputs.mediaType,
      })
      .from(videoJobs)
      .leftJoin(
        videoOutputs,
        and(
          eq(videoOutputs.jobId, videoJobs.id),
          isNull(videoOutputs.deletedAt)
        )
      )
      .where(
        and(eq(videoJobs.id, data.jobId), eq(videoJobs.userId, context.userId))
      )
      .limit(1);
    if (!job) throw new Error('Video job not found.');
    return {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      errorCode: job.errorCode,
      output:
        job.outputId && job.outputStorageKey
          ? {
              id: job.outputId,
              mediaType: job.outputMediaType,
              mediaUrl: `/api/storage/file?key=${encodeURIComponent(job.outputStorageKey)}`,
            }
          : null,
    };
  });

export const deleteVideoCreatorOutput = createServerFn({ method: 'POST' })
  .validator(deleteOutputSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data, context }) => {
    const db = getDb();
    const [output] = await db
      .select({ id: videoOutputs.id, storageKey: videoOutputs.storageKey })
      .from(videoOutputs)
      .innerJoin(videoJobs, eq(videoJobs.id, videoOutputs.jobId))
      .where(
        and(
          eq(videoOutputs.id, data.outputId),
          eq(videoJobs.userId, context.userId),
          isNull(videoOutputs.deletedAt)
        )
      )
      .limit(1);
    if (!output) throw new Error('Video output not found.');
    await deleteFile(output.storageKey);
    await db
      .update(videoOutputs)
      .set({ deletedAt: new Date() })
      .where(eq(videoOutputs.id, output.id));
  });

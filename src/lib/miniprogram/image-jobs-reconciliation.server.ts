import { and, eq, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  imageGenerationJobs,
  imageGenerationOutputs,
} from '@/db/image-creator.schema';
import { serverEnv } from '@/env/server';
import { getRuntimeModerationProvider } from '@/lib/image-creator/moderation.server';
import { uploadFile } from '@/storage';
import { getFalImageResult, getFalQueueStatus } from './image-provider.server';
import { MiniProgramApiError } from './responses.server';
import { settleImageGenerationCredits } from './wallet.server';

type ProviderSnapshot = {
  provider?: {
    requestId?: string;
    statusUrl?: string;
    responseUrl?: string;
  };
};

const SAFE_PROVIDER_HOSTS = [
  'fal.media',
  'storage.googleapis.com',
  'storage.fal.ai',
];

function isSafeProviderUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      SAFE_PROVIDER_HOSTS.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
      )
    );
  } catch {
    return false;
  }
}

async function transferOutput({
  userId,
  jobId,
  outputId,
  sequenceNo,
  sourceUrl,
  width,
  height,
}: {
  userId: string;
  jobId: string;
  outputId: string;
  sequenceNo: number;
  sourceUrl: string;
  width?: number;
  height?: number;
}) {
  if (!isSafeProviderUrl(sourceUrl)) {
    throw new MiniProgramApiError('UPSTREAM_ERROR', '生成结果地址不安全');
  }
  const response = await fetch(sourceUrl);
  const contentType = (response.headers.get('content-type') ?? '').split(
    ';'
  )[0];
  const contentLength = Number(response.headers.get('content-length') ?? '0');
  if (
    !response.ok ||
    !response.body ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(contentType) ||
    (contentLength && contentLength > 20 * 1024 * 1024)
  ) {
    throw new MiniProgramApiError('UPSTREAM_ERROR', '生成结果无法安全转存');
  }
  const blob = await response.blob();
  if (blob.size > 20 * 1024 * 1024) {
    throw new MiniProgramApiError('UPSTREAM_ERROR', '生成结果超出存储限制');
  }
  const extension =
    contentType === 'image/jpeg'
      ? 'jpg'
      : contentType === 'image/webp'
        ? 'webp'
        : 'png';
  const moderation = await getRuntimeModerationProvider().review({
    kind: 'generated_image',
    jobId,
    outputId,
    sourceUrl,
  });
  if (moderation.decision !== 'approved') {
    await getDb()
      .update(imageGenerationOutputs)
      .set({
        state: moderation.decision === 'rejected' ? 'rejected' : 'failed',
        moderationVersion: moderation.policyVersion,
        updatedAt: new Date(),
      })
      .where(eq(imageGenerationOutputs.id, outputId));
    return {
      decision: moderation.decision,
      outputId,
    } as const;
  }
  const stored = await uploadFile(
    blob,
    `result-${jobId}-${sequenceNo}.${extension}`,
    contentType,
    {
      folder: 'image-outputs',
      userId,
      requestOrigin: serverEnv.VITE_BASE_URL,
    }
  );
  await getDb()
    .update(imageGenerationOutputs)
    .set({
      state: 'ready',
      privateStorageKey: stored.key,
      width: width ?? null,
      height: height ?? null,
      mediaType: contentType,
      moderationVersion: moderation.policyVersion,
      updatedAt: new Date(),
    })
    .where(eq(imageGenerationOutputs.id, outputId));
  return { decision: moderation.decision, outputId } as const;
}

async function reconcileJob(jobId: string) {
  const db = getDb();
  const [job] = await db
    .select()
    .from(imageGenerationJobs)
    .where(eq(imageGenerationJobs.id, jobId))
    .limit(1);
  if (!job) return 'skipped' as const;
  if (!job.providerRequestId) {
    await settleImageGenerationCredits({
      userId: job.userId,
      jobId: job.id,
      reservedCredits: job.reservedCredits,
      chargedCredits: 0,
      deliveredCount: 0,
      nextStatus: 'failed',
      reason:
        job.status === 'queued'
          ? 'dispatch-timeout'
          : 'provider-request-id-missing',
      errorCode: 'PROVIDER_SEND_UNKNOWN',
    });
    return 'failed' as const;
  }
  let snapshot: ProviderSnapshot = {};
  try {
    snapshot = JSON.parse(job.internalRequestSnapshot) as ProviderSnapshot;
  } catch {
    // A malformed snapshot leaves the hold intact.
  }
  if (!snapshot.provider?.statusUrl || !snapshot.provider.responseUrl) {
    return 'unknown' as const;
  }
  const statusUrl = snapshot.provider.statusUrl;
  const status = await getFalQueueStatus(statusUrl);
  if (status.state === 'IN_QUEUE' || status.state === 'IN_PROGRESS') {
    await db
      .update(imageGenerationJobs)
      .set({
        status: 'running',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(imageGenerationJobs.id, jobId),
          isNull(imageGenerationJobs.settledAt)
        )
      );
    return 'running' as const;
  }
  if (status.state !== 'COMPLETED') return 'unknown' as const;

  const responseUrl = snapshot.provider.responseUrl;
  const images = await getFalImageResult(responseUrl);
  if (images.length === 0) {
    await settleImageGenerationCredits({
      userId: job.userId,
      jobId: job.id,
      reservedCredits: job.reservedCredits,
      chargedCredits: 0,
      deliveredCount: 0,
      nextStatus: 'failed',
      reason: 'provider-empty-result',
      errorCode: 'PROVIDER_EMPTY_RESULT',
    });
    return 'failed' as const;
  }
  const existingOutputs = await db
    .select()
    .from(imageGenerationOutputs)
    .where(eq(imageGenerationOutputs.jobId, job.id))
    .orderBy(imageGenerationOutputs.sequenceNo);
  const maxCount = Math.min(images.length, job.requestedCount);
  let approved = 0;
  for (let index = 0; index < maxCount; index += 1) {
    const image = images[index];
    const output = existingOutputs[index];
    if (!output) continue;
    try {
      const result = await transferOutput({
        userId: job.userId,
        jobId: job.id,
        outputId: output.id,
        sequenceNo: index,
        sourceUrl: image.url,
        width: image.width,
        height: image.height,
      });
      if (result.decision === 'approved') approved += 1;
    } catch {
      // One failed transfer must not discard other approved outputs.
      await db
        .update(imageGenerationOutputs)
        .set({
          state: 'failed',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(imageGenerationOutputs.id, output.id),
            eq(imageGenerationOutputs.state, 'pending')
          )
        );
    }
  }
  if (maxCount < existingOutputs.length) {
    await db
      .update(imageGenerationOutputs)
      .set({
        state: 'failed',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(imageGenerationOutputs.jobId, job.id),
          inArray(
            imageGenerationOutputs.id,
            existingOutputs.slice(maxCount).map((output) => output.id)
          )
        )
      );
  }
  if (approved === 0) {
    await settleImageGenerationCredits({
      userId: job.userId,
      jobId: job.id,
      reservedCredits: job.reservedCredits,
      chargedCredits: 0,
      deliveredCount: 0,
      nextStatus: 'rejected',
      reason: 'all-outputs-rejected',
      errorCode: 'ALL_OUTPUTS_REJECTED',
    });
    return 'rejected' as const;
  }
  await settleImageGenerationCredits({
    userId: job.userId,
    jobId: job.id,
    reservedCredits: job.reservedCredits,
    chargedCredits: approved * job.unitCredits,
    deliveredCount: approved,
    nextStatus: approved === job.requestedCount ? 'completed' : 'partial',
    reason: 'image-generation-settled',
  });
  return approved === job.requestedCount ? 'completed' : 'partial';
}

export async function reconcileActiveImageJobs(limit = 3) {
  if (!serverEnv.FAL_KEY) {
    return { processed: 0, skipped: 'fal_disabled' as const };
  }
  const staleBefore = new Date(Date.now() - 5 * 60_000);
  const jobs = await getDb()
    .select({
      id: imageGenerationJobs.id,
    })
    .from(imageGenerationJobs)
    .where(
      and(
        isNull(imageGenerationJobs.settledAt),
        or(
          and(
            inArray(imageGenerationJobs.status, ['running', 'reconciling']),
            or(
              isNotNull(imageGenerationJobs.providerRequestId),
              lte(imageGenerationJobs.updatedAt, staleBefore)
            )
          ),
          and(
            eq(imageGenerationJobs.status, 'queued'),
            lte(imageGenerationJobs.createdAt, staleBefore)
          )
        )
      )
    )
    .limit(Math.max(1, Math.min(limit, 3)));
  let processed = 0;
  for (const job of jobs) {
    try {
      await reconcileJob(job.id);
      processed += 1;
    } catch {
      // Leave the hold intact and let the next cron retry reconciliation.
    }
  }
  return { processed, skipped: null };
}

export async function reconcileImageJobs() {
  const active = await reconcileActiveImageJobs();
  return { active };
}

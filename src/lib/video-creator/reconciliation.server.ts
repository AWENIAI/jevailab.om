import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  videoJobs,
  videoOutputs,
  videoWebhookInbox,
} from '@/db/video-creator.schema';
import { serverEnv } from '@/env/server';
import { getVideoFeatureFlags } from './config.server';
import { KieVideoProvider } from './provider';
import { isSafeVideoProviderResultUrl } from './provider-result-url';
import { getVideoSettlementPlan } from './settlement';
import { settleVideoJob } from './settlement.server';
import { uploadFile } from '@/storage';

async function transferProviderOutput({
  userId,
  jobId,
  sequenceNo,
  sourceUrl,
}: {
  userId: string;
  jobId: string;
  sequenceNo: number;
  sourceUrl: string;
}) {
  if (!isSafeVideoProviderResultUrl(sourceUrl)) {
    throw new Error('Provider returned an unsafe output URL.');
  }
  const response = await fetch(sourceUrl);
  const contentType = response.headers.get('content-type')?.split(';')[0] ?? '';
  const contentLength = Number(response.headers.get('content-length') ?? '0');
  if (
    !response.ok ||
    !response.body ||
    !['video/mp4', 'video/webm', 'video/quicktime'].includes(contentType) ||
    (contentLength && contentLength > 100 * 1024 * 1024)
  ) {
    throw new Error('Provider output could not be transferred safely.');
  }
  const blob = await response.blob();
  if (blob.size > 100 * 1024 * 1024) {
    throw new Error('Provider output exceeds the private storage limit.');
  }
  const extension =
    contentType === 'video/webm'
      ? 'webm'
      : contentType === 'video/quicktime'
        ? 'mov'
        : 'mp4';
  const stored = await uploadFile(
    blob,
    `result-${jobId}-${sequenceNo}.${extension}`,
    contentType,
    {
      folder: 'video-outputs',
      userId,
      requestOrigin: serverEnv.VITE_BASE_URL,
    }
  );
  await getDb().insert(videoOutputs).values({
    id: crypto.randomUUID(),
    jobId,
    sequenceNo,
    storageKey: stored.key,
    mediaType: contentType,
    byteSize: blob.size,
    createdAt: new Date(),
  });
}

export async function reconcileVideoWebhookInbox(limit = 10) {
  const flags = getVideoFeatureFlags();
  if (!flags.enabled || !flags.providerSendEnabled || !flags.liveTestEnabled) {
    return { processed: 0, skipped: 'disabled' as const };
  }
  const db = getDb();
  const provider = new KieVideoProvider(
    serverEnv.KIE_API_KEY ?? '',
    serverEnv.KIE_API_BASE_URL
  );
  const events = await db
    .select()
    .from(videoWebhookInbox)
    .where(eq(videoWebhookInbox.state, 'RECEIVED'))
    .limit(Math.max(1, Math.min(limit, 10)));
  let processed = 0;
  for (const event of events) {
    const [job] = await db
      .select()
      .from(videoJobs)
      .where(eq(videoJobs.providerTaskId, event.taskId))
      .limit(1);
    if (!job) continue;
    try {
      const record = await provider.getTaskRecord(event.taskId);
      if (record.state === 'PROCESSING') {
        await db
          .update(videoJobs)
          .set({ status: 'PROCESSING', updatedAt: new Date() })
          .where(eq(videoJobs.id, job.id));
      } else if (record.state === 'SUCCEEDED') {
        for (const [sequenceNo, sourceUrl] of record.resultUrls.entries()) {
          await transferProviderOutput({
            userId: job.userId,
            jobId: job.id,
            sequenceNo,
            sourceUrl,
          });
        }
        const plan = getVideoSettlementPlan({
          jobStatus: job.status as
            | 'QUEUED'
            | 'DISPATCHING'
            | 'SUBMITTED'
            | 'PROCESSING'
            | 'SUCCEEDED'
            | 'FAILED'
            | 'REVIEW_REQUIRED'
            | 'CANCELLED',
          providerState: record.state,
          privateOutputStored: record.resultUrls.length > 0,
        });
        if (plan.nextStatus !== 'PROCESSING') {
          await settleVideoJob({ jobId: job.id, ...plan });
        }
      } else {
        const plan = getVideoSettlementPlan({
          jobStatus: job.status as
            | 'QUEUED'
            | 'DISPATCHING'
            | 'SUBMITTED'
            | 'PROCESSING'
            | 'SUCCEEDED'
            | 'FAILED'
            | 'REVIEW_REQUIRED'
            | 'CANCELLED',
          providerState: record.state,
          privateOutputStored: false,
        });
        if (plan.nextStatus !== 'PROCESSING') {
          await settleVideoJob({ jobId: job.id, ...plan });
        }
      }
      await db
        .update(videoWebhookInbox)
        .set({ state: 'PROCESSED', processedAt: new Date() })
        .where(
          and(
            eq(videoWebhookInbox.id, event.id),
            eq(videoWebhookInbox.state, 'RECEIVED')
          )
        );
      processed += 1;
    } catch {
      await db
        .update(videoWebhookInbox)
        .set({ state: 'REVIEW_REQUIRED' })
        .where(eq(videoWebhookInbox.id, event.id));
    }
  }
  return { processed, skipped: null };
}

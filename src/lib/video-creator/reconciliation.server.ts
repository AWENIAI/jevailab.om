import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  videoJobs,
  videoOutputs,
  videoWebhookInbox,
} from '@/db/video-creator.schema';
import { serverEnv } from '@/env/server';
import { uploadFile } from '@/storage';
import { getVideoFeatureFlags } from './config.server';
import type { VideoJobStatus } from './contracts';
import { KieVideoProvider, type KieTaskRecord } from './provider';
import { isSafeVideoProviderResultUrl } from './provider-result-url';
import { isKieReconciliationCandidate } from './reconciliation-state';
import { getVideoSettlementPlan } from './settlement';
import { settleVideoJob } from './settlement.server';

type PersistedVideoJob = typeof videoJobs.$inferSelect;

function asVideoJobStatus(value: string): VideoJobStatus {
  if (
    [
      'QUEUED',
      'DISPATCHING',
      'SUBMITTED',
      'PROCESSING',
      'SUCCEEDED',
      'FAILED',
      'REVIEW_REQUIRED',
      'CANCELLED',
    ].includes(value)
  ) {
    return value as VideoJobStatus;
  }
  return 'REVIEW_REQUIRED';
}

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
  const db = getDb();
  const [existingOutput] = await db
    .select({ id: videoOutputs.id })
    .from(videoOutputs)
    .where(
      and(
        eq(videoOutputs.jobId, jobId),
        eq(videoOutputs.sequenceNo, sequenceNo)
      )
    )
    .limit(1);
  if (existingOutput) return;

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
  await db
    .insert(videoOutputs)
    .values({
      id: crypto.randomUUID(),
      jobId,
      sequenceNo,
      storageKey: stored.key,
      mediaType: contentType,
      byteSize: blob.size,
      createdAt: new Date(),
    })
    .onConflictDoNothing();
}

async function reconcilePersistedVideoJob({
  job,
  record,
}: {
  job: PersistedVideoJob;
  record: KieTaskRecord;
}) {
  const db = getDb();
  const now = new Date();
  const providerCreditsConsumed =
    record.creditsConsumed ?? job.providerCreditsConsumed;

  if (record.state === 'PROCESSING') {
    await db
      .update(videoJobs)
      .set({
        status: 'PROCESSING',
        providerCreditsConsumed,
        updatedAt: now,
      })
      .where(eq(videoJobs.id, job.id));
    return;
  }

  if (record.state === 'SUCCEEDED') {
    for (const [sequenceNo, sourceUrl] of record.resultUrls.entries()) {
      await transferProviderOutput({
        userId: job.userId,
        jobId: job.id,
        sequenceNo,
        sourceUrl,
      });
    }
  }

  await db
    .update(videoJobs)
    .set({
      providerCreditsConsumed,
      errorCode:
        record.state === 'FAILED'
          ? (record.failureCode ?? 'KIE_TASK_FAILED')
          : job.errorCode,
      updatedAt: now,
    })
    .where(eq(videoJobs.id, job.id));

  const plan = getVideoSettlementPlan({
    jobStatus: asVideoJobStatus(job.status),
    providerState: record.state,
    privateOutputStored:
      record.state === 'SUCCEEDED' && record.resultUrls.length > 0,
  });
  if (plan.nextStatus !== 'PROCESSING') {
    await settleVideoJob({ jobId: job.id, ...plan });
  }
}

/**
 * Every terminal decision comes from recordInfo, never from the webhook body.
 * A failed lookup or transfer deliberately leaves the held balance intact and
 * moves the job to review rather than retrying a potentially billable request.
 */
async function reconcileProviderTask({
  taskId,
  provider,
}: {
  taskId: string;
  provider: KieVideoProvider;
}) {
  const db = getDb();
  const [job] = await db
    .select()
    .from(videoJobs)
    .where(eq(videoJobs.providerTaskId, taskId))
    .limit(1);
  if (!job) return 'unknown_job' as const;

  try {
    const record = await provider.getTaskRecord(taskId);
    await reconcilePersistedVideoJob({ job, record });
    return 'reconciled' as const;
  } catch {
    await db
      .update(videoJobs)
      .set({
        status: 'REVIEW_REQUIRED',
        errorCode: 'KIE_RECONCILIATION_FAILED',
        updatedAt: new Date(),
      })
      .where(eq(videoJobs.id, job.id));
    return 'review_required' as const;
  }
}

function getEnabledKieProvider() {
  const flags = getVideoFeatureFlags();
  if (
    !flags.enabled ||
    !flags.providerSendEnabled ||
    !flags.liveTestEnabled ||
    !serverEnv.KIE_API_KEY
  ) {
    return null;
  }
  return new KieVideoProvider(
    serverEnv.KIE_API_KEY,
    serverEnv.KIE_API_BASE_URL
  );
}

/** Processes signed callback inbox events quickly and idempotently. */
export async function reconcileVideoWebhookInbox(limit = 10) {
  const provider = getEnabledKieProvider();
  if (!provider) return { processed: 0, skipped: 'disabled' as const };
  const db = getDb();
  const events = await db
    .select()
    .from(videoWebhookInbox)
    .where(eq(videoWebhookInbox.state, 'RECEIVED'))
    .limit(Math.max(1, Math.min(limit, 10)));
  let processed = 0;
  for (const event of events) {
    const result = await reconcileProviderTask({
      taskId: event.taskId,
      provider,
    });
    await db
      .update(videoWebhookInbox)
      .set({
        state: result === 'reconciled' ? 'PROCESSED' : 'REVIEW_REQUIRED',
        processedAt: new Date(),
      })
      .where(
        and(
          eq(videoWebhookInbox.id, event.id),
          eq(videoWebhookInbox.state, 'RECEIVED')
        )
      );
    processed += 1;
  }
  return { processed, skipped: null };
}

/**
 * A signed callback may be delayed or lost. This controlled fallback only
 * polls known, in-flight tasks and can never create another provider task.
 */
export async function reconcileActiveVideoJobs(limit = 3) {
  const provider = getEnabledKieProvider();
  if (!provider) return { processed: 0, skipped: 'disabled' as const };
  const db = getDb();
  const jobs = await db
    .select()
    .from(videoJobs)
    .where(
      and(
        isNotNull(videoJobs.providerTaskId),
        inArray(videoJobs.status, ['SUBMITTED', 'PROCESSING'])
      )
    )
    .limit(Math.max(1, Math.min(limit, 3)));
  let processed = 0;
  for (const job of jobs) {
    const providerTaskId = job.providerTaskId;
    if (
      !providerTaskId ||
      !isKieReconciliationCandidate({
        status: asVideoJobStatus(job.status),
        providerTaskId,
      })
    ) {
      continue;
    }
    await reconcileProviderTask({ taskId: providerTaskId, provider });
    processed += 1;
  }
  return { processed, skipped: null };
}

/** Run callbacks first, then use recordInfo only for remaining in-flight jobs. */
export async function reconcileVideoJobs() {
  const inbox = await reconcileVideoWebhookInbox();
  const active = await reconcileActiveVideoJobs();
  return { inbox, active };
}

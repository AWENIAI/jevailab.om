import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  videoAssets,
  videoDispatchOutbox,
  videoJobs,
  videoTemplates,
} from '@/db/video-creator.schema';
import { serverEnv } from '@/env/server';
import { getVideoFeatureFlags } from './config.server';
import { createPrivateVideoProviderUrl } from './private-media-url.server';
import { KieVideoProvider } from './provider';

export async function dispatchPendingVideoJobs(limit = 3) {
  const flags = getVideoFeatureFlags();
  if (
    !flags.enabled ||
    !flags.providerSendEnabled ||
    !flags.liveTestEnabled ||
    !serverEnv.KIE_API_KEY
  ) {
    return { dispatched: 0, skipped: 'disabled' as const };
  }
  const db = getDb();
  const rows = await db
    .select({
      outboxId: videoDispatchOutbox.id,
      jobId: videoJobs.id,
      model: videoJobs.model,
      resolution: videoJobs.resolution,
      outputSeconds: videoJobs.outputSeconds,
      templateKey: videoTemplates.storageKey,
      aspectRatio: videoTemplates.aspectRatio,
      seedancePrompt: videoTemplates.seedancePrompt,
      assetKey: videoAssets.storageKey,
    })
    .from(videoDispatchOutbox)
    .innerJoin(videoJobs, eq(videoJobs.id, videoDispatchOutbox.jobId))
    .innerJoin(videoTemplates, eq(videoTemplates.id, videoJobs.templateId))
    .innerJoin(videoAssets, eq(videoAssets.id, videoJobs.assetId))
    .where(eq(videoDispatchOutbox.state, 'PENDING'))
    .limit(Math.max(1, Math.min(limit, 3)));

  const provider = new KieVideoProvider(
    serverEnv.KIE_API_KEY,
    serverEnv.KIE_API_BASE_URL
  );
  let dispatched = 0;
  for (const row of rows) {
    const now = new Date();
    const claimed = await db
      .update(videoDispatchOutbox)
      .set({
        state: 'SENDING',
        attemptNo: 1,
        sendStartedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(videoDispatchOutbox.id, row.outboxId),
          eq(videoDispatchOutbox.state, 'PENDING')
        )
      )
      .returning({ id: videoDispatchOutbox.id });
    if (!claimed[0]) continue;
    await db
      .update(videoJobs)
      .set({ status: 'DISPATCHING', updatedAt: now })
      .where(eq(videoJobs.id, row.jobId));
    try {
      const [templateUrl, imageUrl] = await Promise.all([
        createPrivateVideoProviderUrl(row.templateKey),
        createPrivateVideoProviderUrl(row.assetKey),
      ]);
      const created = await provider.createTask({
        callbackUrl: `${serverEnv.VITE_BASE_URL.replace(/\/$/, '')}/api/webhooks/kie`,
        model: row.model as
          | 'bytedance/seedance-2-mini'
          | 'wan/2-2-animate-replace',
        resolution: row.resolution as '480p' | '580p' | '720p',
        templateUrl,
        imageUrl,
        aspectRatio: row.aspectRatio,
        durationSeconds: row.outputSeconds,
        seedancePrompt: row.seedancePrompt,
      });
      await db.batch([
        db
          .update(videoJobs)
          .set({
            status: 'SUBMITTED',
            providerTaskId: created.taskId,
            updatedAt: new Date(),
          })
          .where(eq(videoJobs.id, row.jobId)),
        db
          .update(videoDispatchOutbox)
          .set({ state: 'SENT', updatedAt: new Date() })
          .where(eq(videoDispatchOutbox.id, row.outboxId)),
      ]);
      dispatched += 1;
    } catch {
      // The upstream may have accepted the request even when the response was
      // lost. Keep the hold and require manual provider reconciliation.
      await db.batch([
        db
          .update(videoJobs)
          .set({
            status: 'REVIEW_REQUIRED',
            errorCode: 'PROVIDER_SEND_UNKNOWN',
            updatedAt: new Date(),
          })
          .where(eq(videoJobs.id, row.jobId)),
        db
          .update(videoDispatchOutbox)
          .set({
            state: 'UNKNOWN',
            lastError: 'PROVIDER_SEND_UNKNOWN',
            updatedAt: new Date(),
          })
          .where(eq(videoDispatchOutbox.id, row.outboxId)),
      ]);
    }
  }
  return { dispatched, skipped: null };
}

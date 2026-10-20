import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { imageAssets, imageGenerationJobs } from '@/db/image-creator.schema';
import { imageDispatchOutbox } from '@/db/miniprogram.schema';
import { serverEnv } from '@/env/server';
import {
  ModerationRejectedError,
  ModerationReviewRequiredError,
  ModerationUnavailableError,
  assertPromptApproved,
} from '@/lib/image-creator/moderation.server';
import { MiniProgramApiError } from './responses.server';
import { createPrivateFalImageProviderUrl } from './private-media-url.server';
import { submitFalImageRequest } from './image-provider.server';
import { settleImageGenerationCredits } from './wallet.server';

type Snapshot = {
  prompt: string;
  templateId: string | null;
  mode: '1K_SD' | '2K_HD';
  ratio: string;
  count: number;
  referenceAssetId: string | null;
};

function parseSnapshot(value: string): Snapshot {
  const parsed = JSON.parse(value) as Partial<Snapshot>;
  if (
    typeof parsed.prompt !== 'string' ||
    (parsed.mode !== '1K_SD' && parsed.mode !== '2K_HD') ||
    typeof parsed.ratio !== 'string' ||
    typeof parsed.count !== 'number'
  ) {
    throw new Error('Invalid image job snapshot.');
  }
  return {
    prompt: parsed.prompt,
    templateId:
      typeof parsed.templateId === 'string' ? parsed.templateId : null,
    mode: parsed.mode,
    ratio: parsed.ratio,
    count: parsed.count,
    referenceAssetId:
      typeof parsed.referenceAssetId === 'string'
        ? parsed.referenceAssetId
        : null,
  };
}

export async function dispatchPendingImageJobs(limit = 3) {
  if (!serverEnv.FAL_KEY) {
    return { dispatched: 0, skipped: 'fal_disabled' as const };
  }
  const db = getDb();
  const now = new Date();
  const staleSending = await db
    .select({
      outboxId: imageDispatchOutbox.id,
      jobId: imageGenerationJobs.id,
    })
    .from(imageDispatchOutbox)
    .innerJoin(
      imageGenerationJobs,
      eq(imageGenerationJobs.id, imageDispatchOutbox.jobId)
    )
    .where(
      and(
        eq(imageGenerationJobs.status, 'running'),
        eq(imageDispatchOutbox.state, 'SENDING'),
        or(
          lte(imageDispatchOutbox.leaseUntil, now),
          isNull(imageDispatchOutbox.leaseUntil)
        )
      )
    )
    .limit(Math.max(1, Math.min(limit, 3)));
  for (const row of staleSending) {
    await db.batch([
      db
        .update(imageGenerationJobs)
        .set({
          status: 'reconciling',
          errorCode: 'PROVIDER_SEND_UNKNOWN',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(imageGenerationJobs.id, row.jobId),
            eq(imageGenerationJobs.status, 'running')
          )
        ),
      db
        .update(imageDispatchOutbox)
        .set({
          state: 'UNKNOWN',
          lastError: 'PROVIDER_SEND_UNKNOWN',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(imageDispatchOutbox.id, row.outboxId),
            eq(imageDispatchOutbox.state, 'SENDING')
          )
        ),
    ]);
  }

  const rows = await db
    .select({
      outboxId: imageDispatchOutbox.id,
      jobId: imageGenerationJobs.id,
      userId: imageGenerationJobs.userId,
      snapshot: imageGenerationJobs.internalRequestSnapshot,
      referenceAssetId: imageGenerationJobs.referenceAssetId,
    })
    .from(imageDispatchOutbox)
    .innerJoin(
      imageGenerationJobs,
      eq(imageGenerationJobs.id, imageDispatchOutbox.jobId)
    )
    .where(
      and(
        eq(imageGenerationJobs.status, 'queued'),
        eq(imageDispatchOutbox.state, 'PENDING')
      )
    )
    .limit(Math.max(1, Math.min(limit, 3)));

  let dispatched = 0;
  for (const row of rows) {
    const claimTime = new Date();
    const leaseUntil = new Date(claimTime.getTime() + 2 * 60_000);
    const claimed = await db
      .update(imageDispatchOutbox)
      .set({
        state: 'SENDING',
        attemptNo: sql`${imageDispatchOutbox.attemptNo} + 1`,
        sendStartedAt: claimTime,
        leaseUntil,
        updatedAt: claimTime,
      })
      .where(
        and(
          eq(imageDispatchOutbox.id, row.outboxId),
          eq(imageDispatchOutbox.state, 'PENDING')
        )
      )
      .returning({ id: imageDispatchOutbox.id });
    if (!claimed[0]) continue;

    await db
      .update(imageGenerationJobs)
      .set({ status: 'running', updatedAt: claimTime })
      .where(eq(imageGenerationJobs.id, row.jobId));

    try {
      const snapshot = parseSnapshot(row.snapshot);
      try {
        await assertPromptApproved(snapshot.prompt);
      } catch (error) {
        if (error instanceof ModerationRejectedError) {
          throw new MiniProgramApiError('MODERATION_REJECTED', error.message);
        }
        if (error instanceof ModerationUnavailableError) {
          throw new MiniProgramApiError(
            'MODERATION_UNAVAILABLE',
            error.message
          );
        }
        if (error instanceof ModerationReviewRequiredError) {
          throw new MiniProgramApiError(
            'MODERATION_REVIEW_REQUIRED',
            error.message
          );
        }
        throw new MiniProgramApiError(
          'MODERATION_UNAVAILABLE',
          error instanceof Error ? error.message : undefined
        );
      }
      let referenceImageUrl: string | undefined;
      if (snapshot.referenceAssetId) {
        const [asset] = await db
          .select({ storageKey: imageAssets.storageKey })
          .from(imageAssets)
          .where(
            and(
              eq(imageAssets.id, snapshot.referenceAssetId),
              eq(imageAssets.userId, row.userId),
              eq(imageAssets.state, 'ready')
            )
          )
          .limit(1);
        if (!asset) {
          throw new MiniProgramApiError('REFERENCE_UNAVAILABLE');
        }
        referenceImageUrl = await createPrivateFalImageProviderUrl(
          asset.storageKey
        );
      }
      const submitted = await submitFalImageRequest({
        prompt: snapshot.prompt,
        mode: snapshot.mode,
        ratio: snapshot.ratio,
        count: snapshot.count,
        referenceImageUrl,
      });
      const nextSnapshot = {
        ...snapshot,
        provider: {
          requestId: submitted.requestId,
          statusUrl: submitted.statusUrl,
          responseUrl: submitted.responseUrl,
        },
      };
      await db.batch([
        db
          .update(imageGenerationJobs)
          .set({
            status: 'running',
            providerRequestId: submitted.requestId,
            internalRequestSnapshot: JSON.stringify(nextSnapshot),
            updatedAt: new Date(),
          })
          .where(eq(imageGenerationJobs.id, row.jobId)),
        db
          .update(imageDispatchOutbox)
          .set({
            state: 'SENT',
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(imageDispatchOutbox.id, row.outboxId)),
      ]);
      dispatched += 1;
    } catch (error) {
      if (
        error instanceof MiniProgramApiError &&
        (error.code === 'MODERATION_REJECTED' ||
          error.code === 'MODERATION_UNAVAILABLE' ||
          error.code === 'MODERATION_REVIEW_REQUIRED' ||
          error.code === 'REFERENCE_UNAVAILABLE')
      ) {
        const [job] = await db
          .select({
            userId: imageGenerationJobs.userId,
            reservedCredits: imageGenerationJobs.reservedCredits,
          })
          .from(imageGenerationJobs)
          .where(eq(imageGenerationJobs.id, row.jobId))
          .limit(1);
        if (job) {
          await settleImageGenerationCredits({
            userId: job.userId,
            jobId: row.jobId,
            reservedCredits: job.reservedCredits,
            chargedCredits: 0,
            deliveredCount: 0,
            nextStatus:
              error.code === 'MODERATION_REJECTED' ? 'rejected' : 'failed',
            reason: error.code.toLowerCase(),
            errorCode: error.code,
          });
        }
        await db
          .update(imageDispatchOutbox)
          .set({
            state: 'FAILED',
            lastError: error.code,
            updatedAt: new Date(),
          })
          .where(eq(imageDispatchOutbox.id, row.outboxId));
        continue;
      }
      await db.batch([
        db
          .update(imageGenerationJobs)
          .set({
            status: 'reconciling',
            errorCode: 'PROVIDER_SEND_UNKNOWN',
            updatedAt: new Date(),
          })
          .where(eq(imageGenerationJobs.id, row.jobId)),
        db
          .update(imageDispatchOutbox)
          .set({
            state: 'UNKNOWN',
            lastError: 'PROVIDER_SEND_UNKNOWN',
            updatedAt: new Date(),
          })
          .where(eq(imageDispatchOutbox.id, row.outboxId)),
      ]);
    }
  }
  return { dispatched, skipped: null };
}

import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  videoCreditAccounts,
  videoCreditLedger,
  videoJobs,
} from '@/db/video-creator.schema';

export async function settleVideoJob({
  jobId,
  nextStatus,
  ledgerEvent,
}: {
  jobId: string;
  nextStatus: 'SUCCEEDED' | 'FAILED' | 'REVIEW_REQUIRED';
  ledgerEvent: 'CAPTURE' | 'RELEASE' | 'NONE';
}) {
  const db = getDb();
  const [job] = await db
    .select()
    .from(videoJobs)
    .where(and(eq(videoJobs.id, jobId), isNull(videoJobs.settledAt)))
    .limit(1);
  if (!job) return false;
  const now = new Date();
  if (ledgerEvent === 'NONE') {
    await db
      .update(videoJobs)
      .set({ status: nextStatus, updatedAt: now })
      .where(and(eq(videoJobs.id, jobId), isNull(videoJobs.settledAt)));
    return true;
  }

  const isCapture = ledgerEvent === 'CAPTURE';
  const accountUpdate = isCapture
    ? db
        .update(videoCreditAccounts)
        .set({
          heldUnits: sql`${videoCreditAccounts.heldUnits} - ${job.heldUnits}`,
          version: sql`${videoCreditAccounts.version} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(videoCreditAccounts.userId, job.userId),
            sql`${videoCreditAccounts.heldUnits} >= ${job.heldUnits}`
          )
        )
    : db
        .update(videoCreditAccounts)
        .set({
          paidAvailableUnits: sql`${videoCreditAccounts.paidAvailableUnits} + ${job.heldUnits}`,
          heldUnits: sql`${videoCreditAccounts.heldUnits} - ${job.heldUnits}`,
          version: sql`${videoCreditAccounts.version} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(videoCreditAccounts.userId, job.userId),
            sql`${videoCreditAccounts.heldUnits} >= ${job.heldUnits}`
          )
        );
  const [account] = await db
    .select()
    .from(videoCreditAccounts)
    .where(eq(videoCreditAccounts.userId, job.userId))
    .limit(1);
  if (!account || account.heldUnits < job.heldUnits) {
    await db
      .update(videoJobs)
      .set({
        status: 'REVIEW_REQUIRED',
        errorCode: 'ACCOUNT_HOLD_MISMATCH',
        updatedAt: now,
      })
      .where(eq(videoJobs.id, jobId));
    return false;
  }
  await accountUpdate;
  const paidAfter = isCapture
    ? account.paidAvailableUnits
    : account.paidAvailableUnits + job.heldUnits;
  const heldAfter = account.heldUnits - job.heldUnits;
  await db.batch([
    db
      .update(videoJobs)
      .set({
        status: nextStatus,
        capturedUnits: isCapture ? job.heldUnits : 0,
        releasedUnits: isCapture ? 0 : job.heldUnits,
        settledAt: now,
        updatedAt: now,
      })
      .where(and(eq(videoJobs.id, jobId), isNull(videoJobs.settledAt))),
    db
      .insert(videoCreditLedger)
      .values({
        id: crypto.randomUUID(),
        eventKey: `${ledgerEvent.toLowerCase()}:${jobId}`,
        userId: job.userId,
        jobId,
        eventType: ledgerEvent,
        paidAvailableDelta: isCapture ? 0 : job.heldUnits,
        heldDelta: -job.heldUnits,
        paidAvailableAfter: paidAfter,
        heldAfter,
        reason: `provider-${nextStatus.toLowerCase()}`,
        createdAt: now,
      })
      .onConflictDoNothing(),
  ]);
  return true;
}

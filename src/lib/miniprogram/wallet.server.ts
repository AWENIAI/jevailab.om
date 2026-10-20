import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  imageCreditLedger,
  imageGenerationJobs,
  imageWallets,
} from '@/db/image-creator.schema';
import { MiniProgramApiError } from './responses.server';

export async function ensureImageWallet(userId: string) {
  const db = getDb();
  const now = new Date();
  const createdWallet = await db
    .insert(imageWallets)
    .values({
      userId,
      availableCredits: 120,
      reservedCredits: 0,
      version: 0,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning({ userId: imageWallets.userId });
  if (createdWallet[0]) {
    await db
      .insert(imageCreditLedger)
      .values({
        id: crypto.randomUUID(),
        eventKey: `welcome:${userId}`,
        userId,
        eventType: 'GRANT',
        availableDelta: 120,
        reservedDelta: 0,
        availableAfter: 120,
        reservedAfter: 0,
        reason: '新用户创作额度',
        createdAt: now,
      })
      .onConflictDoNothing();
  }
  const [wallet] = await db
    .select()
    .from(imageWallets)
    .where(eq(imageWallets.userId, userId))
    .limit(1);
  if (!wallet) throw new MiniProgramApiError('INTERNAL_ERROR');
  return wallet;
}

export function getOrCreateImageWallet(userId: string) {
  return ensureImageWallet(userId);
}

export async function getWalletSummary(userId: string) {
  const wallet = await getOrCreateImageWallet(userId);
  return {
    availableCredits: wallet.availableCredits,
    reservedCredits: wallet.reservedCredits,
  };
}

export async function listWalletLedger(userId: string, limit = 100) {
  const rows = await getDb()
    .select({
      id: imageCreditLedger.id,
      eventType: imageCreditLedger.eventType,
      availableDelta: imageCreditLedger.availableDelta,
      reservedDelta: imageCreditLedger.reservedDelta,
      availableAfter: imageCreditLedger.availableAfter,
      reservedAfter: imageCreditLedger.reservedAfter,
      reason: imageCreditLedger.reason,
      jobId: imageCreditLedger.jobId,
      createdAt: imageCreditLedger.createdAt,
    })
    .from(imageCreditLedger)
    .where(eq(imageCreditLedger.userId, userId))
    .orderBy(desc(imageCreditLedger.createdAt))
    .limit(Math.max(1, Math.min(limit, 200)));
  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.eventType.toLowerCase(),
      amount: row.availableDelta,
      reason: row.reason ?? row.eventType,
      jobId: row.jobId,
      availableAfter: row.availableAfter,
      reservedAfter: row.reservedAfter,
      createdAt: row.createdAt.getTime(),
    })),
  };
}

export async function reserveGenerationCredits({
  userId,
  credits,
}: {
  userId: string;
  credits: number;
}) {
  const db = getDb();
  const wallet = await getOrCreateImageWallet(userId);
  if (wallet.availableCredits < credits) {
    throw new MiniProgramApiError('INSUFFICIENT_CREDITS');
  }
  const now = new Date();
  const updated = await db
    .update(imageWallets)
    .set({
      availableCredits: sql`${imageWallets.availableCredits} - ${credits}`,
      reservedCredits: sql`${imageWallets.reservedCredits} + ${credits}`,
      version: sql`${imageWallets.version} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(imageWallets.userId, userId),
        eq(imageWallets.version, wallet.version),
        gte(imageWallets.availableCredits, credits)
      )
    )
    .returning({
      availableCredits: imageWallets.availableCredits,
      reservedCredits: imageWallets.reservedCredits,
    });
  const account = updated[0];
  if (!account) {
    throw new MiniProgramApiError(
      'CONFLICT',
      '创作额度发生变化，请重新获取报价'
    );
  }
  return account;
}

/**
 * Reverses a reservation when the job transaction could not be committed.
 * The guard makes a retry harmless if another request already restored it.
 */
export async function releaseGenerationReservation({
  userId,
  credits,
}: {
  userId: string;
  credits: number;
}) {
  const now = new Date();
  await getDb()
    .update(imageWallets)
    .set({
      availableCredits: sql`${imageWallets.availableCredits} + ${credits}`,
      reservedCredits: sql`${imageWallets.reservedCredits} - ${credits}`,
      version: sql`${imageWallets.version} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(imageWallets.userId, userId),
        gte(imageWallets.reservedCredits, credits)
      )
    );
}

export async function grantImageCredits({
  userId,
  credits,
  eventKey,
  reason,
}: {
  userId: string;
  credits: number;
  eventKey: string;
  reason: string;
}) {
  const db = getDb();
  const [existingEvent] = await db
    .select({ id: imageCreditLedger.id })
    .from(imageCreditLedger)
    .where(eq(imageCreditLedger.eventKey, eventKey))
    .limit(1);
  if (existingEvent) {
    return {
      credited: false,
      wallet: await getOrCreateImageWallet(userId),
    };
  }
  const wallet = await getOrCreateImageWallet(userId);
  const now = new Date();
  const results = await db.batch([
    db
      .update(imageWallets)
      .set({
        availableCredits: sql`${imageWallets.availableCredits} + ${credits}`,
        version: sql`${imageWallets.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(imageWallets.userId, userId),
          eq(imageWallets.version, wallet.version)
        )
      )
      .returning({
        availableCredits: imageWallets.availableCredits,
        reservedCredits: imageWallets.reservedCredits,
      }),
    db
      .insert(imageCreditLedger)
      .values({
        id: crypto.randomUUID(),
        eventKey,
        userId,
        eventType: 'GRANT',
        availableDelta: credits,
        reservedDelta: 0,
        availableAfter: sql`(SELECT ${imageWallets.availableCredits} FROM ${imageWallets} WHERE ${imageWallets.userId} = ${userId})`,
        reservedAfter: sql`(SELECT ${imageWallets.reservedCredits} FROM ${imageWallets} WHERE ${imageWallets.userId} = ${userId})`,
        reason,
        createdAt: now,
      })
      .onConflictDoNothing(),
  ]);
  const account = results[0][0];
  if (!account) {
    const [existing] = await db
      .select({ id: imageCreditLedger.id })
      .from(imageCreditLedger)
      .where(eq(imageCreditLedger.eventKey, eventKey))
      .limit(1);
    if (existing) {
      return {
        credited: false,
        wallet: await getOrCreateImageWallet(userId),
      };
    }
    throw new MiniProgramApiError('CONFLICT', '额度到账发生冲突，请重试');
  }
  return {
    credited: true,
    wallet: {
      ...wallet,
      ...account,
    },
  };
}

export async function settleImageGenerationCredits({
  userId,
  jobId,
  reservedCredits,
  chargedCredits,
  deliveredCount: requestedDeliveredCount,
  nextStatus,
  reason,
  errorCode,
}: {
  userId: string;
  jobId: string;
  reservedCredits: number;
  chargedCredits: number;
  deliveredCount?: number;
  nextStatus: 'completed' | 'partial' | 'failed' | 'rejected';
  reason: string;
  errorCode?: string | null;
}) {
  const db = getDb();
  await getOrCreateImageWallet(userId);
  const releasedCredits = reservedCredits - chargedCredits;
  const deliveredCount = requestedDeliveredCount ?? chargedCredits;
  const now = new Date();
  const results = await db.batch([
    db
      .update(imageWallets)
      .set({
        availableCredits: sql`${imageWallets.availableCredits} + ${releasedCredits}`,
        reservedCredits: sql`${imageWallets.reservedCredits} - ${reservedCredits}`,
        version: sql`${imageWallets.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(imageWallets.userId, userId),
          gte(imageWallets.reservedCredits, reservedCredits),
          sql`EXISTS (SELECT 1 FROM ${imageGenerationJobs} WHERE ${imageGenerationJobs.id} = ${jobId} AND ${imageGenerationJobs.userId} = ${userId} AND ${imageGenerationJobs.settledAt} IS NULL)`
        )
      )
      .returning({
        availableCredits: imageWallets.availableCredits,
        reservedCredits: imageWallets.reservedCredits,
      }),
    db
      .update(imageGenerationJobs)
      .set({
        status: nextStatus,
        deliveredCount,
        chargedCredits,
        releasedCredits,
        errorCode:
          nextStatus === 'failed' || nextStatus === 'rejected'
            ? (errorCode ?? reason)
            : null,
        settledAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(imageGenerationJobs.id, jobId),
          eq(imageGenerationJobs.userId, userId),
          isNull(imageGenerationJobs.settledAt)
        )
      )
      .returning({ id: imageGenerationJobs.id }),
    db
      .insert(imageCreditLedger)
      .values({
        id: crypto.randomUUID(),
        eventKey: `settle:${jobId}`,
        userId,
        jobId,
        eventType: chargedCredits > 0 ? 'CAPTURE' : 'RELEASE',
        availableDelta: releasedCredits,
        reservedDelta: -reservedCredits,
        availableAfter: sql`(SELECT ${imageWallets.availableCredits} FROM ${imageWallets} WHERE ${imageWallets.userId} = ${userId})`,
        reservedAfter: sql`(SELECT ${imageWallets.reservedCredits} FROM ${imageWallets} WHERE ${imageWallets.userId} = ${userId})`,
        reason,
        createdAt: now,
      })
      .onConflictDoNothing(),
  ]);
  const account = results[0][0];
  if (!account || results[1].length === 0) return null;
  return account;
}

import { createClient } from '@libsql/client';
import { and, eq, gte, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { describe, expect, test } from 'vitest';
import {
  imageCreditLedger,
  imageGenerationJobs,
  imageWallets,
} from '@/db/image-creator.schema';

const MIGRATION_SQL = [
  `CREATE TABLE image_wallets (
    user_id text PRIMARY KEY NOT NULL,
    available_credits integer DEFAULT 0 NOT NULL,
    reserved_credits integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 0 NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE image_generation_jobs (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    quote_id text NOT NULL,
    idempotency_key text NOT NULL,
    params_hash text NOT NULL,
    template_id text,
    template_revision integer,
    reference_asset_id text,
    mode text NOT NULL,
    ratio text NOT NULL,
    resolved_ratio text NOT NULL,
    requested_count integer NOT NULL,
    delivered_count integer DEFAULT 0 NOT NULL,
    unit_credits integer NOT NULL,
    reserved_credits integer NOT NULL,
    charged_credits integer DEFAULT 0 NOT NULL,
    released_credits integer DEFAULT 0 NOT NULL,
    price_version text NOT NULL,
    status text NOT NULL,
    internal_request_snapshot text NOT NULL,
    user_prompt_snapshot text NOT NULL,
    policy_version text NOT NULL,
    consent_accepted_at integer NOT NULL,
    provider_request_id text,
    error_code text,
    settled_at integer,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
    ,deleted_at integer
  )`,
  `CREATE TABLE image_credit_ledger (
    id text PRIMARY KEY NOT NULL,
    event_key text NOT NULL UNIQUE,
    user_id text NOT NULL,
    job_id text,
    event_type text NOT NULL,
    available_delta integer DEFAULT 0 NOT NULL,
    reserved_delta integer DEFAULT 0 NOT NULL,
    available_after integer NOT NULL,
    reserved_after integer NOT NULL,
    reason text,
    created_at integer NOT NULL
  )`,
];

async function createTestDb() {
  const client = createClient({ url: ':memory:' });
  for (const statement of MIGRATION_SQL) {
    await client.execute(statement);
  }
  return drizzle(client);
}

describe('mini program wallet SQL', () => {
  test('records wallet balances with portable scalar subqueries', async () => {
    const db = await createTestDb();
    const now = new Date();
    await db.insert(imageWallets).values({
      userId: 'user-1',
      availableCredits: 120,
      reservedCredits: 0,
      version: 0,
      updatedAt: now,
    });
    await db.batch([
      db
        .update(imageWallets)
        .set({
          availableCredits: sql`${imageWallets.availableCredits} + 60`,
          version: sql`${imageWallets.version} + 1`,
          updatedAt: now,
        })
        .where(eq(imageWallets.userId, 'user-1')),
      db.insert(imageCreditLedger).values({
        id: 'ledger-1',
        eventKey: 'pay:order-1',
        userId: 'user-1',
        eventType: 'GRANT',
        availableDelta: 60,
        reservedDelta: 0,
        availableAfter: sql`(SELECT ${imageWallets.availableCredits} FROM ${imageWallets} WHERE ${imageWallets.userId} = 'user-1')`,
        reservedAfter: sql`(SELECT ${imageWallets.reservedCredits} FROM ${imageWallets} WHERE ${imageWallets.userId} = 'user-1')`,
        reason: 'test grant',
        createdAt: now,
      }),
    ]);

    const [ledger] = await db.select().from(imageCreditLedger);
    expect(ledger).toMatchObject({
      availableAfter: 180,
      reservedAfter: 0,
    });
  });

  test('settles a job once and stores the delivered image count', async () => {
    const db = await createTestDb();
    const now = new Date();
    await db.insert(imageWallets).values({
      userId: 'user-2',
      availableCredits: 100,
      reservedCredits: 10,
      version: 1,
      updatedAt: now,
    });
    await db.insert(imageGenerationJobs).values({
      id: 'job-1',
      userId: 'user-2',
      quoteId: 'quote-1',
      idempotencyKey: 'idem-1',
      paramsHash: 'hash',
      mode: '1K_SD',
      ratio: '3:4',
      resolvedRatio: '3:4',
      requestedCount: 2,
      reservedCredits: 10,
      unitCredits: 3,
      priceVersion: 'test',
      status: 'running',
      internalRequestSnapshot: '{}',
      userPromptSnapshot: '',
      policyVersion: 'test',
      consentAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const settle = () =>
      db.batch([
        db
          .update(imageWallets)
          .set({
            availableCredits: sql`${imageWallets.availableCredits} + 4`,
            reservedCredits: sql`${imageWallets.reservedCredits} - 10`,
            version: sql`${imageWallets.version} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(imageWallets.userId, 'user-2'),
              gte(imageWallets.reservedCredits, 10),
              sql`EXISTS (SELECT 1 FROM ${imageGenerationJobs} WHERE ${imageGenerationJobs.id} = 'job-1' AND ${imageGenerationJobs.userId} = 'user-2' AND ${imageGenerationJobs.settledAt} IS NULL)`
            )
          )
          .returning({
            availableCredits: imageWallets.availableCredits,
            reservedCredits: imageWallets.reservedCredits,
          }),
        db
          .update(imageGenerationJobs)
          .set({
            status: 'partial',
            deliveredCount: 2,
            chargedCredits: 6,
            releasedCredits: 4,
            settledAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(imageGenerationJobs.id, 'job-1'),
              eq(imageGenerationJobs.userId, 'user-2'),
              isNull(imageGenerationJobs.settledAt)
            )
          )
          .returning({ id: imageGenerationJobs.id }),
        db
          .insert(imageCreditLedger)
          .values({
            id: 'ledger-settle-1',
            eventKey: 'settle:job-1',
            userId: 'user-2',
            jobId: 'job-1',
            eventType: 'CAPTURE',
            availableDelta: 4,
            reservedDelta: -10,
            availableAfter: sql`(SELECT ${imageWallets.availableCredits} FROM ${imageWallets} WHERE ${imageWallets.userId} = 'user-2')`,
            reservedAfter: sql`(SELECT ${imageWallets.reservedCredits} FROM ${imageWallets} WHERE ${imageWallets.userId} = 'user-2')`,
            reason: 'test settle',
            createdAt: now,
          })
          .onConflictDoNothing(),
      ]);

    await settle();
    const second = await settle();

    expect(second[0]).toHaveLength(0);
    expect(second[1]).toHaveLength(0);
    const [job] = await db.select().from(imageGenerationJobs);
    const [wallet] = await db.select().from(imageWallets);
    const ledger = await db.select().from(imageCreditLedger);
    expect(job).toMatchObject({
      status: 'partial',
      deliveredCount: 2,
      chargedCredits: 6,
      releasedCredits: 4,
    });
    expect(wallet).toMatchObject({
      availableCredits: 104,
      reservedCredits: 0,
    });
    expect(ledger).toHaveLength(1);
  });
});

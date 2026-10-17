import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, test } from 'vitest';

const migration = readFileSync(
  new URL('../../../src/db/migrations/0007_video_creator.sql', import.meta.url),
  'utf8'
);
const client = createClient({ url: ':memory:' });

describe('video creator migration', () => {
  afterAll(() => client.close());

  test('creates an isolated zero-balance paid video account', async () => {
    await client.executeMultiple(`
      CREATE TABLE user (id TEXT PRIMARY KEY NOT NULL);
      INSERT INTO user (id) VALUES ('user_a');
      ${migration}
      INSERT INTO video_credit_accounts (user_id, updated_at)
      VALUES ('user_a', 100);
    `);

    const account = await client.execute(
      'SELECT paid_available_units, held_units, promo_available_units FROM video_credit_accounts WHERE user_id = ?',
      ['user_a']
    );
    expect(account.rows).toEqual([
      {
        paid_available_units: 0,
        held_units: 0,
        promo_available_units: 0,
      },
    ]);
  });

  test('enforces idempotency and inbound event uniqueness', async () => {
    await client.executeMultiple(`
      INSERT INTO video_templates (
        id, name, version, storage_key, duration_seconds, aspect_ratio,
        enabled, authorization_status, created_at, updated_at
      ) VALUES ('template_a', 'Authorized template', 1, 'templates/a.mp4', 8, '9:16', 1, 'approved', 1, 1);
      INSERT INTO video_quotes (
        id, user_id, template_id, template_version, model, resolution,
        input_seconds, output_seconds, price_version, quoted_units,
        expires_at, created_at
      ) VALUES ('quote_a', 'user_a', 'template_a', 1, 'wan/2-2-animate-replace', '480p', 8, 8, 'test', 480, 999, 1);
      INSERT INTO video_assets (
        id, user_id, storage_key, source_filename, media_type, byte_size,
        state, authorization_accepted_at, created_at
      ) VALUES ('asset_a', 'user_a', 'video-assets/user_a/a.png', 'a.png', 'image/png', 100, 'READY', 1, 1);
      INSERT INTO video_assets (
        id, user_id, storage_key, source_filename, media_type, byte_size,
        state, authorization_accepted_at, created_at
      ) VALUES ('asset_b', 'user_a', 'video-assets/user_a/b.png', 'b.png', 'image/png', 100, 'READY', 1, 1);
      INSERT INTO video_jobs (
        id, user_id, quote_id, idempotency_key, asset_id, template_id,
        template_version, model, resolution, input_seconds, output_seconds,
        price_version, quoted_units, held_units, status, authorization_accepted_at,
        created_at, updated_at
      ) VALUES ('job_a', 'user_a', 'quote_a', 'same-key', 'asset_a', 'template_a', 1,
        'wan/2-2-animate-replace', '480p', 8, 8, 'test', 480, 480, 'QUEUED', 1, 1, 1);
    `);

    await expect(
      client.execute(`
        INSERT INTO video_jobs (
          id, user_id, quote_id, idempotency_key, asset_id, template_id,
          template_version, model, resolution, input_seconds, output_seconds,
          price_version, quoted_units, held_units, status, authorization_accepted_at,
          created_at, updated_at
        ) VALUES ('job_b', 'user_a', 'quote_a', 'different-key', 'asset_b', 'template_a', 1,
          'wan/2-2-animate-replace', '480p', 8, 8, 'test', 480, 480, 'QUEUED', 1, 1, 1);
      `)
    ).rejects.toThrow(/UNIQUE constraint failed/);

    await client.execute(`
      INSERT INTO video_webhook_inbox (
        id, provider, task_id, event_key, received_at, state
      ) VALUES ('inbox_a', 'kie', 'task_a', 'digest_a', 1, 'RECEIVED');
    `);
    await expect(
      client.execute(`
        INSERT INTO video_webhook_inbox (
          id, provider, task_id, event_key, received_at, state
        ) VALUES ('inbox_b', 'kie', 'task_a', 'digest_a', 2, 'RECEIVED');
      `)
    ).rejects.toThrow(/UNIQUE constraint failed/);
  });

  test('seeds versioned pricing while keeping Wan 580p disabled', async () => {
    const rows = await client.execute(
      "SELECT model, resolution, enabled FROM provider_pricing WHERE model = 'wan/2-2-animate-replace' ORDER BY resolution"
    );
    expect(rows.rows).toEqual([
      { model: 'wan/2-2-animate-replace', resolution: '480p', enabled: 1 },
      { model: 'wan/2-2-animate-replace', resolution: '580p', enabled: 0 },
      { model: 'wan/2-2-animate-replace', resolution: '720p', enabled: 1 },
    ]);
  });
});

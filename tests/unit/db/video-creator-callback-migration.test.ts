import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, test } from 'vitest';

const initialMigration = readFileSync(
  new URL('../../../src/db/migrations/0007_video_creator.sql', import.meta.url),
  'utf8'
);
const callbackMigration = readFileSync(
  new URL(
    '../../../src/db/migrations/0008_video_creator_kie_callback_audit.sql',
    import.meta.url
  ),
  'utf8'
);
const client = createClient({ url: ':memory:' });

describe('video creator callback audit migration', () => {
  afterAll(() => client.close());

  test('preserves signed callback state and failure details without trusting them for settlement', async () => {
    await client.executeMultiple(`
      CREATE TABLE user (id TEXT PRIMARY KEY NOT NULL);
      ${initialMigration}
      ${callbackMigration}
      INSERT INTO video_webhook_inbox (
        id, provider, task_id, event_key, received_at, state,
        provider_code, provider_state, failure_code, failure_message
      ) VALUES (
        'inbox_callback', 'kie', 'task_1', 'event_1', 1, 'RECEIVED',
        501, 'fail', 'CONTENT_POLICY', 'Rejected upstream'
      );
    `);

    const inbox = await client.execute(
      `SELECT provider_code, provider_state, failure_code, failure_message
       FROM video_webhook_inbox WHERE id = 'inbox_callback'`
    );
    expect(inbox.rows).toEqual([
      {
        provider_code: 501,
        provider_state: 'fail',
        failure_code: 'CONTENT_POLICY',
        failure_message: 'Rejected upstream',
      },
    ]);
  });
});

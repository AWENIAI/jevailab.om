import { describe, expect, test } from 'vitest';

import {
  createKieWebhookSignature,
  verifyKieWebhookSignature,
} from '@/lib/video-creator/security';

describe('Kie webhook signature verification', () => {
  const secret = 'test-hmac-key';
  const taskId = 'task_123';
  const timestampSeconds = 1_700_000_000;

  test('accepts the documented Base64 HMAC-SHA256 signature inside the time window', async () => {
    const signature = await createKieWebhookSignature({
      secret,
      taskId,
      timestampSeconds,
    });

    await expect(
      verifyKieWebhookSignature({
        secret,
        taskId,
        timestampSeconds: String(timestampSeconds),
        signature,
        nowMs: timestampSeconds * 1000 + 299_000,
      })
    ).resolves.toBe(true);
  });

  test('rejects a replay outside the five-minute window even with a valid signature', async () => {
    const signature = await createKieWebhookSignature({
      secret,
      taskId,
      timestampSeconds,
    });

    await expect(
      verifyKieWebhookSignature({
        secret,
        taskId,
        timestampSeconds: String(timestampSeconds),
        signature,
        nowMs: timestampSeconds * 1000 + 301_000,
      })
    ).resolves.toBe(false);
  });
});

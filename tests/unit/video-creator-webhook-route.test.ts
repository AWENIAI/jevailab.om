import { describe, expect, test } from 'vitest';

import { handleKieWebhookRequest } from '@/routes/api/webhooks/kie';

describe('Kie webhook route', () => {
  test('rejects a missing signature without creating a job event', async () => {
    let accepted = 0;
    const response = await handleKieWebhookRequest(
      new Request('https://app.test/api/webhooks/kie', {
        method: 'POST',
        body: JSON.stringify({ data: { taskId: 'task_1' } }),
      }),
      {
        getWebhookKey: () => 'secret',
        verify: async () => true,
        acceptEvent: async () => {
          accepted += 1;
        },
      }
    );
    expect(response.status).toBe(400);
    expect(accepted).toBe(0);
  });

  test('records signed terminal callback details for later authoritative lookup', async () => {
    let accepted:
      | {
          taskId: string;
          eventKey: string;
          providerCode: number | null;
          providerState: string | null;
          failureCode: string | null;
          failureMessage: string | null;
        }
      | undefined;
    const response = await handleKieWebhookRequest(
      new Request('https://app.test/api/webhooks/kie', {
        method: 'POST',
        headers: {
          'x-webhook-timestamp': '1700000000',
          'x-webhook-signature': 'valid-signature',
        },
        body: JSON.stringify({
          code: 501,
          data: {
            taskId: 'task_failed',
            state: 'fail',
            failCode: 'CONTENT_POLICY',
            failMsg: 'Rejected by upstream moderation',
          },
        }),
      }),
      {
        getWebhookKey: () => 'secret',
        verify: async () => true,
        acceptEvent: async (input) => {
          accepted = input;
        },
      }
    );

    expect(response.status).toBe(202);
    expect(accepted).toMatchObject({
      taskId: 'task_failed',
      providerCode: 501,
      providerState: 'fail',
      failureCode: 'CONTENT_POLICY',
      failureMessage: 'Rejected by upstream moderation',
    });
  });
});

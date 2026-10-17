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
});

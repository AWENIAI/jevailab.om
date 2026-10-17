import { createFileRoute } from '@tanstack/react-router';
import { serverEnv } from '@/env/server';
import { logOperationalEvent } from '@/lib/observability';
import { parseKieCallbackHint } from '@/lib/video-creator/provider';
import { verifyKieWebhookSignature } from '@/lib/video-creator/security';

type KieWebhookDependencies = {
  getWebhookKey: () => string | undefined;
  verify: (input: {
    secret: string;
    taskId: string;
    timestampSeconds: string;
    signature: string;
  }) => Promise<boolean>;
  acceptEvent: (input: {
    taskId: string;
    eventKey: string;
    providerCode: number | null;
    providerState: string | null;
    failureCode: string | null;
    failureMessage: string | null;
  }) => Promise<void>;
};

const dependencies: KieWebhookDependencies = {
  getWebhookKey: () => serverEnv.KIE_WEBHOOK_HMAC_KEY,
  verify: verifyKieWebhookSignature,
  acceptEvent: async ({
    taskId,
    eventKey,
    providerCode,
    providerState,
    failureCode,
    failureMessage,
  }) => {
    const [{ getDb }, { videoWebhookInbox }] = await Promise.all([
      import('@/db'),
      import('@/db/video-creator.schema'),
    ]);
    await getDb()
      .insert(videoWebhookInbox)
      .values({
        id: crypto.randomUUID(),
        provider: 'kie',
        taskId,
        eventKey,
        providerCode,
        providerState,
        failureCode,
        failureMessage,
        receivedAt: new Date(),
        state: 'RECEIVED',
      })
      .onConflictDoNothing();
  },
};

function getTaskId(payload: unknown) {
  const data = (payload as { data?: Record<string, unknown> })?.data;
  return typeof data?.taskId === 'string' ? data.taskId : null;
}

export async function handleKieWebhookRequest(
  request: Request,
  injected: KieWebhookDependencies = dependencies
): Promise<Response> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 64 * 1024) {
    return Response.json({ error: 'Payload too large' }, { status: 413 });
  }
  const rawBody = await request.text();
  if (rawBody.length > 64 * 1024) {
    return Response.json({ error: 'Payload too large' }, { status: 413 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const taskId = getTaskId(payload);
  const timestampSeconds = request.headers.get('x-webhook-timestamp') ?? '';
  const signature = request.headers.get('x-webhook-signature') ?? '';
  const secret = injected.getWebhookKey();
  if (!taskId || !timestampSeconds || !signature || !secret) {
    return Response.json(
      { error: 'Missing webhook signature fields' },
      { status: 400 }
    );
  }
  const valid = await injected.verify({
    secret,
    taskId,
    timestampSeconds,
    signature,
  });
  if (!valid) {
    logOperationalEvent.warn('kie webhook rejected', {
      reason: 'invalid_signature',
    });
    return Response.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }
  const callbackHint = parseKieCallbackHint(payload);
  await injected.acceptEvent({
    taskId,
    eventKey: `${taskId}:${timestampSeconds}:${signature}`,
    providerCode: callbackHint?.providerCode ?? null,
    providerState: callbackHint?.providerState ?? null,
    failureCode: callbackHint?.failureCode ?? null,
    failureMessage: callbackHint?.failureMessage ?? null,
  });
  return Response.json({ received: true }, { status: 202 });
}

export const Route = createFileRoute('/api/webhooks/kie')({
  server: {
    handlers: {
      POST: ({ request }) => handleKieWebhookRequest(request),
    },
  },
});

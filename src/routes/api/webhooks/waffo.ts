import { createFileRoute } from '@tanstack/react-router';
import {
  getPaymentProviderName,
  handleWebhookEvent,
  isPaymentEnabled,
} from '@/payment';

/**
 * Waffo Pancake webhook endpoint.
 * Configure one HTTPS endpoint per Waffo environment and subscribe to:
 * order.completed, subscription.*, refund.succeeded, refund.failed.
 */
export const Route = createFileRoute('/api/webhooks/waffo')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isPaymentEnabled()) {
          return Response.json({ received: true }, { status: 200 });
        }
        // handleWebhookEvent dispatches to the configured provider, so a
        // stale endpoint must not be handed to a different provider's parser.
        if (getPaymentProviderName() !== 'waffo') {
          return Response.json(
            { error: 'Waffo is not the active payment provider' },
            { status: 404 }
          );
        }
        const payload = await request.text();
        const signature = request.headers.get('x-waffo-signature') ?? '';
        if (!payload || !signature) {
          console.warn('Waffo webhook: missing payload or signature');
          return Response.json(
            { error: 'Missing payload or signature' },
            { status: 400 }
          );
        }
        try {
          await handleWebhookEvent(payload, signature);
          return Response.json({ received: true }, { status: 200 });
        } catch (err) {
          console.error('Waffo webhook error:', err);
          return Response.json(
            { error: 'Webhook processing failed', received: true },
            { status: 200 }
          );
        }
      },
    },
  },
});

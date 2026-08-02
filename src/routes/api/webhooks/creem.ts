import { createFileRoute } from '@tanstack/react-router';
import {
  getPaymentProviderName,
  handleWebhookEvent,
  isPaymentEnabled,
} from '@/payment';

/**
 * Creem webhook endpoint
 * Configure in Creem Dashboard: Settings -> Webhooks -> Add endpoint
 * Endpoint URL: https://your-domain.com/api/webhooks/creem
 * Events: checkout.completed, subscription.paid, subscription.canceled,
 *         subscription.expired, subscription.trialing, subscription.paused
 */
export const Route = createFileRoute('/api/webhooks/creem')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isPaymentEnabled()) {
          return Response.json({ received: true }, { status: 200 });
        }
        // handleWebhookEvent dispatches to the configured provider, so a
        // stale endpoint must not be handed to a different provider's parser.
        if (getPaymentProviderName() !== 'creem') {
          return Response.json(
            { error: 'Creem is not the active payment provider' },
            { status: 404 }
          );
        }
        const payload = await request.text();
        const signature = request.headers.get('creem-signature') ?? '';
        if (!payload || !signature) {
          console.warn('Creem webhook: missing payload or signature');
          return Response.json(
            { error: 'Missing payload or signature' },
            { status: 400 }
          );
        }
        try {
          await handleWebhookEvent(payload, signature);
          return Response.json({ received: true }, { status: 200 });
        } catch (err) {
          console.error('Creem webhook error:', err);
          // Return 200 even on error to prevent Creem infinite retries
          return Response.json(
            {
              error: 'Webhook processing failed',
              received: true,
            },
            { status: 200 }
          );
        }
      },
    },
  },
});

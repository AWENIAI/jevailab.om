export class InvalidWebhookSignatureError extends Error {
  override name = 'InvalidWebhookSignatureError';

  constructor() {
    super('Invalid Stripe webhook signature');
  }
}

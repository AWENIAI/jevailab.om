# Stripe sandbox payment testing

This directory contains the real Stripe Test Mode browser flow in
`stripe-sandbox.spec.ts`. It exercises hosted Checkout, Stripe webhook
delivery, the local D1 payment record, Customer Portal access, subscription
cancellation, and Lifetime refunds.

## Manual local testing

The steps below use the normal local Worker on port `3000`. Use Stripe Test
Mode only; do not use live keys or live Price IDs.

### 1. Configure the local environment

Put the following values in the git-ignored `.env.local` file. The `VITE_*`
values are build-time client configuration; the other values are server-only
secrets.

```dotenv
VITE_BASE_URL=http://localhost:3000
VITE_PAYMENT_PROVIDER=stripe

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PRICE_PRO_MONTHLY=price_...
VITE_STRIPE_PRICE_PRO_YEARLY=price_...
VITE_STRIPE_PRICE_LIFETIME=price_...
```

The three Price IDs must belong to the same Stripe Test Mode account as
`STRIPE_SECRET_KEY`. If the local D1 database has not been initialized, apply
the migrations before starting the Worker:

```bash
pnpm db:migrate:local
```

### 2. Start the local Worker

From the repository root, start the application:

```bash
pnpm dev
```

Keep this terminal open. The local Stripe webhook endpoint is:

```text
http://localhost:3000/api/webhooks/stripe
```

### 3. Forward Stripe webhooks with Stripe CLI

Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and authenticate
it once for the same Stripe Test Mode account:

```bash
stripe login
```

In a second terminal, forward the events used by the payment provider to the
local Worker:

```bash
stripe listen \
  --skip-update \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,charge.refunded \
  --forward-to http://localhost:3000/api/webhooks/stripe
```

The CLI prints a webhook signing secret similar to `whsec_...`. Set that value
as `STRIPE_WEBHOOK_SECRET` in `.env.local` and restart `pnpm dev`. The secret
printed by the currently running `stripe listen` process signs forwarded local
events; a Stripe Dashboard endpoint secret will not validate those CLI events.

### 4. Complete a checkout in the browser

Open `http://localhost:3000/pricing`, register or sign in with a test account,
and choose a plan. Use these Stripe test cards:

| Scenario | Card number |
|---|---|
| Successful payment | `4242 4242 4242 4242` |
| Declined payment | `4000 0000 0000 9995` |

For a successful payment, use any future expiry date, such as `12/30`, and a
three-digit CVC such as `123`. Verify that:

1. Stripe Checkout returns to the local payment-processing or Billing page.
2. The Stripe CLI terminal shows the forwarded events and a successful local
   webhook response.
3. Billing shows the expected Pro or Lifetime entitlement.
4. The local D1 payment row eventually becomes paid. Webhook delivery is
   asynchronous, so allow a few seconds before treating the flow as failed.

For the declined-card case, confirm that Checkout remains unsuccessful and no
paid payment row is created in local D1.

### 5. Test cancellation and refunds

For a subscription, open the Stripe Customer Portal from local Billing and
cancel the test subscription. Watch for
`customer.subscription.updated` and `customer.subscription.deleted` in the
Stripe CLI terminal, then confirm the local subscription state changes.

For a Lifetime refund, locate the successful Test Mode PaymentIntent in the
Stripe Dashboard and create a full refund, or use the CLI with its PaymentIntent
ID:

```bash
stripe refunds create --payment-intent pi_...
```

Keep the listener running so `charge.refunded` reaches
`/api/webhooks/stripe`. Confirm that the local Lifetime entitlement is revoked
after the event is processed.

## Automated sandbox test

`pnpm e2e:stripe` starts the isolated local Worker and D1 state automatically
through `playwright.stripe.config.ts`. It also starts Stripe CLI, captures the
CLI webhook signing secret, and runs this directory's Playwright suite. Do
not start a second `stripe listen` process for this command.

The runner loads the `e2e` environment through Vite. Put sandbox credentials
in the git-ignored `.env.e2e` file or export them in the shell:

```dotenv
VITE_BASE_URL=http://127.0.0.1:3019
VITE_PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PRICE_PRO_MONTHLY=price_...
VITE_STRIPE_PRICE_PRO_YEARLY=price_...
VITE_STRIPE_PRICE_LIFETIME=price_...
```

Run the suite with:

```bash
pnpm e2e:stripe
```

The default isolated port is `3019`. The runner creates a separate
`.wrangler/e2e-stripe-state` D1 state directory, applies migrations, starts
Vite in `e2e` mode, and forwards Stripe events to that same port. It passes the
temporary CLI webhook secret into the Worker automatically.

To run a subset of the specification:

```bash
pnpm e2e:stripe -- --grep "monthly subscription"
```

Use `STRIPE_E2E_PORT` to select another isolated port. The Stripe CLI listener
and the Playwright Worker will use that port together.

## Troubleshooting

- `No such command: stripe`: install the Stripe CLI and ensure it is on
  `PATH`.
- Webhook signature failures during manual testing: copy the secret from the
  current `stripe listen` process into `STRIPE_WEBHOOK_SECRET` and restart the
  local Worker.
- The automated test cannot find credentials: ensure the required values are
  in `.env.e2e` or the shell environment. The runner requires an `sk_test_`
  key and all three Test Mode Price IDs.
- Checkout uses the wrong plan: confirm `VITE_PAYMENT_PROVIDER=stripe` and
  that the Price IDs are from the same Test Mode account as the secret key.
- The browser succeeds but Billing does not update: keep Stripe CLI running,
  inspect the forwarded event response, and wait for asynchronous D1 updates.

Never commit `.env.local`, `.env.e2e`, Stripe secret keys, or webhook secrets.

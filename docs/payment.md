# Payment (Stripe / Creem / Waffo)

Subscription and one-time payment support via a **provider pattern** — switch between Stripe, Creem, and Waffo by setting the `VITE_PAYMENT_PROVIDER` env var (`'stripe'`, `'creem'`, or `'waffo'`). Set it to `''` (empty, the default) to disable payment entirely. All providers implement the same `PaymentProvider` interface, so downstream code (checkout, billing, webhooks) remains provider-agnostic. See [Env](./env.md) for all variables.

### Shared routes

- **Pricing**: `/pricing` — plans and checkout buttons.
- **Payment callback**: `/payment?session_id=...&callback=/settings/billing` — polls until paid, then redirects.
- **Billing**: `/settings/billing` — current plan and subscription management.

### Shared server API (Server Functions)

- `createCheckoutSession` — create a checkout session, redirect URL returned.
- `createCustomerPortalSession` — create a billing portal session (Stripe Customer Portal / Creem customer portal).
- `getCurrentPlan` — current plan and subscription for a user.
- `checkPaymentCompletion` — whether a session is paid (for polling).

### Checkout localization & theme

The checkout is always hosted by the payment provider, so language and theme follow each provider's own page:

- **Stripe** — the checkout locale is set from the site locale via the `locale` param (falls back to `auto`). Dark mode is not supported on Stripe's hosted checkout; only dashboard branding (logo, colors) applies.
- **Creem** — the checkout auto-detects the browser language (42 languages, switchable on the page); there is no locale parameter. The template appends the site's resolved theme as `?theme=dark|light` to the checkout URL; without it the store default theme is used.
- **Waffo** — the site locale is mapped to the checkout `language` (`en` → `en`, `zh` → `zh-Hans`; customers can still switch on the page) and the site's resolved theme is passed as `darkMode` (`true`/`false`, omit → store default).

### Module layout

| Path | Purpose |
|------|---------|
| `src/payment/types.ts` | `PaymentProvider` interface, shared types |
| `src/payment/index.ts` | Provider factory/registry, exported functions |
| `src/payment/constants.ts` | Polling/retry constants |
| `src/payment/provider/stripe.ts` | Stripe provider implementation |
| `src/payment/provider/creem.ts` | Creem provider implementation |
| `src/payment/provider/waffo.ts` | Waffo Pancake provider implementation |
| `src/api/payment.ts` | Server functions (provider-agnostic) |
| `src/lib/price-plan.ts` | Plan/price helpers from config |
| `src/config/website.ts` | `price.plans` and env-based price/product IDs |

---

## Stripe

### Setup

1. **Env**: Set the following environment variables (see [Env](./env.md)):
   - **Runtime (secrets):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - **Build-time:** `VITE_PAYMENT_PROVIDER=stripe`, `VITE_STRIPE_PRICE_PRO_MONTHLY`, `VITE_STRIPE_PRICE_PRO_YEARLY`, `VITE_STRIPE_PRICE_LIFETIME` (Stripe Price IDs)

2. **DB**: Schema adds `user.customerId` and `payment` table. Generate and apply migrations:
   - `pnpm db:generate`
   - Then apply with your D1 workflow (e.g. `pnpm db:migrate:remote` or `pnpm db:migrate:local`)

3. **Stripe Dashboard**:
   - Create Products/Prices for Pro (monthly/yearly) and Lifetime.
   - Webhook: `https://your-domain.com/api/webhooks/stripe`
     Events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `charge.refunded`.

### Billing portal

Stripe provides a built-in **Customer Portal** for managing subscriptions (upgrade, cancel, update payment method). Accessed via the "Manage subscription" button on `/settings/billing`.

Full refunds for Lifetime purchases are handled through `charge.refunded` and
revoke access. Partial refunds do not revoke access.

---

## Creem

[Creem](https://creem.io) is a merchant-of-record (MoR) payment platform. It handles global tax compliance, payouts, and provides a simpler setup compared to Stripe.

### Setup

1. **Env**: Set the following environment variables (see [Env](./env.md)):
   - **Runtime (secrets):** `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`
   - **Runtime (optional):** `CREEM_DEBUG=true` to use the Creem test/sandbox API (`test-api.creem.io`); omit or set to `false` for production (`api.creem.io`)
   - **Build-time:** `VITE_PAYMENT_PROVIDER=creem`, `VITE_CREEM_PRODUCT_PRO_MONTHLY`, `VITE_CREEM_PRODUCT_PRO_YEARLY`, `VITE_CREEM_PRODUCT_LIFETIME` (Creem Product IDs)

2. **DB**: Same schema as Stripe (`user.customerId`, `payment` table). Generate and apply migrations:
   - `pnpm db:generate`
   - Then apply with your D1 workflow (e.g. `pnpm db:migrate:remote` or `pnpm db:migrate:local`)

3. **Creem Dashboard**:
   - Create Products for Pro (monthly/yearly) and Lifetime.
   - Webhook: Settings → Webhooks → Add endpoint: `https://your-domain.com/api/webhooks/creem`
     Events: `checkout.completed`, `subscription.paid`, `subscription.canceled`, `subscription.expired`, `subscription.trialing`, `subscription.paused`.

### Key differences from Stripe

- Creem uses **Product IDs** (not Price IDs) for checkout.
- Creem is a **merchant of record** — it handles tax, VAT, and payouts on your behalf.
- Creem provides a **customer portal** for subscription management, similar to Stripe's Customer Portal.
- Debug/sandbox mode is toggled via the `CREEM_DEBUG` env var.

## Waffo Pancake

[Waffo Pancake](https://docs.waffo.ai/integrate/ai-integration) is an external Merchant of Record payment platform supporting fixed-price SaaS subscriptions and one-time products. This template integration uses Waffo's hosted checkout and consumer portal.

### Setup

1. **Env**: Set the following variables:
   - **Runtime secrets:** `WAFFO_MERCHANT_ID`, `WAFFO_PRIVATE_KEY`
   - **Runtime (optional):** `WAFFO_DEBUG=true` to accept `mode: "test"` webhook events in a production build (useful when smoke-testing prod deployments with a sandbox merchant). Leave unset or `false` in real production so sandbox purchases can never grant real access.
   - **Build-time:** `VITE_PAYMENT_PROVIDER=waffo`, `VITE_WAFFO_PRODUCT_PRO_MONTHLY`, `VITE_WAFFO_PRODUCT_PRO_YEARLY`, `VITE_WAFFO_PRODUCT_LIFETIME` (Waffo Product IDs)
2. **Waffo Dashboard**:
   - Create one subscription product for each monthly/yearly plan and one one-time product for the lifetime plan.
   - Publish the products from test to production before using production checkout.
   - Configure the webhook URL as `https://your-domain.com/api/webhooks/waffo`.
   - Subscribe to `order.completed`, `subscription.activated`, `subscription.payment_succeeded`, `subscription.updated`, `subscription.canceling`, `subscription.uncanceled`, `subscription.canceled`, `subscription.past_due`, `refund.succeeded`, and `refund.failed`.
3. **Consumer portal**: The Billing page sends customers to Waffo's hosted portal at `https://pancake.waffo.ai/consumer/portal/login`. Customers use the purchase email and Waffo Magic Link flow to manage subscriptions and refund requests.

Keep `WAFFO_PRIVATE_KEY` server-only. For a PEM value in a Worker secret or local env file, preserve the PEM content with escaped `\n` line breaks as described in the Waffo SDK documentation.

### Notes and caveats

- **No `user.customerId`**: Waffo has no per-merchant customer entity, so unlike Stripe and Creem, this provider never writes `user.customerId`. The `payment.customerId` column stores the buyer identity (userId) for auditability. Any admin feature that assumes `user.customerId` is populated will silently no-op under Waffo.
- **Shared consumer portal**: `createCustomerPortal()` always returns the same `https://pancake.waffo.ai/consumer/portal/login` URL — no per-customer session is created. The provider declares `requiresCustomerId = false` so `src/api/payment.ts` skips the customerId guard for Waffo.
- **`sessionId` semantics**: Waffo webhook payloads carry no reference back to the checkout session id, so `payment.sessionId` is stored as `null`. Post-checkout redirects for Waffo go straight to `/settings/billing` instead of the session-poll page.
- **Refund policy**: Any successful `refund.succeeded` event revokes access (`paid = false`), matching Stripe and Creem. The Waffo payload has no partial-vs-full marker, so partial refunds intended to preserve access must be handled manually.

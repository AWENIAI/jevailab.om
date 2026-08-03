# E2E Test Catalog

This catalog is the acceptance checklist for Playwright E2E coverage. Update it
before or alongside feature work, then use the implemented spec files to lock in
the verified behavior.

## Workflow

Use the local feature flow:

```txt
Spec -> Code -> Verify -> Test -> Green
```

1. Spec: add or update the relevant journey in this catalog.
2. Code: implement the feature.
3. Verify: run the app and walk the real UI in a browser.
4. Test: add or update the matching Playwright spec.
5. Green: run the related spec locally; run full E2E before releases or large
   refactors.

E2E tests are intentionally local-first. CI should continue to prefer fast
checks such as `pnpm check` and `pnpm build` unless a separate E2E environment is
explicitly provisioned.

## Test Harness

- Config: `playwright.config.ts`
- Specs: `tests/e2e/specs/`
- Fixtures: `tests/e2e/fixtures/`
- Test-only API: `src/routes/api/e2e/users.ts`
- Local state: `.wrangler/e2e-state/` (recreated for every run)

Playwright starts Vite on the configured `PORT` and points both Wrangler
migrations and the Cloudflare Vite plugin at the same isolated local state.
This keeps E2E data separate from the developer's `.wrangler/state` database.
`pnpm e2e:production` builds the app and runs a smaller smoke suite against
Cloudflare Vite preview so production SSR and API output are covered too.

The test-only API is disabled unless Vite is running locally with
`import.meta.env.DEV === true`, `MODE=e2e`, and the request includes the
configured `x-e2e-secret` header. Test accounts must use the
`e2e-*@example.test` email pattern so cleanup stays scoped.

## 1. Public Page Smoke Test

**File:** `specs/public-pages.spec.ts` | **Priority:** P0

Verifies that public pages render in English/Chinese and dark/light mode without
browser console errors or page errors.

| # | Test name | Flow |
|---|---|---|
| 1 | Public pages render successfully | Open `/`, `/pricing`, `/blog`, `/blog/getting-started`, `/ai`, `/about`, `/contact`, `/changelog`, `/roadmap`, `/waitlist`, `/cookie`, `/privacy`, `/terms`, `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` for `en` and `zh`, in `dark` and `light` mode. Verify each returns 2xx, renders a visible body, applies the requested theme, and emits no browser errors. |
| 2 | Home login modal opens | Open `/`, click the navbar login button, verify the login dialog and credential inputs are visible, and assert no browser errors. |
| 3 | Desktop auth actions keep stable width while loading | Delay the session request, verify inert Login and Sign up placeholders are visible, then release the request and confirm the resolved actions occupy the same width. |
| 4 | Open mobile navigation hides at desktop breakpoint | Open the mobile navigation at a narrow viewport, resize to desktop width, and verify the mobile dialog no longer covers the desktop navigation. |
| 5 | Mobile navigation uses consistent interactive backgrounds | At a narrow viewport, verify standalone links gain the muted background on hover and active standalone, group, and nested links retain the same background treatment. |
| 6 | Health check responds with pong | Call `/api/ping` and verify `{ "message": "pong" }`. |

## 2. Authentication And Protected Routes

**File:** `specs/auth.spec.ts` | **Priority:** P0

Verifies login and route protection with real Better Auth endpoints and seeded
verified users.

| # | Test name | Flow |
|---|---|---|
| 1 | Guests are redirected from dashboard | Open `/dashboard` while signed out, expect redirect to `/auth/login`, and verify the email input is visible. |
| 2 | Verified user can sign in | Create an E2E user, mark it verified, sign in through `/auth/login`, and verify dashboard content. |
| 3 | User can register from UI | Fill `/auth/register`, verify the registration success message, mark the test account verified, sign in through `/auth/login`, and verify dashboard content. |
| 4 | Non-admin cannot view admin pages | Sign in as a non-admin user, open `/admin/users`, and expect redirect to `/dashboard`. |
| 5 | Admin can view users dashboard | Sign in as an admin E2E user, open `/admin/users`, verify the users dashboard shows the admin email, then open and close the user's detail drawer. |

## 3. Protected Page Smoke Test

**File:** `specs/protected-pages.spec.ts` | **Priority:** P0

Verifies authenticated app pages render in English/Chinese and dark/light mode
without browser console errors or page errors.

| # | Test name | Flow |
|---|---|---|
| 1 | Protected pages render successfully | Sign in as an admin E2E user, then open `/dashboard`, `/admin/users`, `/settings/profile`, `/settings/security`, `/settings/apikeys`, `/settings/files`, `/settings/billing`, `/settings/payment`, `/settings/notifications` for `en` and `zh`, in `dark` and `light` mode. Verify each returns 2xx, renders a visible body, applies the requested theme, and emits no browser errors. |
| 2 | Collapsed sidebar persists across protected route groups | Collapse the desktop sidebar, navigate from Dashboard to Profile and Security, then return to Dashboard. Verify the sidebar remains collapsed after every route transition. |

## 4. Profile Settings

**File:** `specs/settings-profile.spec.ts` | **Priority:** P1

Verifies the signed-in profile update flow.

| # | Test name | Flow |
|---|---|---|
| 1 | User can update display name | Sign in, open `/settings/profile`, change the name, save, verify success toast and persistence. |

## 5. API Key Settings

**File:** `specs/settings-apikeys.spec.ts` | **Priority:** P0

Verifies the Better Auth API key lifecycle through the signed-in UI.

| # | Test name | Flow |
|---|---|---|
| 1 | User can create and delete an API key | Sign in, create a named API key, verify the one-time secret and persisted table row, delete it, and verify the row disappears. |

## 6. Security Settings

**File:** `specs/settings-security.spec.ts` | **Priority:** P0

Verifies credential changes through Better Auth and the real browser session.

| # | Test name | Flow |
|---|---|---|
| 1 | User can change password | Sign in, change the password, sign out, verify the old password is rejected, then sign in with the new password. |

## 7. File Settings

**File:** `specs/settings-files.spec.ts` | **Priority:** P0

Verifies the D1 and R2 file lifecycle through the signed-in UI and same-origin
download endpoint, including TanStack Server Function CSRF protection.

| # | Test name | Flow |
|---|---|---|
| 1 | User can upload, read, and delete a private file | Sign in, upload a text file, verify its table row and authenticated response headers/body, replay the upload request from a cross-site origin and verify a 403 response, delete the file, and verify the row disappears. |

## 8. Production Worker Smoke Test

**File:** `production/production-smoke.spec.ts` | **Priority:** P0

Verifies the built Worker rather than the Vite development server.

| # | Test name | Flow |
|---|---|---|
| 1 | Production Worker serves SSR and API responses | Build the app, start Cloudflare Vite preview, render and hydrate representative public routes, verify guest auth redirect and `/api/ping`, and confirm the E2E helper returns 404. |

## 9. Router Boundaries

**File:** `specs/router-boundaries.spec.ts` | **Priority:** P0

Verifies TanStack Router error handling at the HTTP and rendered UI boundaries.

| # | Test name | Flow |
|---|---|---|
| 1 | Unknown route renders not found | Open an unknown route, verify HTTP 404 and the root not-found UI. |
| 2 | Loader notFound renders root boundary | Open `/test-404`, verify HTTP 404 and the root not-found UI. |
| 3 | Loader error renders catch boundary | Open `/test-error`, verify HTTP 500, the catch-boundary UI, and the original error message. |

## Deferred Coverage

These flows should be added after their dependencies are made deterministic:

| Area | Reason |
|---|---|
| Transactional email | Requires a fake mail provider or captured verification links. |
| AI tools | Requires provider mocks or stable fake responses to avoid cost and flake. |

## Stripe Payment Coverage

Stripe payment tests use two layers. Creem has a separate hosted-checkout
sandbox suite below because its webhook forwarding and hosted UI differ from
Stripe.

### Fast webhook layer

**Files:** `tests/unit/payment/stripe-webhook.test.ts` and
`tests/unit/payment/stripe-provider.test.ts`

Runs inside `pnpm check` with Stripe SDK-generated test signatures. It verifies
invalid signatures, checkout creation for subscription and Lifetime prices,
Customer Portal parameters, subscription and one-time `invoice.paid` handling,
renewal lookup by subscription ID, cancellation/deletion, refund access
revocation, and duplicate payment idempotency without making network requests.

### Sandbox E2E layer

**File:** `tests/e2e/stripe/stripe-sandbox.spec.ts`

Run explicitly with `pnpm e2e:stripe`. The runner refuses live keys, starts a
Stripe CLI listener, forwards real sandbox events to the local Worker, and uses
Playwright to complete hosted Checkout with Stripe's success and decline test
cards. Successful flows also poll the local E2E API and assert the D1 payment
row, rather than relying on rendered Billing text alone.

| # | Test name | Flow |
|---|---|---|
| 1 | Monthly subscription and portal | Register and sign in, create a real monthly Checkout Session, complete sandbox Checkout, verify the Pro plan, D1 subscription row, Stripe subscription price, then open Customer Portal. |
| 2 | Yearly subscription | Register and sign in, select yearly pricing, complete sandbox Checkout, verify the Pro plan, D1 interval/status, and yearly Stripe price. |
| 3 | Lifetime payment | Register and sign in, complete a one-time sandbox Checkout, verify the Lifetime plan, paid Lifetime D1 row, and Stripe line-item price. |
| 4 | Declined card | Submit Stripe's decline test card and verify the checkout remains unsuccessful with no paid D1 row. |
| 5 | Cancellation and deletion | Cancel at period end, then cancel immediately through the Stripe API and verify both subscription webhook states in D1. |
| 6 | Full refund | Refund the Lifetime PaymentIntent and verify the `charge.refunded` webhook revokes access. |

Renewal lookup and period updates are covered in the fast provider tests with
signed `invoice.paid` events. The sandbox suite does not cover failed
renewals/past-due recovery, time-based Test Clock advancement, or interactive
Customer Portal changes such as upgrade, downgrade, and payment method
replacement.

## Creem Payment Coverage

**File:** `tests/e2e/creem/creem-sandbox.spec.ts` | **Priority:** P1

Run the focused suite with `pnpm e2e:creem`. The suite uses Creem Test Mode
products and test cards, then verifies both the hosted browser journey and the
asynchronous webhook-backed D1 payment row.

| # | Test name | Flow |
|---|---|---|
| 1 | Monthly subscription | Register and sign in, complete the Creem hosted monthly checkout, return through the app payment-processing route, and verify Pro + Active plus the monthly product in D1. |
| 2 | Yearly subscription | Select yearly pricing, complete the hosted checkout, and verify Pro + Active plus the yearly product and interval in D1. |
| 3 | Lifetime payment | Complete the hosted one-time checkout and verify Lifetime plus a completed one-time D1 payment row. |
| 4 | Declined card | Submit Creem's declined test card and verify the checkout stays unsuccessful with no paid D1 row. |
| 5 | Scheduled cancellation | Cancel the created test subscription through Creem's official SDK/API and verify the `subscription.scheduled_cancel` webhook sets `cancelAtPeriodEnd` while the subscription remains active. |

### Prerequisites

`pnpm e2e:creem` starts the local Worker and isolated D1 state automatically.
Before running it, configure the following in Creem Test Mode:

1. Expose `http://localhost:3021` through an HTTPS tunnel. Creem's webhook
   documentation recommends a public HTTPS endpoint for local testing; for
   example, use `cloudflared --config /dev/null tunnel --url
   http://localhost:3021 --no-autoupdate --protocol quic`.
2. Register `<tunnel>/api/webhooks/creem` under the Creem Test Mode Developers
   → Webhooks page, with the events used by the suite:
   `checkout.completed`, `subscription.active`, `subscription.paid`,
   `subscription.scheduled_cancel`, `subscription.canceled`,
   `subscription.expired`, `subscription.past_due`, `subscription.trialing`,
   and `subscription.paused`.
3. Set `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_DEBUG=true`, and the
   three `VITE_CREEM_PRODUCT_*` test product IDs.

Creem's test cards accept any future expiry, CVV, and billing details. The
successful card is `4242 4242 4242 4242`; the declined card is
`4000 0000 0000 0002`. Webhook delivery is asynchronous, so the tests wait
for the local E2E API before deleting each test user.

The suite does not cover test-mode renewal time travel, refunds, or interactive
customer portal changes. Those should remain separate because Creem's portal
uses an email magic-link flow and its renewal lifecycle is time-dependent.

## Waffo Payment Coverage

**File:** `tests/e2e/waffo/waffo-sandbox.spec.ts` | **Priority:** P1

Run the focused suite with `pnpm e2e:waffo`. The unit boundary
(`tests/unit/payment/waffo-provider.test.ts`) already runs in `pnpm check` and
covers checkout mapping, order completion, subscription cancellation/renewal
state, and refund handling.

The Playwright journey registers and signs in, completes Waffo test checkout
for the monthly, yearly and lifetime products, asserts the Billing page
reflects the corresponding plan (Pro + Active, Pro + Active, Lifetime), and
covers the sandbox renewal event (`subscription.payment_succeeded`).

Hosted checkouts return through the payment processing page
(`/settings/payment?callback=...`, detected by "callback present and no
`session_id`"), which polls the current plan until the webhook lands and then
navigates to Billing. The specs assert Billing settles into the paid plan
**without a manual reload** — regression coverage for a stale-plan bug where
returning from Waffo rendered the old plan until a hard refresh.

Waffo test mode delivers `subscription.payment_succeeded` immediately after
`subscription.activated`, so the monthly/yearly journeys exercise the renewal
handler on every run. The dedicated renewal test additionally asserts from the
E2E API that the renewal leaves the subscription row `active` with no
scheduled cancellation and no duplicate payment rows.

### Prerequisites

`pnpm e2e:waffo` currently expects the following to be set up manually before
running — there is no bootstrap script yet:

1. Local dev server running on port `3018` (`PORT=3018 pnpm dev` or an
   equivalent E2E-mode entrypoint) with `MODE=e2e` and the E2E secret header
   accepted by `src/routes/api/e2e/users.ts`.
2. Public tunnel to `http://localhost:3018` via **cloudflared**
   (`cloudflared tunnel --url http://localhost:3018`). It preserves the
   `X-Waffo-Signature` header, needs no account, and has no 2-hour session
   cap. ngrok works too but requires signup. Do **not** use localtunnel — it
   strips custom headers, so Waffo webhook signature verification fails.
3. Waffo dashboard configured with:
   - test-mode products whose IDs match the price plans in
     `src/config/website.ts` (monthly / yearly / lifetime),
   - a `http` webhook pointing at `<tunnel>/api/webhooks/waffo` for the test
     environment (see `docs/waffo/SKILL.md` → Configuring Webhook URLs).
4. `.dev.vars` containing `WAFFO_MERCHANT_ID` and `WAFFO_PRIVATE_KEY`
   (PEM). If deploying via Cloudflare, run `pnpm cf-typegen` after adding.

Optional: override the base URL with
`PLAYWRIGHT_BASE_URL=https://<tunnel>.ngrok.app pnpm e2e:waffo` to walk the
tunnel directly instead of localhost.

### Known gaps

The Playwright suite does not yet cover:
- Hosted consumer portal navigation
- Subscription upgrade / downgrade
- Refund revoking access
- Past-due flows (renewal success is covered; failed-renewal state remains
  unit-level via `tests/unit/payment/waffo-provider.test.ts`)

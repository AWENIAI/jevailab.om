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
| 3 | Health check responds with pong | Call `/api/ping` and verify `{ "message": "pong" }`. |

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

Stripe payment tests use two layers. Creem is intentionally excluded.

### Fast webhook layer

**File:** `tests/unit/payment/stripe-webhook.test.ts`

Runs inside `pnpm check` with a Stripe SDK-generated test signature. It verifies
invalid signature rejection, a signed one-time Checkout event, and D1 duplicate
invoice idempotency without making network requests.

### Sandbox E2E layer

**File:** `tests/e2e/stripe/stripe-sandbox.spec.ts`

Run explicitly with `pnpm e2e:stripe`. The runner refuses live keys, starts a
Stripe CLI listener, forwards real sandbox events to the local Worker, and uses
Playwright to complete hosted Checkout with Stripe's success test card.

| # | Test name | Flow |
|---|---|---|
| 1 | Monthly subscription and portal | Register and sign in, create a real monthly Checkout Session, complete sandbox Checkout, receive real webhooks through Stripe CLI, verify the Pro plan and Stripe subscription price, then open Customer Portal. |
| 2 | Yearly subscription | Register and sign in, select yearly pricing, complete sandbox Checkout, verify the Pro plan and yearly Stripe price. |
| 3 | Lifetime payment | Register and sign in, complete a one-time sandbox Checkout, verify the Lifetime plan and Stripe line-item price. |

The sandbox suite does not cover failed cards, cancellation, refunds, renewals,
or Test Clocks.

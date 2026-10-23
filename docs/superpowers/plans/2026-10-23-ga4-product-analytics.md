# GA4 Product Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consent-gated GA4 measurement for anonymous visitor journeys and the core Jevailab funnel without exporting personal, generated-content, or payment data.

**Architecture:** Keep the existing GA4 script as the only analytics transport. A typed, fail-closed client event layer accepts a small event whitelist; a consent preference gates both script loading and events. Router page views use canonical paths, and product events are emitted only at existing success boundaries.

**Tech Stack:** TanStack Start/Router, React 19, TypeScript, Vitest, Google Analytics 4, Cloudflare Workers/Vite.

**Spec:** `docs/superpowers/specs/2026-10-23-ga4-product-analytics-design.md`

## Global Constraints

- Production measurement ID: `G-HFXVL3377J`; test must use a distinct ID or none.
- Do not add another analytics provider, recording tool, or first-party dashboard.
- Never send prompts, media or media URLs, email/name/user/session IDs, IP, secrets, payment IDs/URLs/details, raw prices, arbitrary query strings, or fragments.
- Analytics requires recorded consent and tracking errors must not affect application behaviour.
- Use canonical paths for page views. Complete lint, unit tests, build, and typecheck before deployment.

## Review Focus

- Query and hash data from OAuth/payment routes must never appear in `page_view` (Task 2).
- Unknown events and fields including `email`, `prompt`, `userId`, and `url` must not dispatch (Task 1).
- Denied consent must load no GA script and emit no custom events (Task 2).
- Quote polling must not duplicate `quote_requested` (Task 3).
- `purchase` must occur only after server-confirmed payment status (Task 4).

---

## File Structure

- `src/lib/analytics/events.ts`: typed event whitelist, sanitizer, and safe gtag dispatch.
- `src/lib/analytics/consent.ts`: versioned local consent preference.
- `src/components/analytics/analytics-consent.tsx`: localized consent controls.
- `src/components/analytics/analytics-page-view.tsx`: router-aware canonical views.
- `src/components/analytics/{analytics,google-analytics}.tsx`: GA4 composition and consent gate.
- `src/components/auth/{register-form,login-form,social-login-button}.tsx`: auth events.
- `src/components/blocks/ai-image-creator.tsx`: creator events.
- `src/components/pricing/{checkout-auth-button,create-checkout-button}.tsx`, `src/components/payment/payment-card.tsx`: pricing/payment events.
- `content/pages/{privacy,privacy.zh,cookie,cookie.zh}.md`, `src/env/client.ts`, `docs/env.md`: disclosure and configuration.
- `tests/unit/analytics-*.test.ts` plus relevant existing auth, creator, and payment tests.

### Task 1: Create the safe GA4 event contract

**Files:**
- Create: `src/lib/analytics/events.ts`
- Create: `tests/unit/analytics-events.test.ts`

**Interfaces:**
- Produces: `AnalyticsEventName`, `AnalyticsEventPayloadMap`, `trackAnalyticsEvent(name, payload): void`, and `trackPageView(pathname, locale): void`.
- Consumes: the consent predicate from Task 2.

- [ ] **Step 1: Write failing contract tests**

Test a valid `template_selected` payload, canonical path sanitization, prohibited fields (`email`, `prompt`, `userId`, `url`), unknown event rejection, and a missing `window.gtag` handler.

- [ ] **Step 2: Run the failing test**

Run: `pnpm vitest run tests/unit/analytics-events.test.ts`

Expected: FAIL because the contract does not exist.

- [ ] **Step 3: Implement the typed whitelist**

Implement precisely the events defined by the spec: auth, create-page, template, quote, generation, download, pricing, checkout, and purchase. Dispatch only validated shallow fields with `window.gtag('event', name, payload)`; `trackPageView` only sends `page_path`.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/unit/analytics-events.test.ts && pnpm lint`

Commit: `feat(analytics): add safe GA4 event contract`

### Task 2: Add consent-gated GA4 and SPA page views

**Files:**
- Create: `src/lib/analytics/consent.ts`
- Create: `src/components/analytics/analytics-consent.tsx`
- Create: `src/components/analytics/analytics-page-view.tsx`
- Modify: `src/components/analytics/google-analytics.tsx`
- Modify: `src/components/analytics/analytics.tsx`
- Modify: `src/routes/__root.tsx`
- Create: `tests/unit/analytics-consent.test.ts`
- Create: `tests/unit/analytics-page-view.test.ts`

**Interfaces:**
- Consumes: `trackPageView` from Task 1.
- Produces: `getAnalyticsConsent(): 'granted' | 'denied' | null` and `setAnalyticsConsent(value)`.

- [ ] **Step 1: Write failing consent and route tests**

Prove no GA script/event before consent or after denial; acceptance persists a versioned first-party preference; and a route change sends exactly one canonical `page_view` without search/hash data.

- [ ] **Step 2: Run the failing tests**

Run: `pnpm vitest run tests/unit/analytics-consent.test.ts tests/unit/analytics-page-view.test.ts`

Expected: FAIL because consent/page-view code does not exist.

- [ ] **Step 3: Implement the consent boundary**

Render localized accept/decline controls with policy links. Load `gtag.js` only for granted consent with a configured ID and configure it with `send_page_view: false`. Subscribe to Router location state and emit canonical page views.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/unit/analytics-consent.test.ts tests/unit/analytics-page-view.test.ts && pnpm build`

Commit: `feat(analytics): gate GA4 behind consent`

### Task 3: Instrument auth and image creation

**Files:**
- Modify: `src/components/auth/register-form.tsx`
- Modify: `src/components/auth/login-form.tsx`
- Modify: `src/components/auth/social-login-button.tsx`
- Modify: `src/components/blocks/ai-image-creator.tsx`
- Modify: relevant existing auth/creator tests and `tests/unit/analytics-events.test.ts`

**Interfaces:**
- Consumes: `trackAnalyticsEvent`.
- Produces: `sign_up`, `login`, `create_page_view`, `template_selected`, `quote_requested`, `generation_started`, `generation_completed`, `generation_failed`, and `image_downloaded`.

- [ ] **Step 1: Write failing instrumentation tests**

Verify email/Google method only, safe template ID/category, one quote per unique result, one terminal generation event, and no media URL on download.

- [ ] **Step 2: Run the failing tests**

Run affected auth and image-creator Vitest files plus `analytics-events.test.ts`.

Expected: FAIL because product components do not call the event layer.

- [ ] **Step 3: Instrument existing success boundaries**

Do not alter auth callbacks, quote debounce, generation requests, polling, or download behavior. Use refs to deduplicate quote and terminal job events.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/unit/image-creator-ui-state.test.ts tests/unit/image-creator-validation.test.ts tests/unit/auth-mail.test.ts tests/unit/analytics-events.test.ts`

Commit: `feat(analytics): track auth and creation funnel`

### Task 4: Instrument pricing and confirmed purchase boundaries

**Files:**
- Modify: `src/components/pricing/checkout-auth-button.tsx`
- Modify: `src/components/pricing/create-checkout-button.tsx`
- Modify: `src/components/payment/payment-card.tsx`
- Modify: applicable existing pricing/payment tests.

**Interfaces:**
- Consumes: `trackAnalyticsEvent`.
- Produces: `pricing_viewed`, `checkout_started`, and server-confirmed `purchase` with only plan, billing interval, and locale.

- [ ] **Step 1: Write failing payment-boundary tests**

Assert checkout tracks only after a checkout URL exists; checkout errors do not track; `purchase` fires once after `isPaid`; payment failure/timeout has no purchase and never forwards `sessionId`.

- [ ] **Step 2: Run the failing tests**

Run relevant pricing/payment tests plus `analytics-events.test.ts`.

Expected: FAIL because no pricing instrumentation exists.

- [ ] **Step 3: Implement safe pricing instrumentation**

Map existing UI selection to whitelisted plan/interval values. Track checkout before navigation and purchase only after `PaymentCard` sees server-confirmed payment.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/unit/lib/payment-return-url.test.ts tests/unit/payment/payment-security.test.ts tests/unit/analytics-events.test.ts`

Commit: `feat(analytics): track pricing funnel safely`

### Task 5: Publish disclosure, configure production, and verify

**Files:**
- Modify: `content/pages/privacy.md`
- Modify: `content/pages/privacy.zh.md`
- Modify: `content/pages/cookie.md`
- Modify: `content/pages/cookie.zh.md`
- Modify: `src/env/client.ts`
- Modify: `docs/env.md`
- Modify: `tests/unit/public-copy.test.ts`
- Configure the Cloudflare production build variable outside Git.

**Interfaces:**
- Produces: bilingual disclosure and a production build containing `G-HFXVL3377J` only after consent.

- [ ] **Step 1: Write failing legal-copy/environment tests**

Verify English and Chinese policy pages disclose Google Analytics, aggregate purpose, and consent control; verify the optional public environment value validates.

- [ ] **Step 2: Run the failing test**

Run: `pnpm vitest run tests/unit/public-copy.test.ts`

Expected: FAIL because legal pages do not disclose analytics.

- [ ] **Step 3: Update copy and configure production**

Add precise bilingual disclosure; document that this is a public build variable and production/test must not share a stream. Configure `VITE_GOOGLE_ANALYTICS_ID=G-HFXVL3377J` without printing unrelated environment data.

- [ ] **Step 4: Run full verification**

Run: `pnpm lint && pnpm test && pnpm build && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Deploy and verify**

Deploy with the repository production command. Verify denial causes no GA request, acceptance loads one tag, and GA4 Realtime shows a safe controlled page view/event. Mark `sign_up`, `generation_completed`, and `purchase` as GA4 key events after they appear.

- [ ] **Step 6: Commit**

Commit: `docs: disclose GA4 analytics usage`


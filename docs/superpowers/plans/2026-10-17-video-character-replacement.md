# Video Character Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure, server-controlled video character creation workflow using Kie adapters without exposing keys or allowing unpriced generation.

**Architecture:** Keep the image creator and payment systems unchanged. Add an isolated video domain with versioned pricing, a paid-only video wallet, private assets, idempotent jobs/outbox/inbox, and a Kie adapter behind feature flags. The existing responsive creator UI calls only server functions and renders persisted job state.

**Tech Stack:** React 19, TanStack Start, TypeScript, Zod, Drizzle ORM, Cloudflare D1/R2, Vitest.

**Spec:** `产品方案/VIDEO_CHARACTER_REPLACEMENT_CODEX_PRD_V1.md`

## Global Constraints

- Kie API key and webhook HMAC key are server-only and default-disabled.
- No promotional or registration credit can fund video generation.
- All financial values use integer video credit units (0.1 visible credit).
- Only authenticated, email-verified users may upload, quote, or generate.
- Browser input never supplies an upstream URL, final price, or server prompt.
- Provider dispatch is disabled unless both feature/send flags and explicit live-test flag are enabled.
- Templates default disabled until the operator records commercial authorization.
- Preserve existing website styling and mobile behavior.

## Review Focus

- A modified browser quote, model, resolution, or template ID cannot change the held amount.
- An asset owned by another user, an unsupported/malformed image, or a URL-like asset ID cannot reach the provider.
- Duplicate idempotency keys, duplicate callbacks, and callback replays cannot double-hold, double-capture, or double-refund.
- A timeout after starting createTask is REVIEW_REQUIRED and never automatically resent.
- Missing risk/budget/configuration data fails closed before any provider request.

### Task 1: Domain contracts and secure pricing

**Files:**
- Create: `src/lib/video-creator/contracts.ts`
- Create: `src/lib/video-creator/pricing.ts`
- Create: `src/lib/video-creator/security.ts`
- Test: `tests/unit/video-creator-pricing.test.ts`
- Test: `tests/unit/video-creator-webhook.test.ts`

**Interfaces:**
- Produces `quoteVideoCredits`, `assertVideoFeatureEnabled`, `verifyKieWebhookSignature` for API and worker layers.

- [ ] Write failing pricing and HMAC tests for both models, 480p/720p, disabled 580p, and stale signatures.
- [ ] Run focused tests and confirm expected missing-module failure.
- [ ] Implement pure integer price calculation and Web Crypto HMAC verification.
- [ ] Run focused tests to green.

### Task 2: D1 schema and persisted workflow boundaries

**Files:**
- Create: `src/db/video-creator.schema.ts`
- Create: `src/db/migrations/0007_video_creator.sql`
- Modify: `src/db/schema.ts`
- Test: `tests/unit/db/video-creator-migration.test.ts`

**Interfaces:**
- Produces `videoTemplates`, `videoAssets`, `videoQuotes`, `videoJobs`, `videoCreditAccounts`, `videoCreditLedger`, `videoDispatchOutbox`, `videoWebhookInbox`, and `videoOutputs`.

- [ ] Write migration tests that assert unique idempotency/ledger/inbox constraints and zero-default paid balance.
- [ ] Run the migration test and confirm expected missing migration failure.
- [ ] Add additive schema and migration; no update/delete of existing tables.
- [ ] Run focused migration tests to green.

### Task 3: Provider and job-state core

**Files:**
- Create: `src/lib/video-creator/provider.ts`
- Create: `src/lib/video-creator/job-state.ts`
- Create: `src/lib/video-creator/templates.server.ts`
- Test: `tests/unit/video-creator-provider.test.ts`
- Test: `tests/unit/video-creator-job-state.test.ts`

**Interfaces:**
- Produces `KieVideoProvider`, `MockVideoProvider`, model-specific request serializers, and settled-state transitions.

- [ ] Write failing tests for trusted request serialization, result parsing, unknown state handling, and no retry after uncertain dispatch.
- [ ] Run focused tests and confirm expected failure.
- [ ] Implement adapters without a client-callable key path.
- [ ] Run focused tests to green.

### Task 4: Authenticated API, wallet holds, and private assets

**Files:**
- Create: `src/api/video-creator.ts`
- Create: `src/lib/video-creator/validation.ts`
- Modify: `src/env/server.ts`
- Modify: `src/routes/api/storage/file.ts`
- Test: `tests/unit/video-creator-validation.test.ts`
- Test: `tests/unit/video-creator-api-contract.test.ts`

**Interfaces:**
- Produces upload, quote, generate, job-list, and deletion server functions.

- [ ] Write failing contract tests for authorization, file metadata, quote expiration, consent, and no-promo paid balance.
- [ ] Run focused tests and confirm expected failure.
- [ ] Implement server-only validation and transactional persistence boundaries, returning no upstream secret or trusted URL.
- [ ] Run focused tests to green.

### Task 5: Webhook, dispatcher, and settlement

**Files:**
- Create: `src/routes/api/webhooks/kie.ts`
- Create: `src/lib/video-creator/dispatcher.server.ts`
- Create: `src/lib/video-creator/settlement.server.ts`
- Test: `tests/unit/video-creator-webhook-route.test.ts`
- Test: `tests/unit/video-creator-settlement.test.ts`

**Interfaces:**
- Consumes Task 1 signature verifier and Task 2 tables.
- Produces verified inbox insertion, authoritative record lookup, private result transfer boundary, capture/release ledger events.

- [ ] Write failing tests for invalid/replayed signature, duplicate event, fail refund, success capture, and unknown state review.
- [ ] Run focused tests and confirm expected failure.
- [ ] Implement fail-closed route and manually-triggerable dispatcher; no real dispatch unless all live flags are true.
- [ ] Run focused tests to green.

### Task 6: Replace browser mock with authenticated creator flow

**Files:**
- Modify: `src/components/blocks/bulin47-video-creator.tsx`
- Modify: `src/lib/video-creator/ui-state.ts`
- Modify: `src/lib/video-creator/templates.ts`
- Test: `tests/unit/video-creator-ui-state.test.ts`
- Modify: `tests/e2e/TEST-CATALOG.md`

**Interfaces:**
- Consumes Task 4 server functions and public template/capability response.

- [ ] Write failing UI-state test for only accepted authorization + uploaded asset enabling submission.
- [ ] Run focused test and confirm expected failure.
- [ ] Connect existing responsive UI to APIs, display quote/job state, remove unsupported models and misleading copy.
- [ ] Run focused tests and full unit suite.

### Task 7: Documentation, operator runbook, and final verification

**Files:**
- Create: `docs/kie-validation-notes.md`
- Create: `docs/video-character-replacement-operator-runbook.md`
- Modify: `docs/video-character-replace-implementation-audit.md`

- [ ] Document flags, webhook URL, strict rollout, outage/hold handling, and rollback.
- [ ] Run locale parity, lint, unit tests, typecheck, and production build.
- [ ] Record real Kie verification as not performed unless a provided staging key and legal seed asset permit it.

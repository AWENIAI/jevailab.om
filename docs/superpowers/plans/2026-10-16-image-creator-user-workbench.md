# Image Creator User Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage creator card with a responsive, private image-creation workbench backed by server-authoritative templates, moderation boundaries, quotes, jobs, and history.

**Architecture:** Keep browser state limited to public template data, an editing draft, quote IDs, and job IDs. Put template private prompts, moderation, pricing, R2 keys, ownership checks, and Kie calls behind server-only repositories and adapters. Persist durable user-facing job state in D1 and deliver only moderated private outputs.

**Tech Stack:** React 19, TanStack Start server functions, TypeScript, Drizzle ORM + Cloudflare D1, R2, Vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-10-16-image-creator-user-workbench-design.md`

## Global Constraints

- Keep the existing official dark/orange website style; do not copy the reference image palette.
- Desktop has three columns at >=1280px, then two columns and one-column mobile without losing actions.
- Template cards are 3:4; generated image ratio is independent.
- Never send private template prompts, R2 keys, provider payloads, or moderation secrets to the client.
- Support one JPG/PNG/WebP reference image up to 10 MiB; free mode requires a prompt.
- Production must fail closed when a moderation provider is not configured.
- Do not add template administration, payments, public gallery, commits, or pushes.

## Review Focus

- A free-mode draft with only whitespace must be rejected before quote or job creation.
- A template that forbids a reference image must reject that image even when the browser bypasses UI controls.
- A stale quote, duplicate idempotency key, or insufficient wallet must never double-charge credits.
- An image owned by another user must never be returned, downloaded, or deleted.
- A production generation request without moderation configuration must be blocked before any provider call.

### Task 1: Server-only image creator domain

**Files:**
- Create: `src/lib/image-creator/types.ts`
- Create: `src/lib/image-creator/templates.server.ts`
- Create: `src/lib/image-creator/validation.ts`
- Test: `tests/unit/image-creator-validation.test.ts`

**Interfaces:**
- Produces `PublicImageTemplate`, `ImageCreatorDraft`, `validateImageCreatorDraft`, `toPublicImageTemplate`, and server-only template seeds.

- [ ] Write failing tests for whitespace free prompts, reference-image policy, accepted modes/ratios/counts, and prompt leakage prevention.
- [ ] Run the test file and verify each assertion fails because the domain module does not exist.
- [ ] Implement the smallest server-only template mapping and draft validator needed to satisfy the tests.
- [ ] Run the test file and verify it passes.

### Task 2: D1 persistence schema and creator repositories

**Files:**
- Modify: `src/db/app.schema.ts`
- Create: `src/db/image-creator.schema.ts`
- Create: `src/db/migrations/0006_image_creator.sql`
- Create: `src/lib/image-creator/repository.ts`
- Test: `tests/unit/image-creator-pricing.test.ts`

**Interfaces:**
- Consumes Task 1 draft/template types.
- Produces schema tables for assets, wallets, ledger, quotes, jobs and outputs plus price/quote hash helpers.

- [ ] Write failing pricing tests for 1K/2K server configuration and deterministic draft fingerprints.
- [ ] Run the tests and verify they fail because the helpers do not exist.
- [ ] Add only additive D1 schema/migration and repository helpers; use integer credit values and text IDs.
- [ ] Run pricing tests and TypeScript checking for the new schema.

### Task 3: Moderation and provider adapters

**Files:**
- Create: `src/lib/image-creator/moderation.server.ts`
- Create: `src/lib/image-creator/provider.server.ts`
- Modify: `src/env/server.ts`
- Test: `tests/unit/image-creator-moderation.test.ts`

**Interfaces:**
- Consumes Task 1 template and Task 2 job types.
- Produces `ModerationProvider.review`, production fail-closed resolver, development-only explicit mock resolver, and `ImageGenerationProvider` interface.

- [ ] Write failing tests for no provider in production and explicit development mock behavior.
- [ ] Run the tests and verify they fail because the resolver does not exist.
- [ ] Implement server-only moderation/provider contracts without putting a key or supplier in browser code.
- [ ] Run the tests and verify they pass.

### Task 4: Authenticated creator server functions

**Files:**
- Create: `src/api/image-creator.ts`
- Modify: `src/api/ai.ts`
- Modify: `src/api/user-files.ts`
- Test: `tests/unit/image-creator-requests.test.ts`

**Interfaces:**
- Consumes Tasks 1–3.
- Produces public template/capability/policy reads; authenticated upload, quote, generation, status, history, deletion, and private download server functions.

- [ ] Write failing tests for draft-to-quote validation and policy/ownership gates using injected repository/provider boundaries.
- [ ] Run the tests and verify they fail before endpoint orchestration exists.
- [ ] Implement server functions that validate server-side, reserve/settle through repository boundaries, and keep Kie ticket handling server-only.
- [ ] Run unit tests and `pnpm typecheck`.

### Task 5: Responsive official-style workbench UI

**Files:**
- Replace: `src/components/blocks/ai-image-creator.tsx`
- Create: `src/components/blocks/image-creator/template-browser.tsx`
- Create: `src/components/blocks/image-creator/creator-form.tsx`
- Create: `src/components/blocks/image-creator/generation-preview.tsx`
- Create: `src/components/blocks/image-creator/generation-history.tsx`
- Modify: `src/components/blocks/hero.tsx`
- Modify: `project.inlang/messages/en.json`
- Modify: `project.inlang/messages/zh.json`
- Test: `tests/unit/image-creator-ui-state.test.ts`

**Interfaces:**
- Consumes public DTOs and server functions from Task 4.
- Produces desktop three-column, tablet two-column, and mobile single-column creator UX.

- [ ] Write failing UI-state tests for disabled submit states, debounced quote invalidation, and mobile-safe draft selection.
- [ ] Run the tests and verify expected failures.
- [ ] Implement focused components with existing UI primitives, responsive Tailwind classes, accessible labels, and no private fields.
- [ ] Run UI tests, `pnpm typecheck`, and view the homepage at desktop and mobile sizes.

### Task 6: Integration hardening and verification

**Files:**
- Modify: `tests/unit/kie-image.test.ts`
- Modify: `docs/superpowers/specs/2026-10-16-image-creator-user-workbench-design.md` only if implementation requires a documented ruling.

**Interfaces:**
- Consumes Tasks 1–5.
- Produces verified direct-provider integration, safe failure copy, and end-to-end test evidence.

- [ ] Write a failing test proving provider calls cannot start when moderation is unavailable.
- [ ] Run it and verify the expected failure.
- [ ] Wire the existing Kie adapter behind Task 3’s interface and preserve private output handling.
- [ ] Run targeted tests, `pnpm typecheck`, and a production-style build if no live dev process holds output files.

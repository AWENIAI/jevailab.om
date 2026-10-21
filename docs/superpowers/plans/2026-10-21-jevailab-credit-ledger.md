# jevailab 积分账户与明细 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Waffo 已支付订单可靠发放图片积分，按月刷新订阅积分，并让登录用户能查看完整、准确的积分明细。

**Architecture:** 在现有 `image_wallets` / `image_credit_ledger` 总额投影之下增加可独立失效的积分批次、任务预留分配和年付月度发放计划。Waffo 已验签 Webhook 只负责把支付事实交给积分服务；Cloudflare Cron 负责按月发放年付积分、失效未结转订阅积分和补偿卡住的任务。图片创作 Web 工作台改接现有私有任务管道，统一由服务端预留、结算与返还。

**Tech Stack:** TanStack Start、React 19、TypeScript、Cloudflare Workers Cron、D1/SQLite、Drizzle ORM、Waffo Pancake SDK、KIE 服务端适配器、Vitest、Playwright、Paraglide。

**Spec:** `docs/superpowers/specs/2026-10-21-jevailab-credit-ledger-design.md`

## Global Constraints

- 付款完成跳转页、浏览器参数与客户端金额不得增加积分；仅已验签且环境匹配的 Waffo Webhook 可入账。
- 入门包发放 66 积分，有效期 12 个月；月付每次成功扣款发放 180 积分；年付每月发放 240 积分，共 12 期。
- 月付与年付积分在各自周期结束时失效，不结转；年付不能一次性发放 2,880 积分。
- 生成只冻结积分，KIE 确认成功才消耗；失败、拒绝、超时和未产出必须返还未消耗积分。
- 退款仅在 Waffo `refund.succeeded` 后生效；部分退款按比例回收未使用积分，年付取消未来未发放计划。
- 所有账本记录追加且有唯一幂等键；用户只能读取自己的余额、任务和流水。
- 全部新增用户文案必须提供中文和英文，不记录或暴露任何支付、KIE、Cloudflare 密钥。

## Review Focus

- 同一 Waffo `eventId` 被重复投递时，付款、积分批次和流水各只写入一次；在任务 3 的 Webhook 重放测试覆盖。
- 入门包与订阅积分同时存在时，订阅失效只能扣除订阅批次；在任务 2 的批次失效测试覆盖。
- 年付计划在同一 Cron 周期内重复执行时，当月 240 积分不会重复到账；在任务 2 的定时发放幂等测试覆盖。
- KIE 创建失败、回调失败和部分成功均只能结算一次且余额守恒；在任务 4 的预留/结算测试覆盖。
- 部分退款的金额与累计使用积分冲突时，账户必须进入受限状态而非产生负数或错误全额扣回；在任务 3 的退款测试覆盖。

---

### Task 1: 扩展 D1 积分批次与预留数据模型

**Files:**
- Modify: `src/db/image-creator.schema.ts`
- Modify: `src/db/schema.ts`
- Create: `src/db/migrations/0011_image_credit_lots.sql`
- Modify: `src/db/migrations/meta/_journal.json`
- Create/Modify: `src/db/migrations/meta/0011_snapshot.json`
- Test: `tests/unit/db/image-credit-lots-migration.test.ts`

**Interfaces:**
- Produces: `imageCreditLots`, `imageCreditReservations`, `imageCreditSchedules` Drizzle tables and their inferred select/insert types.
- Consumes: existing `user`, `payment`, `imageGenerationJobs`, `imageWallets`, `imageCreditLedger` tables.

- [ ] **Step 1: Write the failing migration/schema test**

Assert that the migration creates all three tables, foreign keys, the unique event keys and indexes needed by user history and due schedules; assert the schema exports the same table names.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `pnpm exec vitest run tests/unit/db/image-credit-lots-migration.test.ts`  
Expected: FAIL because the tables and migration do not exist.

- [ ] **Step 3: Add batch, reservation and scheduled-grant tables**

Define the following rows in `src/db/image-creator.schema.ts`:

```ts
imageCreditLots: { id, userId, sourceType, sourcePaymentId, sourceEventKey, planKey, issuedCredits, availableCredits, reservedCredits, availableAt, expiresAt, status, createdAt, updatedAt }
imageCreditReservations: { id, jobId, lotId, reservedCredits, capturedCredits, releasedCredits, status, createdAt, settledAt }
imageCreditSchedules: { id, userId, subscriptionId, sourcePaymentId, eventKey, planKey, credits, scheduledAt, state, createdAt, grantedAt, canceledAt }
```

Add SQLite D1 migration SQL and Drizzle metadata by running the project’s migration generator rather than manually inventing snapshot data. Preserve every existing table and migration.

- [ ] **Step 4: Run the targeted test and typecheck**

Run: `pnpm exec vitest run tests/unit/db/image-credit-lots-migration.test.ts && pnpm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db tests/unit/db/image-credit-lots-migration.test.ts
git commit -m "feat: add image credit batch schema"
```

### Task 2: 实现批次化积分服务与定时维护

**Files:**
- Create: `src/lib/image-creator/credits.server.ts`
- Modify: `src/lib/miniprogram/wallet.server.ts`
- Modify: `src/lib/miniprogram/image-jobs.server.ts`
- Create: `src/lib/image-creator/credit-maintenance.server.ts`
- Modify: `src/server.ts`
- Test: `tests/unit/image-credit-service.test.ts`
- Test: `tests/unit/image-credit-maintenance.test.ts`

**Interfaces:**
- Consumes: Task 1 table definitions; existing image quote/job state and D1 `batch` API.
- Produces:
  - `grantCreditsFromPayment(input): Promise<CreditGrantResult>`
  - `scheduleAnnualCredits(input): Promise<void>`
  - `reserveCreditsForGeneration(input): Promise<ReservationResult>`
  - `settleGenerationCredits(input): Promise<SettlementResult | null>`
  - `getCreditSummary(userId)` and `listCreditTransactions(input)`
  - `runCreditMaintenance(now): Promise<CreditMaintenanceOutcome>`.

- [ ] **Step 1: Write failing service tests**

Cover 66-credit starter grant with 12-month expiry; 180-credit monthly grant that expires at period end; 12 annual schedules with only the first 240 granted immediately; FIFO consumption that uses expiring lots before starter lots; a failed job releasing the entire reservation; and a partial job capturing only delivered output credits.

- [ ] **Step 2: Run service tests to verify they fail**

Run: `pnpm exec vitest run tests/unit/image-credit-service.test.ts tests/unit/image-credit-maintenance.test.ts`  
Expected: FAIL because the new service does not exist.

- [ ] **Step 3: Implement atomic lot-aware grant, reserve and settle operations**

Use `image_wallets` as the aggregate projection, but select active credit lots in earliest-expiry-first order. Create one reservation row per selected lot, then append an `image_credit_ledger` event using a unique `eventKey`. Every externally triggered action must accept a stable event key and return the prior result on a replay.

Replace `reserveGenerationCredits`, `releaseGenerationReservation`, and `settleImageGenerationCredits` callers so jobs use the new service rather than an aggregate-only reservation. Keep the public mini-program wallet DTO unchanged where possible.

- [ ] **Step 4: Implement scheduled grants and expiry maintenance**

`runCreditMaintenance(now)` must grant due annual schedules once, expire remaining monthly/annual lots at their period end, cancel no-longer-valid schedules, and call existing image reconciliation without blocking it. Add it to the existing Worker `scheduled` fan-out in `src/server.ts`; the current two-minute trigger remains sufficient.

- [ ] **Step 5: Run targeted tests and typecheck**

Run: `pnpm exec vitest run tests/unit/image-credit-service.test.ts tests/unit/image-credit-maintenance.test.ts tests/unit/miniprogram-wallet-sql.test.ts && pnpm run typecheck`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/image-creator src/lib/miniprogram src/server.ts tests/unit
git commit -m "feat: add scheduled image credit ledger"
```

### Task 3: 将 Waffo Webhook 与积分、部分退款连接

**Files:**
- Create: `src/lib/image-creator/credit-plan.ts`
- Modify: `src/payment/provider/waffo.ts`
- Modify: `src/routes/api/webhooks/waffo.ts` (only if dependency injection needs expansion)
- Test: `tests/unit/payment/waffo-provider.test.ts`
- Test: `tests/unit/payment/waffo-credit-webhook.test.ts`

**Interfaces:**
- Consumes: Task 2 `grantCreditsFromPayment`, `scheduleAnnualCredits`, and refund/restriction service operations.
- Produces: `resolveImageCreditPlan(priceId): ImageCreditPlan | null` and Waffo handlers that add credit effects only after verified events.

- [ ] **Step 1: Write failing Waffo-to-credit tests**

Assert: starter `order.completed` grants exactly 66 once; monthly `subscription.activated` grants the first 180; each `subscription.payment_succeeded` grants one later 180 by payment ID; annual activation grants only 240 and creates 11 future schedules; an event replay grants nothing extra; partial refund revokes only the proportional unspent lots; refund of already-used credits creates a restricted record; a failed refund does nothing.

- [ ] **Step 2: Run the Waffo tests to verify they fail**

Run: `pnpm exec vitest run tests/unit/payment/waffo-provider.test.ts tests/unit/payment/waffo-credit-webhook.test.ts`  
Expected: FAIL because the provider has no credit grant or partial-refund logic.

- [ ] **Step 3: Add plan mapping and idempotent payment handling**

Map configured `lifetime`, `proMonthly`, and `proYearly` price IDs to the fixed product rules without trusting the checkout request. Preserve existing payment upsert behavior, then invoke the credit service with `waffo:${event.eventId}` after the database payment record is confirmed.

Use `subscription.payment_succeeded` for recurring monthly credit issuance; use subscription activation only for its initial billing period. For annual activation, make the schedule first issue immediately and schedule the remaining eleven months. Do not grant from redirect-page polling.

- [ ] **Step 4: Replace full-refund-only behavior**

On `refund.succeeded`, read the signed refund amount and linked payment/order IDs; apply a proportional revocation to unspent lots, cancel future annual schedules, and only set payment access false for a full refund. Retain `refund.failed` as logging only. Never use a refund request as proof of an approved refund.

- [ ] **Step 5: Run targeted tests**

Run: `pnpm exec vitest run tests/unit/payment/waffo-provider.test.ts tests/unit/payment/waffo-credit-webhook.test.ts tests/unit/payment/waffo-webhook-route.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/payment src/routes/api/webhooks src/lib/image-creator tests/unit/payment
git commit -m "feat: grant image credits from Waffo payments"
```

### Task 4: 让网页图片工作台使用服务器端积分任务流程

**Files:**
- Modify: `src/api/image-creator.ts`
- Modify: `src/components/blocks/ai-image-creator.tsx`
- Modify: `src/lib/miniprogram/image-jobs.server.ts` (only for shared DTO helpers)
- Test: `tests/unit/image-creator-credit-flow.test.ts`
- Test: `tests/e2e/specs/image-creator-draft.spec.ts`

**Interfaces:**
- Consumes: Task 2 quote/reservation/settlement operations and existing private image dispatch/reconciliation pipeline.
- Produces: authenticated web server functions returning persisted quote and job DTOs, with wallet values and job status instead of a browser-controlled KIE ticket.

- [ ] **Step 1: Write failing server-function and UI tests**

Assert that the web quote returns persisted `quoteId` and wallet estimate, start-generation reserves the quoted credits once using an idempotency key, an insufficient balance disables creation with a clear message, and the client polls its own job status rather than querying KIE directly.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `pnpm exec vitest run tests/unit/image-creator-credit-flow.test.ts && pnpm exec playwright test tests/e2e/specs/image-creator-draft.spec.ts`  
Expected: FAIL because the web workbench currently calls KIE directly and does not persist a wallet-backed job.

- [ ] **Step 3: Delegate web quote/start/status to the shared job service**

Change `quoteImageCreatorDraft` and `startImageCreatorGeneration` to use the same persisted quote and generation service used by the private mini-program API. Add a user-owned generation status function. Do not expose KIE tickets or supplier error payloads to the browser.

- [ ] **Step 4: Update workbench polling and balance states**

Replace ticket polling with job polling, show available/frozen amounts from the server DTO, preserve the existing upload, draft and login-resume behavior, and make failed jobs visibly state that credits were returned. Do not change unrelated registration form code.

- [ ] **Step 5: Run targeted tests and build**

Run: `pnpm exec vitest run tests/unit/image-creator-credit-flow.test.ts tests/unit/image-creator-pricing.test.ts && pnpm exec playwright test tests/e2e/specs/image-creator-draft.spec.ts && pnpm run build`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/api/image-creator.ts src/components/blocks/ai-image-creator.tsx src/lib/miniprogram tests/unit tests/e2e/specs
git commit -m "feat: settle web image jobs through credit wallet"
```

### Task 5: 新增积分明细设置页面与双语导航

**Files:**
- Create: `src/api/image-credits.ts`
- Create: `src/routes/settings/credits.tsx`
- Create: `src/components/settings/credits/credits-page-content.tsx`
- Modify: `src/config/sidebar-config.ts`
- Modify: `src/lib/routes.ts`
- Modify: `project.inlang/messages/zh.json`
- Modify: `project.inlang/messages/en.json`
- Modify: `src/content/launch-pricing.ts`
- Test: `tests/unit/sidebar-navigation.test.ts`
- Test: `tests/unit/launch-pricing-content.test.ts`
- Test: `tests/e2e/specs/credits.spec.ts`

**Interfaces:**
- Consumes: Task 2 `getCreditSummary` and paginated `listCreditTransactions`.
- Produces: protected `/settings/credits` page, `getImageCreditSummary` and `listImageCreditTransactions` server functions, and translated menu/copy keys.

- [ ] **Step 1: Write failing navigation, content and access tests**

Assert that the sidebar has a visible localized credits item when payments are enabled, the annual plan says it refreshes 240 credits monthly and does not promise an upfront 2,880 credit grant, and an unauthenticated visitor is redirected while a signed-in user can see only their own history.

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `pnpm exec vitest run tests/unit/sidebar-navigation.test.ts tests/unit/launch-pricing-content.test.ts && pnpm exec playwright test tests/e2e/specs/credits.spec.ts`  
Expected: FAIL because the route and component do not exist.

- [ ] **Step 3: Add protected route, query functions and credits UI**

Implement cursor/page-size bounded server functions that return only `context.userId` data. Render summary cards for available and frozen credits, a next-grant hint when applicable, a purchase CTA to `Routes.LaunchPricing`, and a filterable transaction table containing time, type, reason, signed amount, balance and safe reference labels.

- [ ] **Step 4: Add navigation, translations and corrected annual copy**

Place credits next to Billing in the settings menu, add all Chinese/English Paraglide keys, run locale compilation, and change both language variants of the annual pricing card to “240 credits/month, refreshed monthly; no rollover.”

- [ ] **Step 5: Run page tests, locale compile, typecheck and build**

Run: `pnpm locale:compile && pnpm exec vitest run tests/unit/sidebar-navigation.test.ts tests/unit/launch-pricing-content.test.ts && pnpm exec playwright test tests/e2e/specs/credits.spec.ts && pnpm run typecheck && pnpm run build`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/api/image-credits.ts src/routes/settings/credits.tsx src/components/settings/credits src/config/sidebar-config.ts src/lib/routes.ts src/content/launch-pricing.ts project.inlang/messages tests
git commit -m "feat: add image credit history page"
```

### Task 6: 迁移、回归与部署前验收

**Files:**
- Modify: `tests/e2e/TEST-CATALOG.md`
- Modify: `README.md` or existing operator documentation only if a credit-operations section already exists

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: a reproducible checklist for sandbox payment, recurring issuance, job failure return, partial refund and production D1 migration.

- [ ] **Step 1: Add the end-to-end acceptance catalogue entries**

Document test-mode starter, month, annual, duplicate webhook, failed job, partial job, partial refund and user-isolation scenarios without embedding real credentials or production customer data.

- [ ] **Step 2: Run full automated verification**

Run: `pnpm test && pnpm run typecheck && pnpm run build`  
Expected: PASS. Run relevant Playwright credit/payment specs separately if the full suite requires external sandbox credentials.

- [ ] **Step 3: Apply migrations only after backup/readiness verification**

Run: `pnpm db:migrate:local` first. For production, inspect migration SQL and run `pnpm db:migrate:remote` only after the user authorizes the D1 production schema change.

- [ ] **Step 4: Test Waffo sandbox before production**

Use Waffo test mode and its documented success card. Verify the signed Webhook writes exactly one payment, lot and ledger record; verify the annual scheduler emits only the due period grant. Do not use a real card or real customer account.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/TEST-CATALOG.md README.md
git commit -m "test: document credit lifecycle acceptance"
```

## Self-Review

- **Spec coverage:** Tasks 1–2 implement batch accounting, scheduled grants, expiration, reservation and settlement; Task 3 handles Waffo grants/refunds; Task 4 connects live creation; Task 5 supplies the user page and localization; Task 6 covers migration and sandbox acceptance.
- **Step scan:** Each task starts with a failing test, names concrete files/interfaces, supplies a focused verification command, and leaves business decisions in the spec rather than vague placeholders.
- **Type consistency:** `imageCreditLots`, `imageCreditReservations`, `imageCreditSchedules` feed the named credit service methods; Waffo, workbench and the credits page consume those exact methods.
- **Review focus:** All five high-risk behaviors named above have an owning task and an explicit test.
- **Proportion:** The plan specifies integration boundaries and testable outcomes without prescribing the implementation bodies.

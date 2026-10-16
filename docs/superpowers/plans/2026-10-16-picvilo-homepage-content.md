# PicVilo AI Homepage Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic SaaS marketing homepage with a responsive PicVilo AI image-creation landing page while retaining the existing Hero and creator workbench behavior.

**Architecture:** Define one typed homepage-content source for Chinese and English copy, capability states, anchors, FAQ entries, and mapped template examples. Compose dedicated presentational sections below the existing Hero/workbench; route all actions only to existing anchors or published routes, and keep video capabilities visibly planned rather than interactive.

**Tech Stack:** TanStack Start, React 19, TypeScript, Tailwind CSS, shadcn/ui, Paraglide localization, Vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-10-16-picvilo-homepage-content-design.md`

## Global Constraints

- Brand the homepage as PicVilo AI through existing localized site configuration; do not hardcode a domain, logo URL, or social account.
- Preserve the existing Hero and AI image creator workbench business logic.
- Keep desktop workbench three-column, tablet adaptive, and mobile vertically stacked without horizontal overflow.
- Show AI video only as `Coming soon`; do not create a task, checkout, route, or false availability state.
- Use existing user-provided gallery assets only as clearly labelled template examples, never as user creations.
- Do not introduce a template management backend, payment price claims, unimplemented tools, user-public galleries, or empty SEO routes.
- Never expose private template prompts, moderation details, user private media, environment variables, or API keys.
- Do not modify generated `src/routeTree.gen.ts`.
- Do not create a commit or push; the existing user-authorized backup automation owns backup commits.

## Review Focus

- A user opens every visible CTA: each must reach an existing anchor/route or be visibly disabled as planned.
- A visitor opens the page on a 390px-wide screen: no primary content, card, chip row, or image may overflow horizontally.
- A search crawler reads the initial HTML: one H1, What Is copy, 3-step instructions, and FAQ answers must be present as real text.
- A visitor sees video content: every entry must communicate that generation is not yet available and must never resemble a usable control.
- A visitor clicks an image example: only a valid mapped template ID may update the workbench; unmapped examples must not select an arbitrary template.

---

### Task 1: Define localized PicVilo homepage content and capability states

**Files:**
- Create: `src/content/picvilo-homepage.ts`
- Create: `tests/unit/picvilo-homepage-content.test.ts`

**Interfaces:**
- Produces: `getPicviloHomepageContent(locale: 'zh' | 'en'): PicviloHomepageContent`
- Produces: `PICVILO_ANCHORS` and `isPlannedVideoFeature(feature: Feature): boolean`
- Consumed by: homepage sections, navigation configuration, metadata updates.

- [ ] **Step 1: Write failing content tests**

Assert that both locales contain one Hero H1, all required section identifiers, twelve FAQ entries, a `comingSoon` video capability, and image examples whose mapped `templateId` belongs to the published template ID set.

- [ ] **Step 2: Run the content test to verify it fails**

Run: `pnpm exec vitest run tests/unit/picvilo-homepage-content.test.ts`  
Expected: FAIL because the content module does not exist.

- [ ] **Step 3: Implement typed homepage content**

Create the content model and zh/en entries from the approved spec. Include only `#create`, `#gallery`, `#about`, `#features`, `#how-it-works`, `#use-cases`, `#photo-tips`, `#tools`, `#pricing`, `#faq`, and `#start-now` anchors. Mark every video item `comingSoon: true`.

- [ ] **Step 4: Run the content test to verify it passes**

Run: `pnpm exec vitest run tests/unit/picvilo-homepage-content.test.ts`  
Expected: PASS.

### Task 2: Build reusable, accessible homepage content sections

**Files:**
- Create: `src/components/blocks/picvilo-homepage-sections.tsx`
- Create: `tests/unit/picvilo-homepage-sections.test.tsx`

**Interfaces:**
- Consumes: `PicviloHomepageContent` from Task 1.
- Produces: `PicviloHomepageSections({ content, onSelectTemplate })`.
- Consumed by: `HomePage` in Task 3.

- [ ] **Step 1: Write failing section tests**

Render the component and assert presence of semantic section headings, visible planned-video labels, disabled video controls, keyboard-operable FAQ controls, and a mapped image-example callback.

- [ ] **Step 2: Run the section test to verify it fails**

Run: `pnpm exec vitest run tests/unit/picvilo-homepage-sections.test.tsx`  
Expected: FAIL because the section component does not exist.

- [ ] **Step 3: Implement presentational sections**

Implement What Is, image showcase, capabilities, three steps, use cases, photo tips, available-tool navigation, pricing explanation, FAQ, and final CTA. Use responsive Tailwind grids, semantic `section` landmarks, `details/summary` or project accordion primitives, lazy-loaded 3:4 example images, and no invented product prices.

- [ ] **Step 4: Run the section test to verify it passes**

Run: `pnpm exec vitest run tests/unit/picvilo-homepage-sections.test.tsx`  
Expected: PASS.

### Task 3: Connect examples to the existing workbench without changing generation logic

**Files:**
- Modify: `src/components/blocks/ai-image-creator.tsx`
- Modify: `src/components/blocks/homepage.tsx`
- Modify: `tests/unit/image-creator-ui-state.test.ts`

**Interfaces:**
- Produces: a browser event or narrowly scoped prop contract that accepts a validated `templateId` and focuses `#create`.
- Consumes: mapped template IDs from Task 1.

- [ ] **Step 1: Write the failing selection test**

Assert that a valid external template selection updates the selected template state, while an unknown template ID leaves the existing selection unchanged.

- [ ] **Step 2: Run the selection test to verify it fails**

Run: `pnpm exec vitest run tests/unit/image-creator-ui-state.test.ts`  
Expected: FAIL because external selection is not handled.

- [ ] **Step 3: Implement the minimal workbench selection bridge**

Use a typed custom event or a small prop boundary so an image example can select a known template and call `scrollIntoView` for `#create`. Do not clear an uploaded reference image and do not modify quote, moderation, storage, login, or generation logic.

- [ ] **Step 4: Recompose the homepage**

Replace the generic logo/cloud, stats, integration, testimonial, newsletter, and generic marketing sequence in `homepage.tsx` with Hero, retained creator workbench, and Task 2 sections in approved order.

- [ ] **Step 5: Run focused tests**

Run: `pnpm exec vitest run tests/unit/image-creator-ui-state.test.ts tests/unit/picvilo-homepage-sections.test.tsx`  
Expected: PASS.

### Task 4: Update localized brand, metadata, and real navigation

**Files:**
- Modify: `project.inlang/messages/zh.json`
- Modify: `project.inlang/messages/en.json`
- Modify: `src/config/navbar-config.ts`
- Modify: `src/config/footer-config.ts`
- Modify: `src/components/blocks/hero.tsx`
- Test: `tests/unit/picvilo-homepage-content.test.ts`

**Interfaces:**
- Consumes: content/anchor definitions from Task 1.
- Produces: PicVilo site name, localized title/description, and only-valid anchor/route navigation.

- [ ] **Step 1: Write failing metadata and navigation assertions**

Assert localized site name/title/description contain PicVilo AI and image-creation terms; assert navigation targets are either known anchors or existing routes, and planned video links have no active route target.

- [ ] **Step 2: Run the assertions to verify they fail**

Run: `pnpm exec vitest run tests/unit/picvilo-homepage-content.test.ts`  
Expected: FAIL because TanStarter metadata and generic menu links remain.

- [ ] **Step 3: Implement brand and navigation changes**

Update existing locale keys, homepage Hero copy/CTAs, navbar anchors, and footer link groups. Retain all legal pages that already exist; use non-interactive planned labels for unavailable video entries.

- [ ] **Step 4: Run metadata/navigation tests**

Run: `pnpm exec vitest run tests/unit/picvilo-homepage-content.test.ts`  
Expected: PASS.

### Task 5: Validate desktop and mobile rendering

**Files:**
- Modify only if verification reveals a concrete responsive, typography, or accessibility defect.
- Test: existing unit suite and browser screenshots.

**Interfaces:**
- Consumes: complete homepage from Tasks 1–4.
- Produces: verified desktop/tablet/mobile landing page behavior.

- [ ] **Step 1: Run code-quality checks**

Run: `pnpm exec biome check src/content/picvilo-homepage.ts src/components/blocks/picvilo-homepage-sections.tsx src/components/blocks/homepage.tsx src/components/blocks/hero.tsx && pnpm typecheck && pnpm exec vitest run`  
Expected: no Biome errors, type-check exit 0, all Vitest tests pass.

- [ ] **Step 2: Verify desktop, tablet, and mobile in a browser**

Capture `1440px`, `768px`, and `390px` screenshots of `/`. Verify exactly one H1, all listed anchors, retained workbench, 3:4 example crops, no mobile horizontal overflow, disabled video state, and a working mapped-template example click.

- [ ] **Step 3: Record and fix visual mismatches**

Compare the render to the supplied desktop/mobile reference images for section order, official dark/orange visual system, typography hierarchy, spacing, and media framing. Apply only concrete responsive/visual fixes and repeat the relevant screenshot verification.

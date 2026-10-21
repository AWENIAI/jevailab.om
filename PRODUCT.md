# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary audience:** creators and teams who want a focused workspace for making AI images from photos, templates, and ideas. They value private-by-default workflows, clear controls, and predictable creation costs.

## Product Purpose

jevailab is an AI image creation workspace. Success means a user can choose a template, optionally upload a reference photo, describe an idea, review the credit quote, and receive a private image without unnecessary setup.

## Positioning

“Create More with AI, Keep Your Workflow Private.” The product is centered on template-led image creation, optional reference photos, private results, and transparent credit estimates before generation.

## Operating Context

- User workflow: open jevailab.com, choose a template, add an optional reference image, describe the idea, review the quote, and create a private result.
- Supporting surface: jevailab.com and support@jevailab.com.
- Quality workflow: local-first Playwright E2E under `tests/e2e/` with the acceptance checklist in TEST-CATALOG.md; `pnpm check` runs complete local validation; `pnpm check:production` separately runs production-mode Worker smoke tests in local preview. Neither command deploys or tests a live site. The E2E helper API only works in local Vite DEV with `MODE=e2e` and a matching secret.
- The product is deployed on Cloudflare Workers with the existing application bindings and provider integrations.

## Capabilities and Constraints

Confirmed capabilities:

- Auth: Better Auth — email/password, Google OAuth, API keys, admin roles, user banning, delete account.
- Payments: Stripe, Creem, or Waffo selected by `VITE_PAYMENT_PROVIDER`; plans Free, Pro ($9.90/month or $99/year), Lifetime ($199 one-time); checkout, billing portal, and webhooks.
- Mail: Cloudflare Email Service behind a provider abstraction, with React Email templates.
- Newsletter: Cloudflare D1 or Beehiiv; waitlist page; auto-subscribe after sign-up.
- Storage: Cloudflare R2 user files with configured allowed types and size limits.
- AI playground: Cloudflare Workers AI (REST) and fal.ai — text summarization, translation, tagline generation, text-to-speech, image captioning, and image generation/editing.
- Blog: Content Collections (markdown), English/Chinese content, pagination.
- Dashboard and admin: dashboard stats and charts; settings for profile, security, API keys, files, billing, payment, and notifications; admin user management with a detail drawer.
- i18n: Paraglide with English and Chinese, URL-based locale strategy.
- SEO: sitemap, robots.txt, web manifest, and OG image.
- Extras: Cloudflare KV cache, Discord/Feishu webhook notifications, Crisp chat, and Plausible/GA/Umami/Clarity analytics via env vars.

Confirmed constraints:

- Runs on the Cloudflare Workers runtime: no Node.js-specific APIs. Bindings are `DB` (D1), `BUCKET` (R2), and `CACHE` (KV); schemas use Drizzle.
- Client env vars use the `VITE_` prefix (build-time); server env is validated at runtime with Zod via `@t3-oss/env-core`.
- File-based routing under `src/routes/`; `src/routeTree.gen.ts` is auto-generated and must never be edited.
- The LICENSE file retains the upstream license terms and should not be rewritten as product marketing copy.
- Biome-enforced style: 2-space indent, 80-char line width, single quotes, semicolons; linting excludes `src/components/ui/`, `src/components/data-table/`, `src/db/`, and generated route tree.

## Brand Commitments

- Name: jevailab. Tagline: “Create More with AI, Keep Your Workflow Private.”
- Public surface: jevailab.com and support@jevailab.com.
- Identity commitments recorded in `docs/design.md`: brand personality Modern / Professional / Technical; voice direct, confident, and understated; dark-first, ultra-minimal achromatic visual system with a single amber accent and Bricolage Grotesque; design references Linear, Vercel, Raycast, and Stripe; explicitly avoids playful/cartoonish, enterprise-heavy, cluttered, and generic Bootstrap-style designs.
- Asset names are binding: `/logo.png`, `/logo-dark.png`, `/og.png`, plus favicon set in `public/`.

## Evidence on Hand

- README.md — positioning, author, links, community, language policy for issues.
- docs/design.md — the recorded visual world (dark-first achromatic minimalism, typography, shape, references, anti-references, accessibility principles).
- docs/ — module docs for ai, auth, cache, db, design, env, locale, mail, newsletter, notification, payment, storage.
- src/config/website.ts — feature flags, providers, pricing, metadata, social links.
- project.inlang/messages/en.json and zh.json — full site copy in English and Chinese.
- content/ — blog posts, changelog, and legal pages in en/zh.
- tests/e2e/TEST-CATALOG.md and specs — the acceptance journeys and E2E coverage.
- public/ — logo.png, logo-dark.png, og.png, jevailab.png, favicon set.
- LICENSE — the upstream license terms.

Absent: no customer testimonials, case studies, revenue figures, or benchmark data exist in the repository. Homepage testimonial/stats copy is demo content and must not be treated as real evidence.

## Product Principles

1. **Time-to-revenue is the metric.** Every built-in capability exists to shorten the path from idea to a paid, deployed SaaS.
2. **One deployable Worker.** The full stack should stay within Cloudflare Workers plus D1/R2/KV; avoid patterns that demand heavier infrastructure.
3. **Production-ready defaults.** Auth, payments, email, storage, admin, SEO, and i18n work out of the box, with local-first E2E verification before release.
4. **Owned, not locked in.** Provider abstractions and standard tools (Drizzle, Better Auth, TanStack, shadcn/ui) let buyers swap pieces and keep ownership of their product.
5. **Developer-grade clarity.** Code, docs, and UX speak precisely to technical users — no fluff, no unnecessary abstraction.

## Accessibility & Inclusion

- docs/design.md commits to WCAG 2.1 AA, visible focus indicators, keyboard navigability, and sufficient contrast in both themes.
- The UI ships dark, light, and system modes (dark-first) and is localized in English and Chinese via Paraglide.
- No other product-specific accessibility requirements have been established.




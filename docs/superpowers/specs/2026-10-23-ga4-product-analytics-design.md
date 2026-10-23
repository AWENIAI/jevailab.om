# GA4 Product Analytics Design

## Status

Approved design on 2026-10-23. This document defines the implementation
scope for production analytics on `jevailab.com`.

## Goal

Use one Google Analytics 4 property to understand anonymous aggregate visitor
behaviour and the product funnel without collecting prompts, uploaded media,
account identifiers, or payment data.

The production web data stream measurement ID is `G-HFXVL3377J`.

## Decision

Use GA4 for both automatic web measurement and a small, explicit set of
product events. Do not add a first-party reporting dashboard, Microsoft
Clarity, session recording, or another analytics provider.

## Automatic GA4 measurement

The existing production-only Google tag remains the single loaded GA script.
GA4 Enhanced Measurement is enabled in the GA4 data stream for standard page
views, scrolls, outbound clicks, and file downloads.

A router-aware client component sends a `page_view` on each TanStack Router
navigation so internal SPA transitions are measured as pages. Each page view
uses the canonical path without query values or URL fragments. GA4 provides
aggregate country/region, acquisition source, landing page, exit page, and
engagement-time reporting from these page views.

## Product event contract

All custom events pass through one browser-side `trackAnalyticsEvent` helper.
It accepts only the following event names and fields:

| Event | When emitted | Allowed fields |
| --- | --- | --- |
| `sign_up` | A user registration succeeds | `method` |
| `login` | A user login succeeds | `method` |
| `create_page_view` | The image workspace is displayed | `locale` |
| `template_selected` | A template is selected in the workspace | `template_id`, `template_category`, `locale` |
| `quote_requested` | The server returns an image-generation quote | `mode`, `ratio`, `output_count`, `total_credits`, `locale` |
| `generation_started` | A generation submission is accepted | `mode`, `ratio`, `output_count`, `total_credits`, `locale` |
| `generation_completed` | A generation finishes successfully | `mode`, `ratio`, `output_count`, `locale` |
| `generation_failed` | A generation reaches a failed or rejected state | `failure_stage`, `error_code`, `locale` |
| `image_downloaded` | A user downloads a generated image | `mode`, `ratio`, `locale` |
| `pricing_viewed` | The launch-pricing page is displayed | `locale` |
| `checkout_started` | The selected plan starts checkout | `plan_id`, `billing_interval`, `locale` |
| `purchase` | A confirmed provider payment is displayed to the user | `plan_id`, `billing_interval`, `locale` |

`method` is limited to `email` or `google`; `mode`, `ratio`, plan IDs, and
failure stages are constrained to existing application values. The wrapper
adds `page_path`, `locale`, and a device-category value when they are
available. The event payload is validated before calling `gtag`.

## Data that must never be sent to GA4

- Prompt text, negative prompts, uploaded files, generated-image URLs, or
  template prompt configuration.
- Email address, display name, user ID, session ID, IP address, authentication
  token, API key, or any other persistent identifier.
- Payment transaction/order IDs, checkout URLs, card/billing details, or raw
  monetary values.
- Arbitrary query strings and fragments.

The tracking helper is fail-closed: unrecognised event names or fields are
dropped in development with a warning and never sent in production. Analytics
failures must not affect registration, authentication, image generation,
downloads, or checkout.

## Privacy and consent

The Privacy Policy and Cookie Policy will disclose the use of Google
Analytics, the aggregate measurement purpose, the categories of data sent,
and the user choice mechanism. The implementation will not initialise GA4
until analytics consent is recorded for jurisdictions where consent is
required. Users who decline analytics receive no GA4 tag or custom product
events. The choice is stored as a minimal first-party preference, not sent as
an identifying analytics field.

## Deployment configuration

Set `VITE_GOOGLE_ANALYTICS_ID=G-HFXVL3377J` in the Cloudflare production
deployment configuration. It is a public measurement identifier and is safe
to be present in the built client. It must not be placed in a server secret
that is unavailable at Vite build time.

Test and production deployments use separate GA4 data streams (or no ID in
test) so test traffic never contaminates production reports.

## Reporting location and initial reports

All reporting is in Google Analytics at `analytics.google.com` under the
Jevailab GA4 property:

- **Reports > Acquisition**: country/region and traffic source.
- **Reports > Engagement > Pages and screens**: page views, entrances,
  exits, and average engagement time.
- **Reports > Engagement > Events**: event volumes and parameters.
- **Explore > Funnel exploration**: landing/create page, registration, quote,
  generation, download, checkout, and purchase funnel.
- **Admin > Events / Key events**: mark `sign_up`, `generation_completed`,
  and `purchase` as key events after validation.

## Verification

1. Unit tests prove the event validator permits only the documented payloads
   and strips every prohibited field.
2. Component tests verify route changes emit canonical `page_view` events and
   that disabled consent emits none.
3. Product-flow tests verify each documented event at its success/failure
   boundary without changing the underlying product request.
4. Build, typecheck, lint, and existing tests must pass.
5. After deployment, GA4 Realtime is used to verify one page view and each
   safe test event. Production user behaviour is not required for validation.

## Non-goals

- Session recordings, heatmaps, ad remarketing, cross-device identity, or
  user-level behavioural profiles.
- Replacing payment-provider accounting, product audit logs, or server-side
  operational monitoring.
- A first-party analytics dashboard.

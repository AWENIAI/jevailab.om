# Newsletter module

Email subscribe / unsubscribe / status, driven by **Resend** or **Beehiiv**. Config via `websiteConfig.newsletter`; env from **serverEnv** (`src/env/server.ts`). Status checks use the [Cache](./cache.md) module when `websiteConfig.cache` is enabled. See [Env](./env.md) for variable list and where to set them.

**Consumers:** TanStack Start server functions in `src/api/newsletter.ts` (there are no REST routes under `routes/api/newsletter/`), hooks (`use-newsletter`), settings card (`NewsletterFormCard`), marketing block (`NewsletterCard` on the homepage), waitlist form (`WaitlistFormCard`), and the Better Auth sign-up hook (auto-subscribe). A welcome email after subscribe is sent by the **Mail** module when `websiteConfig.mail.fromEmail` is set.

---

## Directory structure

**Core module** (`src/newsletter/`):

```
src/newsletter/
├── index.ts           # subscribe, unsubscribe, isSubscribed, getNewsletterProvider; providerRegistry
├── types.ts           # NewsletterProviderName, NewsletterProvider, params & handler types
└── provider/
    ├── resend.ts      # ResendNewsletterProvider (Resend contacts)
    └── beehiiv.ts     # BeehiivNewsletterProvider (@beehiiv/sdk)
```

**Server functions** (`src/api/newsletter.ts`): `getNewsletterStatus`, `subscribeNewsletter`, `unsubscribeNewsletter`.

**Client** (outside `src/newsletter/`):
- `src/hooks/use-newsletter.ts` — `useNewsletterStatus`, `useSubscribeNewsletter`, `useUnsubscribeNewsletter`, `newsletterKeys`
- `src/components/settings/notification/newsletter-form-card.tsx` — logged-in user toggle (Switch) in Settings → Notifications
- `src/components/blocks/newsletter-card.tsx` — public email form on the homepage
- `src/components/waitlist/waitlist-form-card.tsx` — `/waitlist` form (subscribes via `useSubscribeNewsletter`)

---

## Configuration

| Source | Key | Description |
|--------|-----|-------------|
| `websiteConfig.newsletter` | `enable` | Master switch; when false, the server functions throw and the UI hides. |
| | `provider` | `'resend'` \| `'beehiiv'`. |
| | `autoSubscribeAfterSignUp` | If true, new users are subscribed after sign-up via Better Auth `databaseHooks.user.create.after` in `src/auth/auth.ts`. Failures are logged and do not block sign-up. |
| `serverEnv` (`src/env/server.ts`) | `RESEND_API_KEY` | Required when provider is `resend` (shared with Mail if used). |
| | `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID` | Both required when provider is `beehiiv`. |

Env is defined in `serverEnv` (runtime: `process.env`; Worker vars/secrets populate it).

---

## Core API (`@/newsletter`)

| Export | Description |
|--------|-------------|
| **subscribe(email)** | Subscribe email; returns `Promise<boolean>`. Returns `false` when the newsletter is disabled. |
| **unsubscribe(email)** | Unsubscribe; returns `Promise<boolean>`. |
| **isSubscribed(email)** | Check status; returns `Promise<boolean>`. |
| **getNewsletterProvider()** | Lazily creates the configured provider and reuses it for the Worker isolate (module-level singleton). Throws if the newsletter is disabled, no provider is set, or the provider is unknown. |

---

## Provider interface

`NewsletterProvider` (`types.ts`) implements:

- `subscribe({ email })` → `Promise<boolean>`
- `unsubscribe({ email })` → `Promise<boolean>`
- `checkSubscribeStatus({ email })` → `Promise<boolean>`
- `getProviderName()` → string

Providers throw from the constructor when their API key is missing, and return `false` (after logging) on API errors.

**Resend** (`contacts.create` / `contacts.update` / `contacts.get`, no audience ID):
- Subscribe: create the contact with `unsubscribed: false`; if create returns any error (e.g. the contact exists), update it to `unsubscribed: false`. There is no pre-check, to stay under Resend's rate limit.
- Unsubscribe: update the contact to `unsubscribed: true`.
- Status: `!contact.unsubscribed`; any error returns `false`.

**Beehiiv** (`@beehiiv/sdk`):
- Subscribe: look up by email; reactivate an inactive subscription (`subscriptions.patch` + `bulkSubscriptionUpdates.patchStatus`), or create a new one with `send_welcome_email: false`.
- Unsubscribe: `bulkSubscriptionUpdates.patch` with `unsubscribe: true`. An email that is not found counts as success.
- Status: any error returns `false`.

**Adding a provider:** Extend `NewsletterProviderName` in `types.ts`, add provider-specific optional vars to `serverEnv` in `src/env/server.ts`, implement `NewsletterProvider` in `provider/<name>.ts`, and register a factory in `providerRegistry` in `index.ts`.

---

## Server functions

| Server function | Input | Behavior |
|-----------------|--------|----------|
| `getNewsletterStatus` (GET) | `{ email }` | Returns `{ subscribed }` from cache, or calls `isSubscribed(email)` and caches it for 10 minutes. |
| `subscribeNewsletter` (POST) | `{ email }` | `subscribe(email)` → deletes status cache → if `mail.fromEmail` is set, waits 3 seconds and sends the `subscribeNewsletter` email (errors logged). |
| `unsubscribeNewsletter` (POST) | `{ email }` | `unsubscribe(email)` → deletes status cache. |

Behavior shared by all three:

- The email is validated with `z.email()`, then trimmed and lowercased.
- When the newsletter is disabled they throw `Error('Newsletter is disabled')` (a server-function error, not an HTTP 400).
- When the provider returns `false`, subscribe/unsubscribe throw `'Failed to subscribe to the newsletter'` / `'Failed to unsubscribe from the newsletter'`. Errors are rethrown as `Error(message)`.
- **No auth middleware.** They accept any email from the caller, so anyone can check or unsubscribe an arbitrary address. If that matters for your product, add `authApiMiddleware` to the status/unsubscribe functions and use the session email instead of the input.

Caveat: provider errors in `isSubscribed` resolve to `false`, and that `false` is cached for 10 minutes.

---

## UI and hooks

- **use-newsletter** — `useNewsletterStatus(email)` (query, `staleTime` 5 minutes, disabled without an email), `useSubscribeNewsletter()` / `useUnsubscribeNewsletter()` (mutations). They call the server functions directly and invalidate the status query on success.
- **NewsletterFormCard** — Renders only when `newsletter.enable`; uses the session user's email. Shows a Switch bound to subscription status; toggling calls subscribe/unsubscribe with a toast, and resets the switch on error.
- **NewsletterCard** — Renders only when `newsletter.enable`. Email input + submit via `useSubscribeNewsletter`. Uses flat Paraglide `m.newsletter_*()` message functions.

---

## Dependencies

- **resend** — Resend SDK (contacts).
- **@beehiiv/sdk** — Beehiiv API client (when using Beehiiv provider).

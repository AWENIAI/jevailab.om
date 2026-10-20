# Mail module

Transactional email (verification, password reset, contact form, subscription welcome). **Cloudflare Email Service** is the production provider. Design allows adding other providers via a provider registry without changing callers.

**Consumers:** Auth (`sendVerificationEmail`, `sendResetPassword`), contact form (`sendContactMessage` in `src/api/contact.ts`), newsletter welcome email — all use `sendEmail(...)` only.

---

## Directory structure

```
src/mail/
├── index.ts           # sendEmail, getMailProvider; providerRegistry
├── types.ts           # EmailTemplate, MailProviderName, Send*Params, MailProvider
├── render.ts          # getTemplate, renderEmailHtml, toPlainText; EmailTemplates, EmailSubjects
├── provider/
│   └── cloudflare.ts  # CloudflareProvider implements MailProvider
├── templates/
│   ├── verify-email.tsx
│   ├── forgot-password.tsx
│   ├── subscribe-newsletter.tsx
│   └── contact-message.tsx
└── components/
    ├── email-layout.tsx
    └── email-button.tsx
```

---

## Configuration

| Source | Key | Description |
|--------|-----|-------------|
| `websiteConfig.mail` | `enable` | Master switch. When false, `sendEmail` returns `{ success: false, error: 'Mail feature is disabled' }`. |
| | `provider` | `'cloudflare'`. Extend in `src/types/index.d.ts` when adding providers. |
| | `fromEmail` | Sender address (required for sending). |
| | `supportEmail` | Target address of the contact form. |
| Worker binding | `EMAIL` | Native `send_email` binding declared in `wrangler.jsonc`. No account ID or API token is used at runtime. |

---

## Providers

### Cloudflare Email Service

Uses the native [Cloudflare Workers `send_email` binding](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/). This avoids storing an account-scoped API token in the Worker.

**Prerequisites:**
1. Your domain must be using Cloudflare DNS.
2. Onboard your domain in the Cloudflare dashboard under **Email Sending**.
3. Declare the binding in `wrangler.jsonc`:

```jsonc
"send_email": [
  {
    "name": "EMAIL",
    "allowed_sender_addresses": ["support@jevailab.com"]
  }
]
```

**Usage:**

```ts
// src/config/website.ts
mail: {
  enable: true,
  provider: 'cloudflare',
  fromEmail: 'jevailab <support@jevailab.com>',
  supportEmail: 'support@jevailab.com',
}
```

> **Note:** The sender address in `fromEmail` must be listed in `allowed_sender_addresses` and belong to a domain onboarded in Cloudflare Email Service. `supportEmail` is a plain recipient address; a display name there would become part of the `to` field.

---

## API

`@/mail` (`src/mail/index.ts`) exports:

| Export | Description |
|--------|-------------|
| **sendEmail(params)** | `SendTemplateParams` → render template + send; `SendRawEmailParams` → send raw. Returns `Promise<SendEmailResult>` (`{ success, messageId?, error? }`). **Never throws**: provider construction errors (e.g. missing API key) and provider failures are logged and returned as `{ success: false }`. |
| **getMailProvider()** | Lazily creates the configured provider and reuses it (module-level singleton). Throws when no provider is configured. |

`src/mail/render.ts` exports `getTemplate({ template, context })` (used by providers internally), plus `renderEmailHtml` and `toPlainText`.

Types are **not** re-exported from `@/mail`; import them from `@/mail/types`.

Caller note: the Auth module ignores the send result, and the newsletter welcome email only logs failures. The contact form (`src/api/contact.ts`) is the only caller that throws on failure.

---

## Templates

Email copy is localized with Paraglide but **always rendered in English**: subjects live in `EmailSubjects` (`render.ts`) and every template and layout component calls `m.key(undefined, { locale: 'en' })`. Source strings are `mail_*` keys in `project.inlang/messages/en.json` (zh translations exist but are unused by email).

| Template | Context | Subject key |
|----------|---------|-------------|
| forgotPassword | `{ url, name }` | `mail_forgot_password_subject` (Reset your password) |
| verifyEmail | `{ url, name }` | `mail_verify_email_subject` (Verify your email) |
| subscribeNewsletter | none (a passed `{ email }` is ignored) | `mail_subscribe_newsletter_subject` (Thanks for subscribing) |
| contactMessage | `{ name, email, message }` | `mail_contact_message_subject` (Contact Message from Website) |

**Adding a template:**
1. Add the name to `EmailTemplate` in `src/mail/types.ts`.
2. Add it to `EmailTemplates` and `EmailSubjects` in `src/mail/render.ts`.
3. Add the `mail_<name>_subject` key (and body keys) to `project.inlang/messages/en.json` and `zh.json`, then run `pnpm locale:sort` and `pnpm locale:compile`.
4. Create the React component under `templates/`.

---

## Rendering

`renderEmailHtml` (in `render.ts`) tries, in order: `renderToReadableStream` (Workers), `renderToStaticMarkup`, `renderToString` (Node dev tooling). `toPlainText` strips tags/styles/scripts and decodes HTML entities for the `text` part.

---

## Adding a new mail provider

The module uses a **provider registry** (`providerRegistry` in `index.ts`). To add a new provider:

1. **Types** — In `src/types/index.d.ts`, extend `MailConfig.provider` (e.g. `'cloudflare' | 'newprovider'`).
2. **Implementation** — Add `src/mail/provider/<name>.ts` implementing `MailProvider` (`sendTemplate`, `sendRawEmail`, `getProviderName`). Use `getTemplate` from `../render` for template-based sends.
3. **Registration** — In `src/mail/index.ts`, add a factory to `providerRegistry`: `newprovider: () => new NewProvider(...)`, reading provider-specific env/bindings inside.

Callers continue using `sendEmail(...)` only.

---

## Dependencies and tooling

- **react / react-dom/server** — Template rendering.
- **@react-email/components** — Building blocks used by every template (`Body`, `Button`, `Container`, etc.).
- **react-email + @react-email/preview-server** (dev) — `pnpm email:dev` compiles the Paraglide runtime and previews templates on port 3333.

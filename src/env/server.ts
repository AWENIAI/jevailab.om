import { createEnv } from '@t3-oss/env-core';
import * as z from 'zod';

/**
 * Server-side env (runtime process.env; Worker vars/secrets populate it)
 */
export const serverEnv = createEnv({
  server: {
    // Defaults so CLI (e.g. auth:schema:generate via pnpm dlx) can run without loading .env.local
    VITE_BASE_URL: z.url().default('http://localhost:3000'),

    // Auth (Better Auth)
    // The default keeps CLI tooling (auth:schema:generate) and local/E2E runs
    // working without a secret, but a production Worker must never boot with
    // it: the session signing key would be a value published in this repo.
    BETTER_AUTH_SECRET: z
      .string()
      .default('better-auth-secret')
      .refine(
        (value) =>
          process.env.NODE_ENV !== 'production' ||
          (value !== 'better-auth-secret' && value.length >= 32),
        'BETTER_AUTH_SECRET must be a unique value of at least 32 characters in production.'
      ),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().default(''),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Browser extension (Google OAuth)
    GOOGLE_EXTENSION_CLIENT_ID: z.string().optional(),

    // Mail and Newsletter (Resend)
    RESEND_API_KEY: z.string().optional(),

    // Mail (Cloudflare Email)
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_API_TOKEN: z.string().optional(),

    // Newsletter (Beehiiv)
    BEEHIIV_API_KEY: z.string().optional(),
    BEEHIIV_PUBLICATION_ID: z.string().optional(),

    // Notification (Discord and Feishu)
    DISCORD_WEBHOOK_URL: z.string().optional(),
    FEISHU_WEBHOOK_URL: z.string().optional(),

    // Payment (Stripe)
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // Payment (Creem)
    CREEM_DEBUG: z.string().optional(),
    CREEM_API_KEY: z.string().optional(),
    CREEM_WEBHOOK_SECRET: z.string().optional(),

    // Payment (Waffo Pancake)
    WAFFO_DEBUG: z.string().optional(),
    WAFFO_MERCHANT_ID: z.string().optional(),
    WAFFO_PRIVATE_KEY: z.string().optional(),

    // AI image generation (fal.ai)
    FAL_KEY: z.string().optional(),

    // AI image generation (Kie GPT Image 2)
    KIE_API_KEY: z.string().optional(),
    KIE_WEBHOOK_HMAC_KEY: z.string().optional(),
    KIE_API_BASE_URL: z.url().default('https://api.kie.ai'),

    // Video character creation. Every switch defaults closed so an unset
    // environment cannot spend provider credits.
    VIDEO_REPLACEMENT_ENABLED: z.enum(['true', 'false']).default('false'),
    VIDEO_REPLACEMENT_PROVIDER_SEND_ENABLED: z
      .enum(['true', 'false'])
      .default('false'),
    VIDEO_REPLACEMENT_ALLOW_PROMO_CREDITS: z
      .enum(['true', 'false'])
      .default('false'),
    KIE_LIVE_TEST_ENABLED: z.enum(['true', 'false']).default('false'),
    VIDEO_REPLACEMENT_MAX_ACTIVE_PER_USER: z.string().default('1'),
    VIDEO_REPLACEMENT_MAX_JOBS_PER_USER_DAY: z.string().default('3'),
    VIDEO_REPLACEMENT_MAX_JOBS_PER_USER_WEEK: z.string().default('10'),
    VIDEO_REPLACEMENT_PROVIDER_MAX_INFLIGHT: z.string().default('3'),
    VIDEO_REPLACEMENT_HOURLY_BUDGET_USD: z.string().default('3'),
    VIDEO_REPLACEMENT_DAILY_BUDGET_USD: z.string().default('10'),
    VIDEO_REPLACEMENT_PER_USER_DAILY_BUDGET_USD: z.string().default('1.5'),
    VIDEO_REPLACEMENT_QUOTE_TTL_SECONDS: z.string().default('300'),

    // Image content review (SeeAPI nsfw-filter). This must remain server-only.
    SEEAPI_API_KEY: z.string().optional(),
    SEEAPI_NSFW_THRESHOLD_OFFSET: z.string().optional(),
    SEEAPI_NSFW_STRICT_SPECIAL_CARE: z.enum(['true', 'false']).optional(),

    // This local-only switch is intentionally separate from payment debug
    // flags and must never enable production generation.
    IMAGE_CREATOR_DEV_MODERATION_MOCK: z.enum(['true', 'false']).optional(),
  },
  runtimeEnv: process.env,
});

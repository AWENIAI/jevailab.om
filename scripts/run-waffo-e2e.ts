import { spawn } from 'node:child_process';
import { loadEnv } from 'vite';

/**
 * Bootstrap for `pnpm e2e:waffo`.
 *
 * Waffo has no official CLI that forwards webhooks (unlike Stripe), so this
 * script only validates the required env, prints the manual prerequisites,
 * and launches Playwright. The caller is responsible for:
 *
 *   1. Running the dev server on ${port} in E2E mode
 *      (e.g. `PORT=${port} MODE=e2e pnpm dev`).
 *   2. Exposing that port via **cloudflared** — it preserves the
 *      `X-Waffo-Signature` header, needs no signup, and has no 2-hour
 *      session cap. ngrok also works but requires an account.
 *      Do NOT use localtunnel: it strips custom headers.
 *   3. Registering the tunnel URL as an HTTP test webhook in the Waffo
 *      dashboard (see docs/waffo/SKILL.md → Configuring Webhook URLs, or
 *      `scripts/setup-waffo.ts`).
 */

const port = Number(process.env.WAFFO_E2E_PORT ?? 3018);
// Better Auth rejects `127.0.0.1` origins; always use `localhost` so the
// default flow works without overriding PLAYWRIGHT_BASE_URL.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const fileEnv = loadEnv('e2e', process.cwd(), '');
const runtimeEnv = { ...process.env, ...fileEnv };

const requiredVariables = [
  'WAFFO_MERCHANT_ID',
  'WAFFO_PRIVATE_KEY',
  'VITE_WAFFO_PRODUCT_PRO_MONTHLY',
  'VITE_WAFFO_PRODUCT_PRO_YEARLY',
  'VITE_WAFFO_PRODUCT_LIFETIME',
] as const;

for (const variable of requiredVariables) {
  if (!runtimeEnv[variable]) {
    throw new Error(`${variable} is required for Waffo sandbox E2E`);
  }
}

if (
  runtimeEnv.VITE_PAYMENT_PROVIDER &&
  runtimeEnv.VITE_PAYMENT_PROVIDER !== 'waffo'
) {
  throw new Error(
    `VITE_PAYMENT_PROVIDER must be 'waffo' for this suite (got ${runtimeEnv.VITE_PAYMENT_PROVIDER})`
  );
}

console.log('Waffo E2E prerequisites (must be running before this script):');
console.log(`  1. Dev server on port ${port} in E2E mode`);
console.log(`  2. cloudflared tunnel pointing at localhost:${port}`);
console.log(`     (\`cloudflared tunnel --url http://localhost:${port}\`)`);
console.log(
  '  3. Waffo dashboard: HTTP test webhook → <tunnel>/api/webhooks/waffo'
);
console.log('     subscribed to order.completed + subscription.* + refund.*');
console.log(`Playwright base URL: ${baseURL}`);
console.log('');

const playwright = spawn(
  'pnpm',
  [
    'exec',
    'playwright',
    'test',
    '--config',
    'playwright.waffo.config.ts',
    ...process.argv.slice(2).filter((argument) => argument !== '--'),
  ],
  {
    env: {
      ...runtimeEnv,
      PLAYWRIGHT_BASE_URL: baseURL,
      WAFFO_E2E_PORT: String(port),
    },
    stdio: 'inherit',
  }
);

const exitCode = await new Promise<number>((resolve, reject) => {
  playwright.once('error', reject);
  playwright.once('exit', (code) => resolve(code ?? 1));
});
process.exitCode = exitCode;

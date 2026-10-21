import { spawn } from 'node:child_process';
import { getDatabaseName } from './get-db-name';

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const persistPath = process.env.E2E_PERSIST_PATH ?? './.wrangler/e2e-state';
const databaseName = getDatabaseName();
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const useShell = process.platform === 'win32';

function run(command: string, args: string[], useShell = false) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: 'inherit',
      ...(useShell ? { shell: true } : {}),
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}`
        )
      );
    });
  });
}

async function main() {
  await run(
    pnpmCommand,
    ['exec', 'tsx', 'scripts/prepare-e2e-state.ts'],
    useShell
  );
  await run(
    pnpmCommand,
    [
      'exec',
      'wrangler',
      'd1',
      'migrations',
      'apply',
      databaseName,
      '--local',
      '--persist-to',
      persistPath,
    ],
    useShell
  );

  await new Promise<void>((resolve, reject) => {
    const vite = spawn(
      pnpmCommand,
      [
        'exec',
        'vite',
        'dev',
        ...(process.env.VITE_FORCE === '1' ? ['--force'] : []),
        '--mode',
        'e2e',
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--strictPort',
      ],
      {
        env: {
          ...process.env,
          E2E_PERSIST_PATH: persistPath,
          VITE_BASE_URL: baseURL,
          VITE_PAYMENT_PROVIDER: 'stripe',
          VITE_STRIPE_PRICE_PRO_MONTHLY: 'price_test_monthly',
          VITE_STRIPE_PRICE_PRO_YEARLY: 'price_test_yearly',
          VITE_STRIPE_PRICE_LIFETIME: 'price_test_lifetime',
          BETTER_AUTH_SECRET: 'e2e-better-auth-secret',
        },
        stdio: 'inherit',
        ...(useShell ? { shell: true } : {}),
      }
    );

    vite.on('error', reject);
    vite.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `vite exited with ${signal ? `signal ${signal}` : `code ${code}`}`
        )
      );
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

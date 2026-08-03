import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath, URL } from 'url';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import contentCollections from '@content-collections/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';

const stripeE2EConfig =
  process.env.STRIPE_E2E_RUN === 'true'
    ? {
        vars: {
          STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
          STRIPE_WEBHOOK_SECRET: process.env.STRIPE_E2E_WEBHOOK_SECRET ?? '',
          VITE_BASE_URL: process.env.VITE_BASE_URL ?? '',
          BETTER_AUTH_SECRET:
            process.env.BETTER_AUTH_SECRET ??
            'e2e-better-auth-secret-at-least-32-characters',
        },
      }
    : undefined;

const creemE2EConfig =
  process.env.CREEM_E2E_RUN === 'true'
    ? {
        vars: {
          CREEM_API_KEY: process.env.CREEM_API_KEY ?? '',
          CREEM_WEBHOOK_SECRET: process.env.CREEM_WEBHOOK_SECRET ?? '',
          CREEM_DEBUG: process.env.CREEM_DEBUG ?? 'true',
          VITE_BASE_URL: process.env.VITE_BASE_URL ?? '',
          BETTER_AUTH_SECRET:
            process.env.BETTER_AUTH_SECRET ??
            'e2e-better-auth-secret-at-least-32-characters',
        },
      }
    : undefined;

/**
 * Vite configuration
 * https://vite.dev/config/
 */
const config = defineConfig({
  server: {
    allowedHosts: ['.trycloudflare.com', '.tanstarter.dev'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools({
      eventBusConfig: {
        port: 0,
      },
    }),
    tailwindcss(),
    contentCollections(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/locale/paraglide',
      strategy: ['url', 'cookie', 'baseLocale'],
      routeStrategies: [
        { match: '/api/:path(.*)?', exclude: true },
        { match: '/robots.txt', exclude: true },
        { match: '/sitemap.xml', exclude: true },
        { match: '/manifest.json', exclude: true },
      ],
      emitTsDeclarations: true,
      isServer: 'import.meta.env?.SSR === true',
    }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    // https://tanstack.dev/start/latest/docs/framework/react/build-from-scratch
    tanstackStart({
      srcDirectory: 'src',
      start: { entry: './start.tsx' },
      server: { entry: './server.ts' },
    }),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
    // https://developers.cloudflare.com/workers/vite-plugin/
    cloudflare({
      config: stripeE2EConfig ?? creemE2EConfig,
      persistState: process.env.E2E_PERSIST_PATH
        ? { path: process.env.E2E_PERSIST_PATH }
        : undefined,
      viteEnvironment: {
        name: 'ssr',
      },
    }),
  ],
});

export default config;

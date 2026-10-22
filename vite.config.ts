import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath, URL } from 'url';
import { readFile } from 'node:fs/promises';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import contentCollections from '@content-collections/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import {
  extractRouteTreePathsFromSource,
  formatRouteCoverageWarning,
  getRouteCoverageGaps,
} from './src/lib/sitemap-routes';

function sitemapRouteCoveragePlugin(): Plugin {
  let checked = false;

  return {
    name: 'sitemap-route-coverage',
    async buildStart() {
      if (checked) return;
      checked = true;

      const routeTreeSource = await readFile(
        fileURLToPath(new URL('./src/routeTree.gen.ts', import.meta.url)),
        'utf8'
      );
      const gaps = getRouteCoverageGaps(
        extractRouteTreePathsFromSource(routeTreeSource)
      );

      if (
        gaps.missingFromSitemap.length > 0 ||
        gaps.missingFromRouteTree.length > 0
      ) {
        this.warn(formatRouteCoverageWarning(gaps));
      }
    },
  };
}

/**
 * Vite configuration
 * https://vite.dev/config/
 */
const config = defineConfig({
  server: {
    allowedHosts: ['.trycloudflare.com', '.jevailab.com'],
    watch: {
      // Paraglide rewrites thousands of generated files during startup and
      // locale edits. Watching them causes EBUSY on synced Windows folders.
      ignored: ['**/src/locale/paraglide/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    sitemapRouteCoveragePlugin(),
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

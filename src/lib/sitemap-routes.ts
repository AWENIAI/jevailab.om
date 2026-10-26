import type { Locale } from '@/lib/locale';
import { isExcludedFromSitemap } from './indexing-policy';

export type PublicRoute = {
  path: string;
  locales: readonly Locale[];
};

/**
 * Explicit allowlist for localized public pages in sitemap.xml.
 *
 * New public pages must be added here deliberately. The route-tree validator
 * warns when a non-excluded route is missing from this list.
 */
export const PUBLIC_ROUTES = [
  { path: '/', locales: ['en', 'zh'] },
  { path: '/create', locales: ['en', 'zh'] },
  { path: '/launch-pricing', locales: ['en', 'zh'] },
  { path: '/blog', locales: ['en', 'zh'] },
] as const satisfies readonly PublicRoute[];

/**
 * Dynamic public routes are generated from content data, not scanned from the
 * route tree. Coverage validation recognizes their concrete sitemap URLs.
 */
export const AUTO_GENERATED_PUBLIC_ROUTE_PATTERNS = ['/blog/$slug'] as const;

export type RouteCoverageGap = {
  missingFromSitemap: string[];
  missingFromRouteTree: string[];
};

export function normalizeRoutePath(path: string): string {
  if (path === '/') return path;
  return path.replace(/\/+$/, '');
}

/**
 * Read route paths from TanStack Router's generated route-tree metadata.
 *
 * Importing routeTree.gen.ts from the Vite config would execute application
 * modules (including Cloudflare-only dependencies). The generated
 * FileRoutesByPath declarations contain the same canonical fullPath values and
 * let build/dev validation inspect the route tree without running the app.
 */
export function extractRouteTreePathsFromSource(source: string): string[] {
  return [
    ...new Set(
      [...source.matchAll(/\bfullPath:\s*['"]([^'"]+)['"]/g)].map((match) =>
        normalizeRoutePath(match[1])
      )
    ),
  ];
}

function dynamicPatternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .map((segment) =>
      segment.startsWith('$')
        ? '[^/]+'
        : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )
    .join('/');
  return new RegExp(`^${source}$`);
}

function isDynamicPublicRoute(path: string): boolean {
  return AUTO_GENERATED_PUBLIC_ROUTE_PATTERNS.some((pattern) =>
    dynamicPatternToRegExp(pattern).test(path)
  );
}

/**
 * Compare the non-excluded route tree against the explicit sitemap allowlist.
 * This function validates coverage only; it never feeds routes into sitemap
 * generation.
 */
export function getRouteCoverageGaps(
  routePaths: readonly string[]
): RouteCoverageGap {
  const normalizedRoutePaths = [...new Set(routePaths.map(normalizeRoutePath))];
  const publicRoutePaths = new Set(
    PUBLIC_ROUTES.map((route) => normalizeRoutePath(route.path))
  );

  const missingFromSitemap = normalizedRoutePaths.filter(
    (path) =>
      !isExcludedFromSitemap(path) &&
      !isDynamicPublicRoute(path) &&
      !publicRoutePaths.has(path)
  );
  const missingFromRouteTree = [...publicRoutePaths].filter(
    (path) => !normalizedRoutePaths.includes(path)
  );

  return {
    missingFromSitemap: missingFromSitemap.sort(),
    missingFromRouteTree: missingFromRouteTree.sort(),
  };
}

export function formatRouteCoverageWarning({
  missingFromSitemap,
  missingFromRouteTree,
}: RouteCoverageGap): string {
  const lines = [
    '[sitemap] Route consistency warning:',
    ...missingFromSitemap.map(
      (path) =>
        `  - Route exists but is not covered by PUBLIC_ROUTES/sitemap: ${path}`
    ),
    ...missingFromRouteTree.map(
      (path) =>
        `  - PUBLIC_ROUTES declares a path missing from the route tree: ${path}`
    ),
  ];
  return lines.join('\n');
}

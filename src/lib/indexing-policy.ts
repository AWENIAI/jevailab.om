/**
 * Paths that robots.txt explicitly disallows.
 *
 * Keep this as the single source of truth. Sitemap coverage validation uses
 * the same list instead of maintaining a second copy.
 */
export const ROBOTS_DISALLOWED_PATHS = [
  '/auth',
  '/admin',
  '/settings',
  '/dashboard',
] as const;

/**
 * Additional routes that are not public marketing pages:
 * - machine/API endpoints;
 * - generated metadata files;
 * - test-only routes;
 * - legacy redirects.
 */
export const NON_INDEXABLE_ROUTE_PATHS = [
  '/api',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/test-404',
  '/test-error',
  '/ai',
  '/pricing',
] as const;

function matchesPathPrefix(path: string, rule: string): boolean {
  return path === rule || path.startsWith(`${rule}/`);
}

export function isRobotsDisallowedPath(path: string): boolean {
  return ROBOTS_DISALLOWED_PATHS.some((rule) => matchesPathPrefix(path, rule));
}

export function isNonIndexableRoutePath(path: string): boolean {
  return NON_INDEXABLE_ROUTE_PATHS.some((rule) =>
    matchesPathPrefix(path, rule)
  );
}

export function isExcludedFromSitemap(path: string): boolean {
  return isRobotsDisallowedPath(path) || isNonIndexableRoutePath(path);
}

import { describe, expect, it } from 'vitest';
import {
  AUTO_GENERATED_PUBLIC_ROUTE_PATTERNS,
  CURATED_SITEMAP_BLOG_SLUGS,
  extractRouteTreePathsFromSource,
  formatRouteCoverageWarning,
  getRouteCoverageGaps,
  PUBLIC_ROUTES,
} from '@/lib/sitemap-routes';

const publicPaths = PUBLIC_ROUTES.map((route) => route.path);

describe('sitemap route coverage', () => {
  it('keeps template detail routes out of the curated sitemap', () => {
    expect(PUBLIC_ROUTES.map((route) => route.path)).toEqual([
      '/',
      '/create',
      '/launch-pricing',
      '/ai-poster-maker',
    ]);
    expect(AUTO_GENERATED_PUBLIC_ROUTE_PATTERNS).toEqual(['/blog/$slug']);
    expect(CURATED_SITEMAP_BLOG_SLUGS).toEqual([
      'best-ai-poster-makers-2026',
    ]);
  });

  it('reports public routes that are missing from the allowlist', () => {
    const gaps = getRouteCoverageGaps([
      ...publicPaths,
      '/blog/$slug',
      '/templates/$templateId',
      '/template-gallery',
    ]);

    expect(gaps.missingFromSitemap).toEqual(['/template-gallery']);
    expect(gaps.missingFromRouteTree).toEqual([]);
    expect(formatRouteCoverageWarning(gaps)).toContain(
      'Route exists but is not covered by PUBLIC_ROUTES/sitemap: /template-gallery'
    );
  });

  it('reports allowlist paths missing from the route tree', () => {
    const gaps = getRouteCoverageGaps(
      publicPaths.filter((path) => path !== '/create')
    );

    expect(gaps.missingFromSitemap).toEqual([]);
    expect(gaps.missingFromRouteTree).toEqual(['/create']);
    expect(formatRouteCoverageWarning(gaps)).toContain(
      'PUBLIC_ROUTES declares a path missing from the route tree: /create'
    );
  });

  it('uses the robots exclusion source for private and non-indexable paths', () => {
    const gaps = getRouteCoverageGaps([
      ...publicPaths,
      '/blog/$slug',
      '/auth/login',
      '/admin/users',
      '/settings/profile',
      '/dashboard/',
      '/api/ping',
      '/sitemap.xml',
      '/robots.txt',
      '/manifest.json',
      '/test-404',
      '/ai',
      '/pricing',
    ]);

    expect(gaps).toEqual({
      missingFromSitemap: [],
      missingFromRouteTree: [],
    });
  });

  it('extracts fullPath values from the generated route tree', () => {
    const source = `
      interface FileRoutesByPath {
        '/': { fullPath: '/' }
        '/blog/': { fullPath: '/blog/' }
        '/create': { fullPath: '/create' }
      }
    `;

    expect(extractRouteTreePathsFromSource(source)).toEqual([
      '/',
      '/blog',
      '/create',
    ]);
  });
});

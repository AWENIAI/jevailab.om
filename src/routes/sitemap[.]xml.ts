import { createFileRoute } from '@tanstack/react-router';
import { getBaseUrl } from '@/lib/urls';
import { renderSitemap } from '@/lib/sitemap';
import { getSortedPosts } from '@/lib/blog';
import { getPageLocales } from '@/lib/pages';
import { websiteConfig } from '@/config/website';
import { locales, type Locale } from '@/lib/locale';
import { logOperationalEvent } from '@/lib/observability';
import {
  CURATED_SITEMAP_BLOG_SLUGS,
  formatRouteCoverageWarning,
  getRouteCoverageGaps,
  normalizeRoutePath,
  PUBLIC_ROUTES,
} from '@/lib/sitemap-routes';

type RouteTreeNode = {
  fullPath: string;
  children?: readonly RouteTreeNode[] | Record<string, RouteTreeNode>;
};

function collectRouteTreePaths(route: RouteTreeNode, paths: Set<string>) {
  if (route.fullPath) paths.add(normalizeRoutePath(route.fullPath));
  const children = Array.isArray(route.children)
    ? route.children
    : Object.values(route.children ?? {});
  for (const child of children) {
    collectRouteTreePaths(child, paths);
  }
}

function warnAboutRouteCoverage(routeTree: RouteTreeNode) {
  if (import.meta.env.PROD && !import.meta.env.DEV) return;
  const routePaths = new Set<string>();
  collectRouteTreePaths(routeTree, routePaths);
  const gaps = getRouteCoverageGaps([...routePaths]);
  if (
    gaps.missingFromSitemap.length > 0 ||
    gaps.missingFromRouteTree.length > 0
  ) {
    logOperationalEvent.warn(formatRouteCoverageWarning(gaps), {
      reason: 'sitemap_route_coverage_gap',
      missingFromSitemap: gaps.missingFromSitemap,
      missingFromRouteTree: gaps.missingFromRouteTree,
    });
  }
}

/**
 * Dynamic sitemap.xml
 * https://tanstack.dev/start/latest/docs/framework/react/guide/seo#dynamic-sitemap
 */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const base = getBaseUrl().replace(/\/$/, '');
        const { routeTree } = await import('@/routeTree.gen');
        warnAboutRouteCoverage(routeTree as unknown as RouteTreeNode);

        const staticUrls: {
          path: string;
          availableLocales?: Locale[];
        }[] = PUBLIC_ROUTES.filter(
          (route) => route.path !== '/blog' || websiteConfig.blog?.enable
        ).map((route) => ({
          path: route.path,
          availableLocales: [...route.locales],
        }));
        if (websiteConfig.payment?.enable) {
          // Checkout is an action, not an indexable marketing page.
        }

        const pages: {
          path: string;
          availableLocales?: Locale[];
          lastmod?: string;
        }[] = staticUrls.map((page) => ({
          path: page.path,
          availableLocales: ['/terms', '/privacy', '/cookie'].includes(
            page.path
          )
            ? getPageLocales(page.path.slice(1))
            : undefined,
        }));
        if (websiteConfig.blog?.enable) {
          const postsBySlug = new Map<
            string,
            { availableLocales: Locale[]; lastmod: string }
          >();
          for (const locale of locales) {
            for (const post of getSortedPosts(locale).filter((item) =>
              CURATED_SITEMAP_BLOG_SLUGS.includes(
                item.slug as (typeof CURATED_SITEMAP_BLOG_SLUGS)[number]
              )
            )) {
              const existing = postsBySlug.get(post.slug);
              if (existing) {
                existing.availableLocales.push(locale);
              } else {
                postsBySlug.set(post.slug, {
                  availableLocales: [locale],
                  lastmod: new Date(post.date).toISOString().slice(0, 10),
                });
              }
            }
          }
          for (const [slug, post] of postsBySlug) {
            pages.push({
              path: `/blog/${slug}`,
              lastmod: post.lastmod,
              availableLocales: post.availableLocales,
            });
          }
        }
        const sitemap = renderSitemap(base, pages);

        return new Response(sitemap, {
          headers: {
            'Content-Type': 'application/xml',
          },
        });
      },
    },
  },
});

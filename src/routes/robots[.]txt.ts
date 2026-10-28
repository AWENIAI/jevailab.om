import { createFileRoute } from '@tanstack/react-router';
import { getBaseUrl } from '@/lib/urls';
import { baseLocale, locales, localizeHref } from '@/lib/locale';
import { ROBOTS_DISALLOWED_PATHS } from '@/lib/indexing-policy';
import { buildRobotsTxt, getRobotsBaseUrl } from '@/lib/robots';

/**
 * Dynamic robots.txt
 * https://tanstack.dev/start/latest/docs/framework/react/guide/seo#dynamic-robotstxt
 */
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const base = getRobotsBaseUrl(request.url, getBaseUrl());
        const disallowRules = ROBOTS_DISALLOWED_PATHS.flatMap((path) => [
          path,
          ...locales
            .filter((locale) => locale !== baseLocale)
            .map((locale) => localizeHref(path, { locale })),
        ]);
        const robots = buildRobotsTxt(base, disallowRules);

        return new Response(robots, {
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      },
    },
  },
});

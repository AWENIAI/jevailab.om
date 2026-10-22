import {
  baseLocale,
  isLocalizedPath,
  localeConfig,
  locales,
  localizeHref,
  type Locale,
} from '@/lib/locale';

type SitemapPage = {
  path: string;
  availableLocales?: readonly Locale[];
  lastmod?: string;
};

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return entities[character];
  });

export function renderSitemap(baseUrl: string, pages: readonly SitemapPage[]) {
  const base = baseUrl.replace(/\/$/, '');
  const entries = pages.flatMap((page) => {
    const availableLocales = isLocalizedPath(page.path)
      ? locales.filter((locale) =>
          (page.availableLocales ?? locales).includes(locale)
        )
      : [];
    const entryLocales: (Locale | undefined)[] = availableLocales.length
      ? availableLocales
      : page.availableLocales
        ? []
        : [undefined];

    return entryLocales.map((locale) => {
      const url = `${base}${locale ? localizeHref(page.path, { locale }) : page.path}`;
      const alternateLinks = availableLocales
        .map((availableLocale) => {
          const href = `${base}${localizeHref(page.path, { locale: availableLocale })}`;
          return `\n    <xhtml:link rel="alternate" hreflang="${localeConfig[availableLocale].hreflang}" href="${escapeXml(href)}" />`;
        })
        .join('');
      const defaultLink = availableLocales.includes(baseLocale)
        ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${base}${localizeHref(page.path, { locale: baseLocale })}`)}" />`
        : '';
      const lastmod = page.lastmod
        ? `\n    <lastmod>${escapeXml(page.lastmod)}</lastmod>`
        : '';
      // The sitemap schema requires lastmod before extension elements such as
      // xhtml:link. Google is lenient, but emitting the canonical order avoids
      // differences between strict and production validators.
      return `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmod}${alternateLinks}${defaultLink}\n  </url>`;
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>`;
}

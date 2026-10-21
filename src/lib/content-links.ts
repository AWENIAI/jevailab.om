import { baseLocale, locales, localizeHref, type Locale } from '@/lib/locale';

// Only the filenames are needed in navigation. Keep Markdown bodies out of the
// shared client bundle that renders the footer on every public page.
const pageFiles = import.meta.glob('../../content/pages/*.md', {
  query: '?raw',
  import: 'default',
});
const blogFiles = import.meta.glob('../../content/blog/*.md', {
  query: '?raw',
  import: 'default',
});

export function getAvailableLocales(path: string): Locale[] | undefined {
  const legalSlug = path.match(/^\/(privacy|terms|cookie)$/)?.[1];
  const blogSlug = path.match(/^\/blog\/([^/]+)$/)?.[1];
  const slug = legalSlug ?? blogSlug;
  if (!slug) return undefined;

  const prefix = legalSlug ? '../../content/pages' : '../../content/blog';
  const files = legalSlug ? pageFiles : blogFiles;
  return locales.filter((locale) => {
    const named = `${prefix}/${slug}.${locale}.md`;
    const unsuffixed = `${prefix}/${slug}.md`;
    // Markdown without a locale suffix is English, matching
    // `getLocaleSlug()` in content-collections.ts.
    if (named in files) return true;
    return locale === 'en' && unsuffixed in files;
  });
}

/**
 * Keep translated content under the requested locale when an English source
 * exists. The page loaders can then render the source document as a fallback.
 */
export function getContentHref(
  path: string,
  locale: Locale,
  available: readonly Locale[] | undefined = getAvailableLocales(path)
): string {
  const target =
    !available?.length ||
    available.includes(locale) ||
    available.includes(baseLocale)
      ? locale
      : available[0];
  return localizeHref(path, { locale: target });
}

/** Redirect explicit locale URLs that only serve another language's content. */
export function getUnavailableContentRedirect(
  pathname: string,
  getLocales: (
    path: string
  ) => readonly Locale[] | undefined = getAvailableLocales
): string | null {
  const [, localePart, ...parts] = pathname.split('/');
  if (!locales.includes(localePart as Locale) || localePart === baseLocale) {
    return null;
  }

  const path = `/${parts.join('/')}`;
  const available = getLocales(path);
  if (!available?.length || available.includes(localePart as Locale)) {
    return null;
  }

  // Legal pages and blog posts fall back to English inside the requested
  // locale route, so only redirect when no base-language source exists.
  if (available.includes(baseLocale)) {
    return null;
  }

  return getContentHref(path, localePart as Locale, available);
}

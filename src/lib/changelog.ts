import { allChangelogs } from 'content-collections';
import type { Changelog } from 'content-collections';
import { baseLocale, getLocale, type Locale } from '@/lib/locale';

export type ChangelogRelease = Changelog & { locale: Locale; slug: string };

export function getChangelogReleases(
  locale: Locale = getLocale(),
  options: { fallbackToBase?: boolean } = {}
): ChangelogRelease[] {
  const releases = [...(allChangelogs as ChangelogRelease[])]
    .filter((r) => r.published && r.locale === locale)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (releases.length > 0 || options.fallbackToBase === false) {
    return releases;
  }

  return [...(allChangelogs as ChangelogRelease[])]
    .filter((r) => r.published && r.locale === baseLocale)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

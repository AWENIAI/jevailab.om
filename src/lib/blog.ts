import { allBlogs } from 'content-collections';
import type { Blog } from 'content-collections';
import { websiteConfig } from '@/config/website';
import { baseLocale, getLocale, type Locale } from '@/lib/locale';

export type BlogPost = Blog & { locale: Locale; slug: string };

const DEFAULT_PAGE_SIZE = 6;

function getPageSize(): number {
  return websiteConfig.blog?.paginationSize ?? DEFAULT_PAGE_SIZE;
}

export function getSortedPosts(locale: Locale = getLocale()): BlogPost[] {
  return getPostsForLocale(locale);
}

function getPostsForLocale(locale: Locale): BlogPost[] {
  return [...(allBlogs as BlogPost[])]
    .filter((p) => p.locale === locale)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function getPostsWithFallback(locale: Locale): BlogPost[] {
  const localized = getPostsForLocale(locale);
  return localized.length > 0 ? localized : getPostsForLocale(baseLocale);
}

export function getPostBySlug(
  slug: string,
  locale: Locale = getLocale()
): BlogPost | undefined {
  const posts = allBlogs as BlogPost[];
  return (
    posts.find((p) => p.slug === slug && p.locale === locale) ??
    posts.find((p) => p.slug === slug && p.locale === baseLocale) ??
    posts.find((p) => p.slug === slug)
  );
}

export function getPaginatedPosts(
  page: number,
  locale: Locale = getLocale(),
  options: { fallbackToBase?: boolean } = {}
): {
  posts: BlogPost[];
  totalPages: number;
  currentPage: number;
} {
  const pageSize = getPageSize();
  const sorted =
    options.fallbackToBase === false
      ? getPostsForLocale(locale)
      : getPostsWithFallback(locale);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * pageSize;
  return {
    posts: sorted.slice(start, start + pageSize),
    totalPages,
    currentPage,
  };
}

export function getPostLocales(slug: string): Locale[] {
  return (allBlogs as BlogPost[])
    .filter((item) => item.slug === slug)
    .map((item) => item.locale);
}

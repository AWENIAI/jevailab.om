import { describe, expect, it } from 'vitest';
import {
  getContentHref,
  getLegacyBlogRedirect,
  getUnavailableContentRedirect,
} from '@/lib/content-links';

const onlyEnglish = () => ['en'] as const;
const onlyChinese = () => ['zh'] as const;

describe('content links for missing translations', () => {
  it('links to the available source document', () => {
    expect(getContentHref('/terms', 'zh', onlyEnglish())).toBe('/zh/terms');
    expect(getContentHref('/blog/post', 'en', onlyChinese())).toBe(
      '/zh/blog/post'
    );
  });

  it('redirects missing localized content while leaving available and unrelated URLs alone', () => {
    expect(
      getUnavailableContentRedirect('/en/blog/post', onlyChinese)
    ).toBeNull();
    expect(getUnavailableContentRedirect('/en/terms', onlyChinese)).toBeNull();
    expect(
      getUnavailableContentRedirect('/en/privacy', onlyEnglish)
    ).toBeNull();
    expect(
      getUnavailableContentRedirect('/en/about', () => undefined)
    ).toBeNull();
    expect(getUnavailableContentRedirect('/terms', onlyEnglish)).toBeNull();
  });
});

describe('retired blog links', () => {
  it('redirects retired scaffold posts to the localized blog index', () => {
    expect(getLegacyBlogRedirect('/blog/hello-world')).toBe('/blog');
    expect(getLegacyBlogRedirect('/zh/blog/getting-started')).toBe('/zh/blog');
    expect(getLegacyBlogRedirect('/blog/deploy-to-production')).toBe('/blog');
  });

  it('does not redirect current or unknown blog posts', () => {
    expect(getLegacyBlogRedirect('/blog/create-with-templates')).toBeNull();
    expect(getLegacyBlogRedirect('/zh/blog/write-better-prompts')).toBeNull();
    expect(getLegacyBlogRedirect('/blog/unknown')).toBeNull();
  });
});

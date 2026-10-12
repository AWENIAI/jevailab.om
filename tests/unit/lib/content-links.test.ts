import { describe, expect, it } from 'vitest';
import {
  getContentHref,
  getUnavailableContentRedirect,
} from '@/lib/content-links';

const onlyEnglish = () => ['en'] as const;
const onlyChinese = () => ['zh'] as const;

describe('content links for missing translations', () => {
  it('links to the available source document', () => {
    expect(getContentHref('/terms', 'zh', onlyEnglish())).toBe('/en/terms');
    expect(getContentHref('/blog/post', 'en', onlyChinese())).toBe('/blog/post');
  });

  it('redirects missing localized content while leaving available and unrelated URLs alone', () => {
    expect(getUnavailableContentRedirect('/en/blog/post', onlyChinese)).toBe(
      '/blog/post'
    );
    expect(getUnavailableContentRedirect('/en/terms', onlyChinese)).toBe(
      '/terms'
    );
    expect(
      getUnavailableContentRedirect('/en/privacy', onlyEnglish)
    ).toBeNull();
    expect(
      getUnavailableContentRedirect('/en/about', () => undefined)
    ).toBeNull();
    expect(getUnavailableContentRedirect('/terms', onlyEnglish)).toBeNull();
  });
});

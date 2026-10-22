import { describe, expect, it, vi } from 'vitest';

const { websiteConfig } = vi.hoisted(() => ({
  websiteConfig: {
    metadata: { name: 'Example', description: 'Example site' },
    social: {} as Record<string, string>,
  },
}));
vi.mock('@/config/website', () => ({ websiteConfig }));
vi.mock('@/lib/urls', () => ({
  getCanonicalUrlForLocale: (path: string, locale: string) =>
    `https://example.com${locale === 'en' ? '' : `/${locale}`}${path}`,
  getImageUrl: (path: string) => `https://example.com${path}`,
}));
vi.mock('@/lib/locale', () => ({
  localeConfig: {
    en: { hreflang: 'en' },
    zh: { hreflang: 'zh-CN' },
    hi: { hreflang: 'hi' },
    es: { hreflang: 'es' },
    ar: { hreflang: 'ar' },
    fr: { hreflang: 'fr' },
    de: { hreflang: 'de' },
    ja: { hreflang: 'ja' },
    ko: { hreflang: 'ko' },
  },
}));

import {
  faqPageStructuredData,
  jsonLdScript,
  pageStructuredData,
} from '@/lib/structured-data';

describe('structured data', () => {
  it('keeps embedded HTML inert without changing the JSON value', () => {
    const value = { name: '</script><script>alert(1)</script>' };
    const { children } = jsonLdScript(value);
    expect(children).not.toContain('<');
    expect(JSON.parse(children)).toEqual(value);
  });

  it('uses the resolved canonical locale and pagination URL', () => {
    const [script] = pageStructuredData('/blog', {
      url: 'https://example.com/blog?page=2',
      title: 'Blog',
      locale: 'zh',
    });
    const graph = JSON.parse(script.children)['@graph'];
    expect(graph[2].url).toBe('https://example.com/blog?page=2');
    expect(graph[2].inLanguage).toBe('zh-CN');
    expect(graph[2].isPartOf['@id']).toBe(graph[1]['@id']);
    expect(graph[1].publisher['@id']).toBe(graph[0]['@id']);
  });

  it('does not add public markup to private or error pages', () => {
    for (const path of [
      '/auth/login',
      '/dashboard',
      '/settings/billing',
      '/admin',
      '/test-404',
    ]) {
      expect(
        pageStructuredData(path, {
          url: `https://example.com${path}`,
          title: 'Page',
          locale: 'en',
        })
      ).toEqual([]);
    }
  });

  it('omits an empty Organization sameAs field', () => {
    const [script] = pageStructuredData('/', {
      url: 'https://example.com/',
      title: 'Home',
      locale: 'en',
    });
    const graph = JSON.parse(script.children)['@graph'];

    expect(graph[0]).not.toHaveProperty('sameAs');
  });

  it('keeps non-empty Organization sameAs links', () => {
    websiteConfig.social = { github: 'https://github.com/example' };
    const [script] = pageStructuredData('/', {
      url: 'https://example.com/',
      title: 'Home',
      locale: 'en',
    });
    const graph = JSON.parse(script.children)['@graph'];

    expect(graph[0].sameAs).toEqual(['https://github.com/example']);
    websiteConfig.social = {};
  });

  it('builds FAQPage questions and answers from the provided visible copy', () => {
    const items = [
      {
        question: "What's a credit?",
        answer: 'Credits are used for image generation.',
      },
      {
        question: 'Can I cancel a subscription?',
        answer: 'Yes. Subscriptions can be canceled from your account.',
      },
    ];
    const script = faqPageStructuredData({
      url: 'https://example.com/launch-pricing',
      items,
    });
    const value = JSON.parse(script.children);

    expect(value).toMatchObject({
      '@type': 'FAQPage',
      '@id': 'https://example.com/launch-pricing#faq',
      url: 'https://example.com/launch-pricing',
    });
    expect(
      value.mainEntity.map(
        (item: { name: string; acceptedAnswer: { text: string } }) => ({
          question: item.name,
          answer: item.acceptedAnswer.text,
        })
      )
    ).toEqual(items);
  });
});

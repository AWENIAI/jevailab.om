import { describe, expect, it } from 'vitest';
import { renderSitemap } from '@/lib/sitemap';
import { PUBLIC_ROUTES } from '@/lib/sitemap-routes';

const entries = (xml: string) =>
  [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);

describe('renderSitemap', () => {
  it('emits one canonical loc per translated static page with reciprocal alternates', () => {
    const urls = entries(
      renderSitemap('https://example.com/', [{ path: '/about' }])
    );
    expect(urls).toHaveLength(2);
    expect(urls.map((url) => url.match(/<loc>(.*?)<\/loc>/)?.[1])).toEqual(
      expect.arrayContaining([
        'https://example.com/about',
        'https://example.com/zh/about',
      ])
    );
    for (const url of urls) {
      expect(url).toContain('hreflang="en" href="https://example.com/about"');
      expect(url).toContain(
        'hreflang="zh-CN" href="https://example.com/zh/about"'
      );
      expect(url).toContain(
        'hreflang="x-default" href="https://example.com/about"'
      );
    }
  });

  it('omits absent translations and their alternates', () => {
    const urls = entries(
      renderSitemap('https://example.com', [
        { path: '/blog/english-only', availableLocales: ['en'] },
        { path: '/blog/chinese-only', availableLocales: ['zh'] },
        { path: '/blog/missing', availableLocales: [] },
      ])
    );
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain(
      '<loc>https://example.com/blog/english-only</loc>'
    );
    expect(urls[0]).not.toContain('hreflang="zh-CN"');
    expect(urls[1]).toContain(
      '<loc>https://example.com/zh/blog/chinese-only</loc>'
    );
    expect(urls[1]).not.toContain('hreflang="en"');
    expect(urls[1]).not.toContain('hreflang="x-default"');
    expect(urls.join('')).not.toContain('/blog/missing');
  });

  it('does not invent translated URLs for nonlocalized paths', () => {
    const urls = entries(
      renderSitemap('https://example.com', [{ path: '/internal' }])
    );
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('<loc>https://example.com/internal</loc>');
    expect(urls[0]).not.toContain('alternate');
  });

  it('does not emit ignored changefreq or priority hints', () => {
    const xml = renderSitemap('https://example.com', [
      { path: '/', lastmod: '2026-10-21' },
    ]);

    expect(xml).toContain('<lastmod>2026-10-21</lastmod>');
    expect(xml.indexOf('<lastmod>')).toBeLessThan(xml.indexOf('<xhtml:link'));
    expect(xml).not.toContain('<changefreq>');
    expect(xml).not.toContain('<priority>');
  });

  it('renders the explicit public route allowlist with paired locales', () => {
    const xml = renderSitemap(
      'https://example.com',
      PUBLIC_ROUTES.map((route) => ({
        path: route.path,
        availableLocales: [...route.locales],
      }))
    );
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
      (match) => match[1]
    );

    expect(urls).toEqual([
      'https://example.com/',
      'https://example.com/zh/',
      'https://example.com/create',
      'https://example.com/zh/create',
      'https://example.com/about',
      'https://example.com/zh/about',
      'https://example.com/changelog',
      'https://example.com/zh/changelog',
      'https://example.com/roadmap',
      'https://example.com/zh/roadmap',
      'https://example.com/contact',
      'https://example.com/zh/contact',
      'https://example.com/waitlist',
      'https://example.com/zh/waitlist',
      'https://example.com/launch-pricing',
      'https://example.com/zh/launch-pricing',
      'https://example.com/terms',
      'https://example.com/zh/terms',
      'https://example.com/privacy',
      'https://example.com/zh/privacy',
      'https://example.com/cookie',
      'https://example.com/zh/cookie',
      'https://example.com/blog',
      'https://example.com/zh/blog',
    ]);
  });
});

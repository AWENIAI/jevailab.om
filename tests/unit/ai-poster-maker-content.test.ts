import { describe, expect, it } from 'vitest';
import {
  getAiPosterMakerContent,
  posterMakerTemplateIds,
} from '@/content/ai-poster-maker';
import { aiPosterMakerStructuredData } from '@/lib/structured-data';

describe('AI poster maker landing page', () => {
  it('provides localized landing-page content with six real templates', () => {
    const content = getAiPosterMakerContent('en');

    expect(content.meta.title.toLowerCase()).toContain('ai poster maker');
    expect(content.hero.h1.toLowerCase()).toContain('ai poster maker');
    expect(content.templates).toHaveLength(6);
    expect(new Set(content.templates.map((item) => item.alt)).size).toBe(6);
    expect(posterMakerTemplateIds).toHaveLength(6);
    expect(content.bodyWordCount).toBeGreaterThanOrEqual(1200);
    expect(getAiPosterMakerContent('zh').hero.h1).toContain('AI 海报制作');
  });

  it('emits application, FAQ, and breadcrumb structured data', () => {
    const scripts = aiPosterMakerStructuredData({
      url: 'https://example.com/ai-poster-maker',
      locale: 'en',
    });
    const json = scripts.map((script) => script.children).join('\n');

    expect(json).toContain('SoftwareApplication');
    expect(json).toContain('FAQPage');
    expect(json).toContain('BreadcrumbList');
  });
});

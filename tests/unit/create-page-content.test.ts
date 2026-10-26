import { describe, expect, it } from 'vitest';
import {
  getCreatePageContent,
  getCreatePageWordCount,
} from '@/content/create-page';

describe('AI image creator page content', () => {
  it.each([
    'en',
    'zh',
  ] as const)('provides substantial, image-only %s page copy', (locale) => {
    const content = getCreatePageContent(locale);
    const serialized = JSON.stringify(content);

    expect(content.meta.title.trim()).not.toHaveLength(0);
    expect(content.meta.description.trim()).not.toHaveLength(0);
    expect(content.hero.h1).toBe(
      locale === 'en'
        ? 'Create an image from a photo or a prompt'
        : 'AI 图片创作工具'
    );
    expect(content.workflow.steps).toHaveLength(5);
    expect(content.ratios.items.map((item) => item.ratio)).toEqual([
      '3:4',
      '9:16',
      '1:1',
      '4:3',
      '16:9',
    ]);
    expect(getCreatePageWordCount(locale)).toBeGreaterThanOrEqual(400);
    expect(serialized).not.toMatch(/video|视频/i);
  });

  it('uses a tool-focused title that is distinct from the marketing homepage', () => {
    expect(getCreatePageContent('en').hero.h1).not.toBe(
      'Create AI images from a template and your words'
    );
    expect(getCreatePageContent('zh').hero.h1).not.toBe(
      '从模板与文字，创作你的 AI 图片'
    );
  });
});

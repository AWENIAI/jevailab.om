import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getJevailabHomepageContent } from '@/content/jevailab-homepage';
import { getLaunchPricingContent } from '@/content/launch-pricing';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

function read(relativePath: string) {
  return readFileSync(`${projectRoot}/${relativePath}`, 'utf8');
}

describe('public bilingual product copy', () => {
  it.each([
    'en',
    'zh',
  ] as const)('keeps %s public product and legal content accurate and image-only', (locale) => {
    const homepage = JSON.stringify(getJevailabHomepageContent(locale));
    const pricing = JSON.stringify(getLaunchPricingContent(locale));
    const suffix = locale === 'zh' ? '.zh' : '';
    const legal = ['terms', 'privacy', 'cookie']
      .map((slug) => read(`content/pages/${slug}${suffix}.md`))
      .join('\n');

    const publicCopy = `${homepage}\n${pricing}\n${legal}`;

    expect(publicCopy).not.toMatch(/video|视频|影片/i);
    expect(publicCopy).not.toMatch(
      /reference (image|photo)|参考图|参考图片|上传照片/i
    );
    expect(publicCopy).not.toMatch(/priority generation queue|优先生成队列/i);
    expect(publicCopy).not.toMatch(/\bJevailab\b/);
    expect(pricing).not.toMatch(/free trial|免费试用/i);
    expect(legal).toContain('2026-10-21');
  });

  it('does not expose template starter copy on the English About page', () => {
    const messages = JSON.parse(
      read('project.inlang/messages/en.json')
    ) as Record<string, string>;

    expect(messages.about_bio).not.toMatch(/SaaS|faster/i);
    expect(messages.about_description).not.toMatch(/SaaS|faster/i);
    expect(messages.about_bio).toMatch(/AI images?/i);
  });

  it.each([
    'en',
    'zh',
  ] as const)('keeps %s public interface copy aligned with available image features', (locale) => {
    const messages = JSON.parse(
      read(`project.inlang/messages/${locale}.json`)
    ) as Record<string, string>;
    const publicKeys = [
      'about_bio',
      'about_description',
      'about_introduction',
      'footer_tagline',
      'home_hero_title',
      'home_hero_description',
      'jevailab_nav_image_description',
      'site_title',
      'site_description',
    ];
    const copy = publicKeys.map((key) => messages[key]).join('\n');

    expect(copy).not.toMatch(
      /video|视频|影片|reference (image|photo)|参考图|参考图片|上传照片/i
    );
    expect(copy).not.toMatch(/\bJevailab\b/);
  });
});

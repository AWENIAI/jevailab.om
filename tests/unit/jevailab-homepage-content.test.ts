import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getNavbarLinks } from '@/config/navbar-config';
import {
  getJevailabHomepageContent,
  JEVAILAB_ANCHORS,
  PUBLISHED_IMAGE_TEMPLATE_IDS,
} from '@/content/jevailab-homepage';

describe('Jevailab homepage content', () => {
  it.each([
    'zh',
    'en',
  ] as const)('defines complete, crawler-readable %s homepage content', (locale) => {
    const content = getJevailabHomepageContent(locale);

    expect(content.hero.h1.trim()).not.toHaveLength(0);
    expect(content.faq).toHaveLength(10);
    expect(Object.values(JEVAILAB_ANCHORS)).toEqual([
      '#create',
      '#gallery',
      '#about',
      '#features',
      '#how-it-works',
      '#use-cases',
      '#prompt-tips',
      '#tools',
      '#pricing',
      '#faq',
      '#start-now',
    ]);
    expect(content.sections).toEqual(
      expect.arrayContaining([
        JEVAILAB_ANCHORS.create,
        JEVAILAB_ANCHORS.gallery,
        JEVAILAB_ANCHORS.about,
        JEVAILAB_ANCHORS.features,
        JEVAILAB_ANCHORS.howItWorks,
        JEVAILAB_ANCHORS.useCases,
        JEVAILAB_ANCHORS.promptTips,
        JEVAILAB_ANCHORS.tools,
        JEVAILAB_ANCHORS.pricing,
        JEVAILAB_ANCHORS.faq,
        JEVAILAB_ANCHORS.startNow,
      ])
    );
  });

  it('exposes image creation as the only homepage capability', () => {
    const features = getJevailabHomepageContent('en').features;

    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({
      kind: 'image',
      actionLabel: 'Create now',
    });
  });

  it('maps each gallery example to a published public image template', () => {
    for (const example of getJevailabHomepageContent('zh').galleryExamples) {
      expect(PUBLISHED_IMAGE_TEMPLATE_IDS).toContain(example.templateId);
      expect(example.isTemplateExample).toBe(true);
      expect(example.title).not.toMatch(/图片模板 \d{4}/);
    }

    for (const example of getJevailabHomepageContent('en').galleryExamples) {
      expect(example.title).not.toMatch(/Image template \d{4}/);
      expect(example.description).not.toContain(
        'The latest image creation template.'
      );
    }
  });

  it('uses image-only metadata and only active homepage destinations', () => {
    const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
    const zhMessages = JSON.parse(
      readFileSync(`${projectRoot}/project.inlang/messages/zh.json`, 'utf8')
    ) as Record<string, string>;
    const enMessages = JSON.parse(
      readFileSync(`${projectRoot}/project.inlang/messages/en.json`, 'utf8')
    ) as Record<string, string>;
    const items = getNavbarLinks().flatMap((item) => [
      item,
      ...(item.items ?? []),
    ]);
    const hrefs = items.flatMap((item) => (item.href ? [item.href] : []));

    for (const messages of [zhMessages, enMessages]) {
      expect(messages.site_name).toContain('jevailab');
      expect(messages.site_title).toMatch(/AI|图片|Image/);
      expect(messages.site_description.toLowerCase()).toContain('ai');
      expect(Object.values(messages).join(' ')).not.toMatch(/video|视频/i);
    }
    expect(hrefs).toEqual(
      expect.arrayContaining(['/#create', '/launch-pricing'])
    );
    expect(hrefs).not.toContain('/#image');
    expect(hrefs).not.toContain('/pricing');
    expect(hrefs).not.toContain('/#gallery');
    expect(hrefs).not.toContain('/#how-it-works');
    expect(items.some((item) => !item.href && Boolean(item.description))).toBe(
      false
    );
  });
});

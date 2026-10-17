import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getNavbarLinks } from '@/config/navbar-config';
import {
  getPicviloHomepageContent,
  PICVILO_ANCHORS,
  PUBLISHED_IMAGE_TEMPLATE_IDS,
} from '@/content/picvilo-homepage';

describe('PicVilo homepage content', () => {
  it.each([
    'zh',
    'en',
  ] as const)('defines complete, crawler-readable %s homepage content', (locale) => {
    const content = getPicviloHomepageContent(locale);

    expect(content.hero.h1.trim()).not.toHaveLength(0);
    expect(content.faq).toHaveLength(12);
    expect(Object.values(PICVILO_ANCHORS)).toEqual([
      '#create',
      '#gallery',
      '#about',
      '#features',
      '#how-it-works',
      '#use-cases',
      '#photo-tips',
      '#tools',
      '#pricing',
      '#faq',
      '#start-now',
    ]);
    expect(content.sections).toEqual(
      expect.arrayContaining([
        PICVILO_ANCHORS.create,
        PICVILO_ANCHORS.gallery,
        PICVILO_ANCHORS.about,
        PICVILO_ANCHORS.features,
        PICVILO_ANCHORS.howItWorks,
        PICVILO_ANCHORS.useCases,
        PICVILO_ANCHORS.photoTips,
        PICVILO_ANCHORS.tools,
        PICVILO_ANCHORS.pricing,
        PICVILO_ANCHORS.faq,
        PICVILO_ANCHORS.startNow,
      ])
    );
  });

  it('exposes the video creation entry as an active destination', () => {
    const videoFeatures = getPicviloHomepageContent('en').features.filter(
      (feature) => feature.kind === 'video'
    );

    expect(videoFeatures).not.toHaveLength(0);
    expect(videoFeatures.every((feature) => !feature.comingSoon)).toBe(true);
    expect(videoFeatures.every((feature) => feature.actionLabel)).toBe(true);
  });

  it('maps each gallery example to a published public image template', () => {
    for (const example of getPicviloHomepageContent('zh').galleryExamples) {
      expect(PUBLISHED_IMAGE_TEMPLATE_IDS).toContain(example.templateId);
      expect(example.isTemplateExample).toBe(true);
    }
  });

  it('uses generic AI video metadata and only active homepage destinations', () => {
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
      expect(messages.site_name).toContain('PicVilo AI');
      expect(messages.site_title).toMatch(/AI|视频|Video/);
      expect(messages.site_description.toLowerCase()).toContain('ai');
      expect(messages.site_description).toMatch(/video|视频/i);
    }
    expect(hrefs).toEqual(
      expect.arrayContaining(['/#video', '/#image', '/#pricing'])
    );
    expect(hrefs).not.toContain('/#gallery');
    expect(hrefs).not.toContain('/#how-it-works');
    expect(items.some((item) => !item.href && Boolean(item.description))).toBe(
      false
    );
  });
});

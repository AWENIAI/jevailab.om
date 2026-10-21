import { describe, expect, it } from 'vitest';
import { getJevailabHomepageContent } from '@/content/jevailab-homepage';
import { getLaunchPricingContent } from '@/content/launch-pricing';

describe('launch pricing content', () => {
  it.each([
    'zh',
    'en',
  ] as const)('defines the complete bilingual %s launch offer', (locale) => {
    const content = getLaunchPricingContent(locale);

    expect(content.plans.title.trim()).not.toHaveLength(0);
    expect(content.plans.highlights).toHaveLength(3);
    expect(content.plans.items.map((plan) => plan.id)).toEqual([
      'starter',
      'monthly',
      'annual',
    ]);
    expect(content.plans.items.every((plan) => plan.features.length > 0)).toBe(
      true
    );
    expect(content.faq.items).toHaveLength(5);
  });

  it('keeps the launch price and credit allowance internally consistent', () => {
    const zh = getLaunchPricingContent('zh').plans.items;
    const en = getLaunchPricingContent('en').plans.items;

    expect(zh[0]).toMatchObject({
      price: '$9.90',
      regularPrice: '$19.80',
      discountLabel: '50% OFF',
      discountNote: '限时优惠，省 $9.90',
    });
    expect(zh[0].features).toContain('66 积分 ≈ 22 张 1K 图片');
    expect(zh[1]).toMatchObject({
      price: '$19.90',
      priceSuffix: '/月',
    });
    expect(zh[1].features).toContain('180 积分/月 ≈ 60 张 1K 图片');
    expect(zh[2]).toMatchObject({
      price: '$149',
      priceSuffix: '/年',
      priceNote: '约 $12.42/月',
    });
    expect(zh[2].features).toContain(
      '240 积分/月 ≈ 80 张 1K 图片（全年共 2,880 积分）'
    );
    expect(zh[2].features).toContain('积分每月刷新，非一次性到账');

    expect(en[0].features).toContain('66 credits ≈ 22 images at 1K');
    expect(en[1].features).toContain('180 credits/month ≈ 60 images at 1K');
    expect(en[2]).toMatchObject({
      price: '$149',
      priceSuffix: '/year',
      priceNote: 'About $12.42/month',
    });
    expect(en[2].features).toContain(
      '240 credits/month ≈ 80 images at 1K (2,880 credits/year)'
    );
    expect(en[2].features).toContain(
      'Credits refresh monthly, not all at once'
    );
  });

  it('shows the starter launch offer with its regular price and discount', () => {
    for (const locale of ['zh', 'en'] as const) {
      const starter = getLaunchPricingContent(locale).plans.items.find(
        (plan) => plan.id === 'starter'
      );

      expect(starter).toMatchObject({
        price: '$9.90',
        regularPrice: '$19.80',
        discountLabel: '50% OFF',
        discountNote:
          locale === 'zh'
            ? '限时优惠，省 $9.90'
            : 'Limited-time offer. Save $9.90',
        countdownEndsAt: '2026-11-20T00:00:00+08:00',
      });
    }
  });

  it('shows the annual monthly equivalent without a per-image price', () => {
    const zhAnnual = getLaunchPricingContent('zh').plans.items.find(
      (plan) => plan.id === 'annual'
    );
    const enAnnual = getLaunchPricingContent('en').plans.items.find(
      (plan) => plan.id === 'annual'
    );

    expect(zhAnnual?.priceNote).toBe('约 $12.42/月');
    expect(enAnnual?.priceNote).toBe('About $12.42/month');
    expect(zhAnnual?.secondaryPrice).toBeUndefined();
    expect(enAnnual?.secondaryPrice).toBeUndefined();
    expect(JSON.stringify([zhAnnual, enAnnual])).not.toMatch(/\$0\.12/);
  });

  it('refreshes annual credits monthly instead of granting them upfront', () => {
    const zhAnnual = getLaunchPricingContent('zh').plans.items.find(
      (plan) => plan.id === 'annual'
    );
    const enAnnual = getLaunchPricingContent('en').plans.items.find(
      (plan) => plan.id === 'annual'
    );
    const serialized = JSON.stringify([zhAnnual, enAnnual]);

    expect(serialized).not.toMatch(/一次到账|allowance upfront/);
    expect(zhAnnual?.footnote).toContain('积分按月刷新');
    expect(enAnnual?.footnote).toContain('Credits refresh monthly');
  });

  it('uses accurate plan CTAs and omits trial and preview claims', () => {
    const zh = getLaunchPricingContent('zh');
    const en = getLaunchPricingContent('en');
    const zhSerialized = JSON.stringify(zh);
    const enSerialized = JSON.stringify(en);

    expect(zh.plans.items.map((plan) => plan.actionLabel)).toEqual([
      '选择方案',
      '选择方案',
      '选择方案',
    ]);
    expect(zh.finalCta.secondaryAction).toBe('选择方案');
    expect(zhSerialized).not.toContain('立即免费试用');
    expect(zhSerialized).not.toMatch(/试用|免费试用/);
    expect(zhSerialized).not.toContain('这是首发方案预览');

    expect(en.plans.items.map((plan) => plan.actionLabel)).toEqual([
      'Choose plan',
      'Choose plan',
      'Choose plan',
    ]);
    expect(en.finalCta.secondaryAction).toBe('Choose plan');
    expect(enSerialized).not.toContain('Start Free Trial');
    expect(enSerialized).not.toMatch(/trial/i);
    expect(enSerialized).not.toContain('This is a launch-plan preview');
  });

  it.each([
    'zh',
    'en',
  ] as const)('keeps image creation as the only public %s feature', (locale) => {
    const homepage = getJevailabHomepageContent(locale);

    expect(homepage.features).toHaveLength(1);
    expect(homepage.features[0]?.kind).toBe('image');
    expect(JSON.stringify(homepage)).not.toMatch(/video|视频/i);
  });

  it.each([
    'zh',
    'en',
  ] as const)('describes starter credits as image-only in %s', (locale) => {
    const starter = getLaunchPricingContent(locale).plans.items.find(
      (plan) => plan.id === 'starter'
    );
    const serialized = JSON.stringify(starter);

    expect(serialized).not.toMatch(/video|视频/i);
    expect(serialized).toMatch(/image|图片/i);
  });
});

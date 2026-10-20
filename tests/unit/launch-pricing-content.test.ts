import { describe, expect, it } from 'vitest';
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
      '2,880 积分/年 ≈ 960 张 1K 图片（月均 80 张）'
    );

    expect(en[0].features).toContain('66 credits ≈ 22 images at 1K');
    expect(en[1].features).toContain('180 credits/month ≈ 60 images at 1K');
    expect(en[2]).toMatchObject({
      price: '$149',
      priceSuffix: '/year',
      priceNote: 'About $12.42/month',
    });
    expect(en[2].features).toContain(
      '2,880 credits/year ≈ 960 images at 1K (80/month)'
    );
  });

  it('does not claim a historical 50% discount', () => {
    for (const locale of ['zh', 'en'] as const) {
      const content = getLaunchPricingContent(locale);
      const serialized = JSON.stringify(content);

      expect(serialized).not.toMatch(/50%\s*OFF|五折/i);
      expect(serialized).toContain('$19.80');
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
});

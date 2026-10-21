import type { JevailabLocale } from '@/content/jevailab-homepage';

export type LaunchPricingPlanId = 'starter' | 'monthly' | 'annual';

export type LaunchPricingPlan = {
  id: LaunchPricingPlanId;
  eyebrow: string;
  name: string;
  description: string;
  price: string;
  priceSuffix?: string;
  regularPrice?: string;
  discountLabel?: string;
  discountNote?: string;
  priceNote: string;
  secondaryPrice?: string;
  badge?: string;
  countdownLabel?: string;
  countdownEndsAt?: string;
  countdownExpiredLabel?: string;
  features: readonly string[];
  actionLabel: string;
  footnote: string;
};

export type LaunchPricingContent = {
  meta: {
    title: string;
    description: string;
  };
  plans: {
    eyebrow: string;
    title: string;
    description: string;
    highlights: readonly string[];
    items: readonly LaunchPricingPlan[];
  };
  faq: {
    eyebrow: string;
    title: string;
    description: string;
    items: readonly {
      question: string;
      answer: string;
    }[];
  };
  finalCta: {
    eyebrow: string;
    title: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
  };
};

const zh: LaunchPricingContent = {
  meta: {
    title: '首发方案',
    description:
      '查看 jevailab 首发方案：入门包、专业月付与专业年付，含积分额度、商用授权与无水印说明。',
  },
  plans: {
    eyebrow: 'jevailab 首发方案',
    title: '选择你的创作方式',
    description:
      'GPT Image 2，1K 分辨率。选择套餐，使用已发布模板与文字描述生成图片。',
    highlights: ['66 积分 ≈ 22 张 1K 图片', '商用授权', '无水印'],
    items: [
      {
        id: 'starter',
        eyebrow: 'STARTER PACK',
        name: '入门包',
        description: '一次性购买积分，用于后续图片生成。',
        price: '$9.90',
        regularPrice: '$19.80',
        discountLabel: '50% OFF',
        discountNote: '限时优惠，省 $9.90',
        priceNote: '一次性付款',
        countdownLabel: '首发优惠剩余',
        countdownEndsAt: '2026-11-20T00:00:00+08:00',
        countdownExpiredLabel: '首发优惠已结束',
        features: [
          '66 积分 ≈ 22 张 1K 图片',
          '积分用于图片生成',
          '一次性付款，无订阅',
          '积分有效期 12 个月',
          '商用授权',
          '无水印',
        ],
        actionLabel: '立即试用',
        footnote: '一次性付款，购买后积分立即到账。',
      },
      {
        id: 'monthly',
        eyebrow: 'PRO MONTHLY',
        name: '专业月付',
        description: '适合持续创作、需要每月稳定额度的用户。',
        price: '$19.90',
        priceSuffix: '/月',
        priceNote: '随时取消',
        features: [
          '180 积分/月 ≈ 60 张 1K 图片',
          '积分每月刷新',
          '商用授权',
          '无水印',
        ],
        actionLabel: '立即试用',
        footnote: '按月计费，可在账户中随时取消。',
      },
      {
        id: 'annual',
        eyebrow: 'PRO ANNUAL',
        name: '专业年付',
        description: '适合已经确定会持续使用的创作者。',
        price: '$149',
        priceSuffix: '/年',
        priceNote: '约 $12.42/月',
        badge: '最划算',
        features: [
          '240 积分/月 ≈ 80 张 1K 图片（全年共 2,880 积分）',
          '积分每月刷新，非一次性到账',
          '商用授权',
        ],
        actionLabel: '立即试用',
        footnote: '一次付款，积分按月刷新，全年按自己的节奏生成。',
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: '购买前，先把规则说清楚',
    description: '关于积分、有效期、失败处理和商用授权。',
    items: [
      {
        question: '什么是积分？',
        answer:
          '积分是图片生成时使用的额度。实际消耗以提交时工作台显示的服务端报价为准。',
      },
      {
        question: '积分会过期吗？',
        answer:
          '入门包积分自购买起 12 个月内有效。订阅方案积分按账单周期刷新，具体以结算页和账户说明为准。',
      },
      {
        question: '如果生成失败怎么办？',
        answer:
          '生成失败时不会消耗积分。请先刷新账户余额确认；如仍有异常，请通过联系页面提供订单与生成记录。',
      },
      {
        question: '图片可以商用吗？',
        answer:
          '所有付费方案均包含商用使用权。你仍需确保提示词和最终用途不侵犯第三方权利。',
      },
      {
        question: '订阅可以取消吗？',
        answer:
          '可以。订阅可在账户中随时取消，已付费周期结束前仍可继续使用。具体入口以实际上线后的账户页面为准。',
      },
    ],
  },
  finalCta: {
    eyebrow: '准备好开始了吗？',
    title: '把下一次灵感，变成一张真实图片。',
    description: '选择一个方向，写下你的想法，先在 jevailab 试试看。',
    primaryAction: '开始创作',
    secondaryAction: '立即试用',
  },
};

const en: LaunchPricingContent = {
  meta: {
    title: 'Launch Pricing',
    description:
      'Explore jevailab launch plans: Starter Pack, Pro Monthly, and Pro Annual, with credit allowances, commercial rights, and watermark-free images.',
  },
  plans: {
    eyebrow: 'jevailab launch pricing',
    title: 'Choose how you create',
    description:
      'GPT Image 2 at 1K resolution. Choose a plan and create images from published templates and text descriptions.',
    highlights: [
      '66 credits ≈ 22 images at 1K',
      'Commercial rights',
      'No watermark',
    ],
    items: [
      {
        id: 'starter',
        eyebrow: 'STARTER PACK',
        name: 'Starter Pack',
        description: 'Buy credits once for image generation.',
        price: '$9.90',
        regularPrice: '$19.80',
        discountLabel: '50% OFF',
        discountNote: 'Limited-time offer. Save $9.90',
        priceNote: 'one-time payment',
        countdownLabel: 'Launch offer ends in',
        countdownEndsAt: '2026-11-20T00:00:00+08:00',
        countdownExpiredLabel: 'Launch offer ended',
        features: [
          '66 credits ≈ 22 images at 1K',
          'Credits work for image generation',
          'One-time payment, no subscription',
          'Credits valid for 12 months',
          'Commercial usage rights',
          'No watermark',
        ],
        actionLabel: 'Try now',
        footnote: 'One-time payment. Credits are available immediately.',
      },
      {
        id: 'monthly',
        eyebrow: 'PRO MONTHLY',
        name: 'Pro Monthly',
        description: 'For creators who want a steady monthly allowance.',
        price: '$19.90',
        priceSuffix: '/month',
        priceNote: 'Cancel anytime',
        features: [
          '180 credits/month ≈ 60 images at 1K',
          'Credits refresh every month',
          'Commercial usage rights',
          'No watermark',
        ],
        actionLabel: 'Try now',
        footnote: 'Billed monthly. Cancel anytime from your account.',
      },
      {
        id: 'annual',
        eyebrow: 'PRO ANNUAL',
        name: 'Pro Annual',
        description:
          'For creators who already know they will keep making images.',
        price: '$149',
        priceSuffix: '/year',
        priceNote: 'About $12.42/month',
        badge: 'Best value',
        features: [
          '240 credits/month ≈ 80 images at 1K (2,880 credits/year)',
          'Credits refresh monthly, not all at once',
          'Commercial usage rights',
        ],
        actionLabel: 'Try now',
        footnote:
          'One payment. Credits refresh monthly so you can create at your own pace all year.',
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Clear rules before you buy',
    description:
      'How credits work, when they expire, failed generations, and commercial use.',
    items: [
      {
        question: "What's a credit?",
        answer:
          'Credits are used for image generation. The server quote shown in the workspace at submission is the source of truth.',
      },
      {
        question: 'Do credits expire?',
        answer:
          'Starter Pack credits are valid for 12 months from purchase. Subscription credits refresh with each billing cycle; check the checkout and account details for the applicable terms.',
      },
      {
        question: 'What happens if a generation fails?',
        answer:
          'A failed generation does not consume credits. Refresh your account balance first; if the issue persists, contact support with your order and generation details.',
      },
      {
        question: 'Can I use the images commercially?',
        answer:
          'Yes. Every paid plan includes commercial usage rights. You are still responsible for ensuring your prompts and final use do not infringe third-party rights.',
      },
      {
        question: 'Can I cancel a subscription?',
        answer:
          'Yes. Subscriptions can be canceled from your account, and access continues through the end of the paid period. The exact control will be available in the live account experience.',
      },
    ],
  },
  finalCta: {
    eyebrow: 'Ready to begin?',
    title: 'Turn your next idea into a real image.',
    description:
      'Choose a direction, describe your idea, and give jevailab a try.',
    primaryAction: 'Start creating',
    secondaryAction: 'Try now',
  },
};

const launchPricingContent: Record<JevailabLocale, LaunchPricingContent> = {
  en,
  zh,
};

export function getLaunchPricingContent(
  locale: JevailabLocale
): LaunchPricingContent {
  return launchPricingContent[locale];
}

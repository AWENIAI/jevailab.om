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
  priceNote: string;
  secondaryPrice?: string;
  badge?: string;
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
  comparison: {
    eyebrow: string;
    title: string;
    description: string;
    left: {
      label: string;
      price: string;
      detail: string;
    };
    right: {
      label: string;
      price: string;
      detail: string;
    };
    actionLabel: string;
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
  notice: {
    title: string;
    description: string;
    points: readonly string[];
    actionLabel: string;
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
    description: 'GPT Image 2，1K 分辨率。选一个套餐，30 秒开始生成。',
    highlights: ['66 积分 ≈ 22 张 1K 图片', '商用授权', '无水印'],
    items: [
      {
        id: 'starter',
        eyebrow: 'STARTER PACK',
        name: '入门包',
        description: '无需订阅，先体验 GPT Image 2 的出图质量。',
        price: '$9.90',
        regularPrice: '$19.80',
        priceNote: '一次性付款',
        badge: '首发价',
        features: [
          '66 积分 ≈ 22 张 1K 图片',
          '一次性付款，无订阅',
          '积分有效期 12 个月',
          '商用授权',
          '无水印',
        ],
        actionLabel: '查看当前方案',
        footnote: '首发价 $9.90，活动结束后恢复为 $19.80。',
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
          '优先生成队列',
        ],
        actionLabel: '查看当前方案',
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
          '2,880 积分/年 ≈ 960 张 1K 图片（月均 80 张）',
          '全年积分一次到账',
          '商用授权',
          '优先生成队列',
        ],
        actionLabel: '查看当前方案',
        footnote: '一次付款，全年按自己的节奏生成。',
      },
    ],
  },
  comparison: {
    eyebrow: '同样的积分，不同的节奏',
    title: '66 积分 ≈ 22 张，2,880 积分 ≈ 960 张 1K 图片。',
    description:
      '入门包适合先试试，年付适合持续创作。积分也可用于后续视频生成，图片张数仅为当前 1K 图片的估算。',
    left: {
      label: '入门包',
      price: '$9.90',
      detail: '66 积分 ≈ 22 张 1K 图片',
    },
    right: {
      label: '专业年付',
      price: '$12.42/月',
      detail: '2,880 积分 ≈ 960 张 1K 图片',
    },
    actionLabel: '查看当前方案',
  },
  faq: {
    eyebrow: 'FAQ',
    title: '购买前，先把规则说清楚',
    description: '关于积分、有效期、失败处理和商用授权。',
    items: [
      {
        question: '什么是积分？',
        answer:
          '积分是生成内容时使用的通用额度，目前可用于生成图片，后续也可用于生成视频。按当前 1K 图片消耗估算，约 3 积分生成 1 张；实际消耗以提交时工作台显示的服务端报价为准。',
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
          '所有付费方案均包含商用使用权。你仍需确保上传素材、提示词和最终用途不侵犯第三方权利。',
      },
      {
        question: '订阅可以取消吗？',
        answer:
          '可以。订阅可在账户中随时取消，已付费周期结束前仍可继续使用。具体入口以实际上线后的账户页面为准。',
      },
    ],
  },
  notice: {
    title: '这是首发方案预览',
    description:
      '附件中的价格与积分方案正在整理中。当前支付页展示的是已配置方案，购买前请以结算页的价格、额度和条款为准。',
    points: [
      '购买按钮会带你查看当前可用的方案',
      '实际积分消耗以提交生成时的服务端报价为准',
      '首发价格与活动时间以正式上线信息为准',
    ],
    actionLabel: '查看当前方案',
  },
  finalCta: {
    eyebrow: '准备好开始了吗？',
    title: '把下一次灵感，变成一张真实图片。',
    description: '选择一个方向，写下你的想法，先在 jevailab 试试看。',
    primaryAction: '开始创作',
    secondaryAction: '查看当前方案',
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
      'GPT Image 2 at 1K resolution. Pick a pack and start generating in 30 seconds.',
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
        description:
          'Try GPT Image 2 output quality without starting a subscription.',
        price: '$9.90',
        regularPrice: '$19.80',
        priceNote: 'one-time payment',
        badge: 'Launch price',
        features: [
          '66 credits ≈ 22 images at 1K',
          'One-time payment, no subscription',
          'Credits valid for 12 months',
          'Commercial usage rights',
          'No watermark',
        ],
        actionLabel: 'View current plans',
        footnote: 'Launch price $9.90. Regular price $19.80 after the launch.',
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
          'Priority generation queue',
        ],
        actionLabel: 'View current plans',
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
          '2,880 credits/year ≈ 960 images at 1K (80/month)',
          'Full annual credit allowance upfront',
          'Commercial usage rights',
          'Priority generation queue',
        ],
        actionLabel: 'View current plans',
        footnote: 'One payment. A full year of images at your own pace.',
      },
    ],
  },
  comparison: {
    eyebrow: 'Same credits, a different rhythm',
    title: '66 credits ≈ 22 images, or 2,880 credits ≈ 960 images at 1K.',
    description:
      'Starter is for trying the product. Annual is for keeping a steady flow. Credits will also work for future video generation; image counts are estimates for current 1K images only.',
    left: {
      label: 'Starter Pack',
      price: '$9.90',
      detail: '66 credits ≈ 22 images at 1K',
    },
    right: {
      label: 'Pro Annual',
      price: '$12.42/month',
      detail: '2,880 credits ≈ 960 images at 1K',
    },
    actionLabel: 'View current plans',
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
          'Credits are a shared allowance for content generation. They can currently be used for images and will also work for video generation later. At current 1K image usage, about 3 credits generate 1 image; the server quote shown in the workspace at submission is the source of truth.',
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
          'Yes. Every paid plan includes commercial usage rights. You are still responsible for ensuring your reference materials, prompts, and final use do not infringe third-party rights.',
      },
      {
        question: 'Can I cancel a subscription?',
        answer:
          'Yes. Subscriptions can be canceled from your account, and access continues through the end of the paid period. The exact control will be available in the live account experience.',
      },
    ],
  },
  notice: {
    title: 'This is a launch-plan preview',
    description:
      'The prices and credit allowances in this brief are still being prepared. The current pricing page shows the plans that are configured today. Check the checkout page for the applicable price, allowance, and terms before buying.',
    points: [
      'Purchase buttons take you to the plans available today',
      'The server quote at generation time controls actual credit use',
      'Launch pricing and timing will be confirmed when the offer goes live',
    ],
    actionLabel: 'View current plans',
  },
  finalCta: {
    eyebrow: 'Ready to begin?',
    title: 'Turn your next idea into a real image.',
    description:
      'Choose a direction, describe your idea, and give jevailab a try.',
    primaryAction: 'Start creating',
    secondaryAction: 'View current plans',
  },
};

export function getLaunchPricingContent(
  locale: JevailabLocale
): LaunchPricingContent {
  return locale === 'zh' ? zh : en;
}

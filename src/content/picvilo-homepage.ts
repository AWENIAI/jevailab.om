export const PICVILO_ANCHORS = {
  create: '#create',
  gallery: '#gallery',
  about: '#about',
  features: '#features',
  howItWorks: '#how-it-works',
  useCases: '#use-cases',
  photoTips: '#photo-tips',
  tools: '#tools',
  pricing: '#pricing',
  faq: '#faq',
  startNow: '#start-now',
} as const;

export const PUBLISHED_IMAGE_TEMPLATE_IDS = [
  'image-template-1015',
  'image-template-1014',
  'image-template-1013',
  'image-template-1012',
  'image-template-1011',
  'image-template-1010',
] as const;

export type PicviloLocale = 'zh' | 'en';
export type PublishedImageTemplateId =
  (typeof PUBLISHED_IMAGE_TEMPLATE_IDS)[number];

export type PicviloFeature = {
  title: string;
  description: string;
  kind: 'image' | 'video';
  comingSoon: boolean;
  actionLabel?: string;
};

type GalleryExample = {
  title: string;
  description: string;
  imageUrl: string;
  templateId: PublishedImageTemplateId;
  isTemplateExample: true;
};

type FaqItem = {
  question: string;
  answer: string;
};

type PicviloHomepageContent = {
  hero: {
    eyebrow: string;
    h1: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
    videoNote: string;
  };
  sections: readonly string[];
  about: {
    title: string;
    description: string;
    points: readonly string[];
  };
  gallery: {
    title: string;
    description: string;
    label: string;
  };
  galleryExamples: readonly GalleryExample[];
  features: readonly PicviloFeature[];
  howItWorks: {
    title: string;
    steps: readonly { title: string; description: string }[];
  };
  useCases: {
    title: string;
    items: readonly { title: string; description: string }[];
  };
  photoTips: {
    title: string;
    description: string;
    tips: readonly string[];
  };
  tools: {
    title: string;
    description: string;
    imageLabel: string;
    videoLabel: string;
    videoNote: string;
  };
  pricing: {
    title: string;
    description: string;
    actionLabel: string;
  };
  faq: readonly FaqItem[];
  finalCta: {
    title: string;
    description: string;
    actionLabel: string;
  };
};

export function isPlannedVideoFeature(feature: PicviloFeature): boolean {
  return feature.kind === 'video' && feature.comingSoon;
}

const zh: PicviloHomepageContent = {
  hero: {
    eyebrow: 'PicVilo AI 创作工作台',
    h1: '一张照片，一段灵感，创作你的 AI 图片与视频',
    description:
      '从模板、文字或一张参考图开始。现在即可创建 AI 图片，也可以用照片制作 AI 视频。',
    primaryAction: '开始创作图片',
    secondaryAction: '浏览模板示例',
    videoNote: '进入视频创作',
  },
  sections: Object.values(PICVILO_ANCHORS),
  about: {
    title: '什么是 PicVilo AI？',
    description:
      'PicVilo AI 是面向日常创作的 AI 图片工作台。选择风格、补充灵感，再由清晰的参数和积分提示帮助你完成创作。',
    points: ['从照片或文字开始', '使用可见的模板风格', '在生成前了解所需积分'],
  },
  gallery: {
    title: '从一个视觉方向开始',
    description: '下面展示的是模板效果示例，不是其他用户的公开作品。',
    label: '模板效果示例',
  },
  galleryExamples: [
    {
      title: '图片模板 1015',
      description: '最新收录的图片创作模板。',
      imageUrl: '/images/image-templates/1015.png',
      templateId: 'image-template-1015',
      isTemplateExample: true,
    },
    {
      title: '图片模板 1014',
      description: '最新收录的图片创作模板。',
      imageUrl: '/images/image-templates/1014.png',
      templateId: 'image-template-1014',
      isTemplateExample: true,
    },
    {
      title: '图片模板 1013',
      description: '最新收录的图片创作模板。',
      imageUrl: '/images/image-templates/1013.png',
      templateId: 'image-template-1013',
      isTemplateExample: true,
    },
    {
      title: '图片模板 1012',
      description: '最新收录的图片创作模板。',
      imageUrl: '/images/image-templates/1012.png',
      templateId: 'image-template-1012',
      isTemplateExample: true,
    },
    {
      title: '图片模板 1011',
      description: '最新收录的图片创作模板。',
      imageUrl: '/images/image-templates/1011.png',
      templateId: 'image-template-1011',
      isTemplateExample: true,
    },
    {
      title: '图片模板 1010',
      description: '最新收录的图片创作模板。',
      imageUrl: '/images/image-templates/1010.png',
      templateId: 'image-template-1010',
      isTemplateExample: true,
    },
  ],
  features: [
    {
      title: 'AI 图片创作',
      description: '从文字、模板与可选参考图开始生成图片。',
      kind: 'image',
      comingSoon: false,
      actionLabel: '现在开始',
    },
    {
      title: 'AI 视频创作',
      description: '上传一张照片，选择视频示例与生成设置后开始创作。',
      kind: 'video',
      comingSoon: false,
      actionLabel: '创作视频',
    },
  ],
  howItWorks: {
    title: '三步完成一张 AI 图片',
    steps: [
      { title: '选择风格', description: '从已发布的模板中挑选一个视觉方向。' },
      {
        title: '补充灵感',
        description: '描述画面需求，也可上传一张参考图片。',
      },
      {
        title: '生成并保存',
        description: '确认积分消耗后生成，并在创作记录中查看结果。',
      },
    ],
  },
  useCases: {
    title: '为不同灵感而生',
    items: [
      { title: '个人头像', description: '把日常照片变成更有风格的人像。' },
      { title: '社交内容', description: '为帖子、封面和活动准备视觉素材。' },
      { title: '品牌灵感', description: '快速探索产品、海报与视觉方向。' },
      {
        title: '礼物与纪念',
        description: '把故事、宠物和旅行片段变成特别画面。',
      },
    ],
  },
  photoTips: {
    title: '让参考图更好地帮助创作',
    description: '一张清晰、主体明确的图片通常会带来更稳定的结果。',
    tips: [
      '主体清晰，避免过度压缩',
      '尽量使用正面或完整构图',
      '在提示词里说明你希望保留或改变的部分',
    ],
  },
  tools: {
    title: '创作工具',
    description: '选择 AI 图片或 AI 视频工具，按你的创作目标开始。',
    imageLabel: 'AI 图片创作',
    videoLabel: 'AI 视频创作',
    videoNote: '进入视频创作',
  },
  pricing: {
    title: '按创作需求使用积分',
    description:
      '每次生成前都会显示本次所需积分，实际消耗以提交时的服务端报价为准。',
    actionLabel: '查看创作积分',
  },
  faq: [
    {
      question: 'PicVilo AI 现在可以做什么？',
      answer: '你现在可以使用模板、文字和可选参考图创建 AI 图片。',
    },
    {
      question: 'AI 视频可以使用了吗？',
      answer: '可以。上传一张照片，选择视频示例与生成设置后即可开始创作。',
    },
    {
      question: '我一定要上传照片吗？',
      answer: '不一定。你可以只使用模板和文字描述开始创作。',
    },
    {
      question: '参考图会公开吗？',
      answer: '不会。你的参考图仅用于本次私密创作流程，不会作为公开模板展示。',
    },
    {
      question: '模板里的示例图来自哪里？',
      answer: '它们是 PicVilo AI 提供的模板效果示例，不是用户公开作品。',
    },
    {
      question: '图片比例可以选择吗？',
      answer: '可以。工作台提供多种输出比例，并会在生成前显示当前选择。',
    },
    {
      question: '一次可以生成几张图？',
      answer: '可以在工作台中选择生成数量，实际积分会随数量和清晰度更新。',
    },
    {
      question: '生成前如何知道会消耗多少积分？',
      answer: '提交前会显示服务端计算的积分报价，请以该报价为准。',
    },
    {
      question: '可以把我的图片用于模板吗？',
      answer: '目前只支持选择已发布的模板。模板管理后台不在当前版本范围内。',
    },
    {
      question: '为什么有些模板不能上传参考图？',
      answer: '不同模板有不同的输入规则，工作台会在选择后提示是否支持参考图。',
    },
    {
      question: '如果结果不符合预期怎么办？',
      answer: '尝试更具体地描述光线、构图、颜色和主体，也可以更换模板方向。',
    },
    {
      question: '我的创作记录在哪里？',
      answer: '登录后可在创作工作台的创作记录区域查看自己的生成结果。',
    },
  ],
  finalCta: {
    title: '把灵感变成下一张图片',
    description: '选择一个模板，写下你的想法，现在就开始创作。',
    actionLabel: '开始创作',
  },
};

const en: PicviloHomepageContent = {
  hero: {
    eyebrow: 'PicVilo AI creative workspace',
    h1: 'Create AI images and videos from a photo and an idea',
    description:
      'Start from a template, a prompt, or one reference photo. Create AI images now, or turn a photo into an AI video.',
    primaryAction: 'Create an image',
    secondaryAction: 'Explore templates',
    videoNote: 'Open video creator',
  },
  sections: Object.values(PICVILO_ANCHORS),
  about: {
    title: 'What is PicVilo AI?',
    description:
      'PicVilo AI is an everyday creative workspace for AI images. Choose a visual direction, add your idea, and create with clear settings and credit guidance.',
    points: [
      'Start from a photo or text',
      'Use visible template styles',
      'See credit use before generating',
    ],
  },
  gallery: {
    title: 'Begin with a visual direction',
    description:
      'These are template examples from PicVilo AI, not public user creations.',
    label: 'Template example',
  },
  galleryExamples: [
    {
      title: 'Image template 1015',
      description: 'The latest image creation template.',
      imageUrl: '/images/image-templates/1015.png',
      templateId: 'image-template-1015',
      isTemplateExample: true,
    },
    {
      title: 'Image template 1014',
      description: 'The latest image creation template.',
      imageUrl: '/images/image-templates/1014.png',
      templateId: 'image-template-1014',
      isTemplateExample: true,
    },
    {
      title: 'Image template 1013',
      description: 'The latest image creation template.',
      imageUrl: '/images/image-templates/1013.png',
      templateId: 'image-template-1013',
      isTemplateExample: true,
    },
    {
      title: 'Image template 1012',
      description: 'The latest image creation template.',
      imageUrl: '/images/image-templates/1012.png',
      templateId: 'image-template-1012',
      isTemplateExample: true,
    },
    {
      title: 'Image template 1011',
      description: 'The latest image creation template.',
      imageUrl: '/images/image-templates/1011.png',
      templateId: 'image-template-1011',
      isTemplateExample: true,
    },
    {
      title: 'Image template 1010',
      description: 'The latest image creation template.',
      imageUrl: '/images/image-templates/1010.png',
      templateId: 'image-template-1010',
      isTemplateExample: true,
    },
  ],
  features: [
    {
      title: 'AI image creation',
      description:
        'Create images from text, templates, and an optional reference photo.',
      kind: 'image',
      comingSoon: false,
      actionLabel: 'Create now',
    },
    {
      title: 'AI video creation',
      description:
        'Upload one photo, choose a video example and generation settings, then create.',
      kind: 'video',
      comingSoon: false,
      actionLabel: 'Create video',
    },
  ],
  howItWorks: {
    title: 'Create an AI image in three steps',
    steps: [
      {
        title: 'Choose a style',
        description: 'Select a visual direction from the published templates.',
      },
      {
        title: 'Add your idea',
        description:
          'Describe the image you want and optionally upload one reference photo.',
      },
      {
        title: 'Generate and save',
        description:
          'Review the credit quote, generate, and find your result in creation history.',
      },
    ],
  },
  useCases: {
    title: 'Made for everyday ideas',
    items: [
      {
        title: 'Personal portraits',
        description: 'Turn everyday photos into a more distinctive portrait.',
      },
      {
        title: 'Social content',
        description: 'Create visuals for posts, covers, and announcements.',
      },
      {
        title: 'Brand exploration',
        description:
          'Explore product, poster, and campaign directions quickly.',
      },
      {
        title: 'Gifts and memories',
        description: 'Turn stories, pets, and trips into special images.',
      },
    ],
  },
  photoTips: {
    title: 'Help your reference photo work better',
    description:
      'A clear image with an obvious subject usually produces a more reliable result.',
    tips: [
      'Keep the subject clear and avoid heavy compression',
      'Use a front-facing or complete composition where possible',
      'Describe what you want to preserve or change in your prompt',
    ],
  },
  tools: {
    title: 'Creative tools',
    description:
      'Choose the AI image or AI video tool that fits what you want to create.',
    imageLabel: 'AI image creator',
    videoLabel: 'AI video creator',
    videoNote: 'Open video creator',
  },
  pricing: {
    title: 'Use credits for the work you create',
    description:
      'The workspace shows the credits required before each generation. The server quote at submission is the source of truth.',
    actionLabel: 'View creation credits',
  },
  faq: [
    {
      question: 'What can PicVilo AI do today?',
      answer:
        'You can create AI images with templates, text, and an optional reference photo.',
    },
    {
      question: 'Is AI video available?',
      answer:
        'Yes. Upload one photo, choose a video example and generation settings, then start creating.',
    },
    {
      question: 'Do I need to upload a photo?',
      answer: 'No. You can start with a template and a text description.',
    },
    {
      question: 'Will my reference photo be public?',
      answer:
        'No. It is used only in your private creation flow and is not displayed as a public template.',
    },
    {
      question: 'Where do template examples come from?',
      answer:
        'They are PicVilo AI template examples, not public user creations.',
    },
    {
      question: 'Can I choose an image ratio?',
      answer:
        'Yes. The workspace offers several output ratios and shows your active choice before generation.',
    },
    {
      question: 'How many images can I generate at once?',
      answer:
        'Choose an output count in the workspace; the credit quote updates with count and quality.',
    },
    {
      question: 'How do I know the credit cost?',
      answer:
        'The workspace shows a server-calculated quote before submission. Please use that quote as the source of truth.',
    },
    {
      question: 'Can I turn my image into a template?',
      answer:
        'This version supports published templates only. A template management backend is not included.',
    },
    {
      question: 'Why do some templates not accept a reference photo?',
      answer:
        'Each template has its own input rules, and the workspace explains whether it supports a reference photo.',
    },
    {
      question: 'What if my result is not what I expected?',
      answer:
        'Try more specific notes about light, composition, color, and subject, or choose another template direction.',
    },
    {
      question: 'Where is my creation history?',
      answer:
        'After signing in, find your own results in the creation-history area of the workspace.',
    },
  ],
  finalCta: {
    title: 'Turn your next idea into an image',
    description:
      'Choose a template, describe your idea, and start creating now.',
    actionLabel: 'Start creating',
  },
};

export function getPicviloHomepageContent(
  locale: PicviloLocale
): PicviloHomepageContent {
  return locale === 'zh' ? zh : en;
}

export type { FaqItem, GalleryExample, PicviloHomepageContent };

import type { Locale } from '@/lib/locale';

export const JEVAILAB_ANCHORS = {
  create: '#create',
  gallery: '#gallery',
  about: '#about',
  features: '#features',
  howItWorks: '#how-it-works',
  useCases: '#use-cases',
  promptTips: '#prompt-tips',
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

export type JevailabLocale = Extract<Locale, 'en' | 'zh'>;
export type PublishedImageTemplateId =
  (typeof PUBLISHED_IMAGE_TEMPLATE_IDS)[number];

export type JevailabFeature = {
  title: string;
  description: string;
  kind: 'image';
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

type JevailabHomepageContent = {
  hero: {
    eyebrow: string;
    h1: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
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
  features: readonly JevailabFeature[];
  howItWorks: {
    title: string;
    steps: readonly { title: string; description: string }[];
  };
  useCases: {
    title: string;
    items: readonly { title: string; description: string }[];
  };
  promptTips: {
    title: string;
    description: string;
    tips: readonly string[];
  };
  tools: {
    title: string;
    description: string;
    imageLabel: string;
    posterMakerAction: string;
  };
  pricing: {
    title: string;
    description: string;
    actionLabel: string;
  };
  faqTitle: string;
  faq: readonly FaqItem[];
  finalCta: {
    eyebrow: string;
    title: string;
    description: string;
    actionLabel: string;
  };
};

const zh: JevailabHomepageContent = {
  hero: {
    eyebrow: 'jevailab 创作工作台',
    h1: '从模板与文字，创作你的 AI 图片',
    description:
      '选择已发布模板，补充文字描述并设定画面比例，即可生成你的 AI 图片。',
    primaryAction: '开始创作图片',
    secondaryAction: '浏览模板示例',
  },
  sections: Object.values(JEVAILAB_ANCHORS),
  about: {
    title: '什么是 jevailab？',
    description:
      'jevailab 是面向日常创作的 AI 图片工作台。你可以选择模板、补充文字描述，并在生成前确认比例和积分消耗。',
    points: ['从模板或文字开始', '使用已发布的视觉模板', '生成前确认积分消耗'],
  },
  gallery: {
    title: '从一个视觉方向开始',
    description: '下面展示的是模板效果示例，不是其他用户的公开作品。',
    label: '模板效果示例',
  },
  galleryExamples: [
    {
      title: '夏日云际编辑肖像',
      description: '蓝天人物与夏日海报质感的肖像风格。',
      imageUrl: '/images/image-templates/1015.png',
      templateId: 'image-template-1015',
      isTemplateExample: true,
    },
    {
      title: '趣味猫咪蜡笔海报',
      description: '童趣蜡笔插画与温暖日常氛围结合的轻松海报风格。',
      imageUrl: '/images/image-templates/1014.png',
      templateId: 'image-template-1014',
      isTemplateExample: true,
    },
    {
      title: '蓝天跃动艺术海报',
      description: '用明亮蓝天和动态姿态呈现轻盈的艺术海报。',
      imageUrl: '/images/image-templates/1013.png',
      templateId: 'image-template-1013',
      isTemplateExample: true,
    },
    {
      title: '彩伞图案艺术海报',
      description: '以重复图案、柔和色彩和生活细节构成艺术海报。',
      imageUrl: '/images/image-templates/1012.png',
      templateId: 'image-template-1012',
      isTemplateExample: true,
    },
    {
      title: '青春骑行纪念海报',
      description: '把日常骑行画面转化为温暖、充满故事感的纪念海报。',
      imageUrl: '/images/image-templates/1011.png',
      templateId: 'image-template-1011',
      isTemplateExample: true,
    },
    {
      title: '春日风筝旅行海报',
      description: '以春日色彩和风中图案营造轻快的旅行视觉。',
      imageUrl: '/images/image-templates/1010.png',
      templateId: 'image-template-1010',
      isTemplateExample: true,
    },
  ],
  features: [
    {
      title: 'AI 图片创作',
      description: '从已发布模板与文字描述开始，生成静态图片。',
      kind: 'image',
      actionLabel: '现在开始',
    },
  ],
  howItWorks: {
    title: '三步完成一张 AI 图片',
    steps: [
      { title: '选择风格', description: '从已发布的模板中挑选一个视觉方向。' },
      {
        title: '描述画面',
        description: '写下主体、场景、风格和氛围，让画面更接近你的想法。',
      },
      {
        title: '确认并生成',
        description: '选择画面比例，确认积分报价后生成并下载图片。',
      },
    ],
  },
  useCases: {
    title: '为不同灵感而生',
    items: [
      { title: '个人视觉', description: '探索更有风格的人物与生活画面。' },
      { title: '社交内容', description: '为帖子、封面和活动准备图片素材。' },
      { title: '品牌灵感', description: '快速探索产品、海报与视觉方向。' },
      {
        title: '礼物与纪念',
        description: '用文字把故事、宠物和旅行灵感变成特别画面。',
      },
    ],
  },
  promptTips: {
    title: '写出更清晰的图片描述',
    description: '具体描述主体、环境、光线和风格，通常更容易得到预期结果。',
    tips: [
      '先写清主体与主要动作',
      '补充场景、光线、颜色和构图',
      '用简短、明确的句子表达重点',
    ],
  },
  tools: {
    title: '创作工具',
    description: '选择图片模板与画面比例，按你的创作目标开始。',
    imageLabel: 'AI 图片创作',
    posterMakerAction: '探索 AI 海报制作器',
  },
  pricing: {
    title: '按创作需求使用积分',
    description:
      '每次生成前都会显示本次所需积分，实际消耗以提交时的服务端报价为准。',
    actionLabel: '查看创作积分',
  },
  faqTitle: '常见问题',
  faq: [
    {
      question: 'jevailab 现在可以做什么？',
      answer: '你可以选择已发布模板并填写文字描述，生成并下载静态 AI 图片。',
    },
    {
      question: '创作图片需要上传素材吗？',
      answer: '当前图片工作台不需要上传素材。选择模板并填写文字描述即可开始。',
    },
    {
      question: '可以不使用模板吗？',
      answer: '可以。选择“自由创作”并填写文字描述，即可从想法开始生成。',
    },
    {
      question: '模板里的示例图来自哪里？',
      answer: '它们是 jevailab 提供的模板效果示例，不是用户公开作品。',
    },
    {
      question: '图片比例可以选择吗？',
      answer: '可以。工作台提供多种输出比例，并会在生成前显示当前选择。',
    },
    {
      question: '一次可以生成几张图？',
      answer:
        '当前界面使用所选模板的默认生成设置；提交前显示的积分报价为实际扣费依据。',
    },
    {
      question: '生成前如何知道会消耗多少积分？',
      answer: '提交前会显示服务端计算的积分报价，请以该报价为准。',
    },
    {
      question: '可以把我的图片用于模板吗？',
      answer: '当前版本支持选择已发布的模板，暂不支持创建或管理模板。',
    },
    {
      question: '生成内容会经过审核吗？',
      answer:
        '会。文字描述和生成结果可能经过自动或人工辅助审核；不符合安全要求的内容可能无法生成或展示。',
    },
    {
      question: '如果结果不符合预期怎么办？',
      answer: '尝试更具体地描述光线、构图、颜色和主体，也可以更换模板方向。',
    },
  ],
  finalCta: {
    eyebrow: '默认私密',
    title: '把灵感变成下一张图片',
    description: '选择一个模板，写下你的想法，现在就开始创作。',
    actionLabel: '开始创作',
  },
};

const en: JevailabHomepageContent = {
  hero: {
    eyebrow: 'jevailab creative workspace',
    h1: 'AI Poster Maker — Turn a Photo or Prompt into a Poster',
    description:
      'Choose a published template, describe your idea, set an image ratio, and create an AI image.',
    primaryAction: 'Create an image',
    secondaryAction: 'Explore templates',
  },
  sections: Object.values(JEVAILAB_ANCHORS),
  about: {
    title: 'What is jevailab?',
    description:
      'jevailab is an everyday AI image workspace. Choose a template, add a text description, and confirm the aspect ratio and credit cost before you generate.',
    points: [
      'Start from a template or text',
      'Use published visual templates',
      'Confirm credit cost before generating',
    ],
  },
  gallery: {
    title: 'Begin with a visual direction',
    description:
      'These are template examples from jevailab, not public user creations.',
    label: 'Template example',
  },
  galleryExamples: [
    {
      title: 'Summer Sky Editorial Portrait',
      description:
        'A blue-sky editorial portrait with a soft summer poster finish.',
      imageUrl: '/images/image-templates/1015.png',
      templateId: 'image-template-1015',
      isTemplateExample: true,
    },
    {
      title: 'Playful Cat Crayon Poster',
      description:
        'A lighthearted poster style blending crayon illustration with cozy everyday moments.',
      imageUrl: '/images/image-templates/1014.png',
      templateId: 'image-template-1014',
      isTemplateExample: true,
    },
    {
      title: 'Blue Sky Motion Poster',
      description:
        'A bright art-poster style built around blue skies and expressive motion.',
      imageUrl: '/images/image-templates/1013.png',
      templateId: 'image-template-1013',
      isTemplateExample: true,
    },
    {
      title: 'Colorful Umbrella Art Poster',
      description:
        'An art-poster composition built from repeating patterns and soft color.',
      imageUrl: '/images/image-templates/1012.png',
      templateId: 'image-template-1012',
      isTemplateExample: true,
    },
    {
      title: 'Forever Young Ride Poster',
      description:
        'A warm memory poster for everyday rides and youthful stories.',
      imageUrl: '/images/image-templates/1011.png',
      templateId: 'image-template-1011',
      isTemplateExample: true,
    },
    {
      title: 'Spring Kite Travel Poster',
      description:
        'A fresh travel-poster style inspired by spring color and motion.',
      imageUrl: '/images/image-templates/1010.png',
      templateId: 'image-template-1010',
      isTemplateExample: true,
    },
  ],
  features: [
    {
      title: 'AI image creation',
      description:
        'Create still images from published templates and a text description.',
      kind: 'image',
      actionLabel: 'Create now',
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
        title: 'Describe the image',
        description:
          'Write down the subject, setting, style, and mood you want to see.',
      },
      {
        title: 'Review and generate',
        description:
          'Choose a ratio, review the credit quote, then generate and download your image.',
      },
    ],
  },
  useCases: {
    title: 'Made for everyday ideas',
    items: [
      {
        title: 'Personal visuals',
        description: 'Explore distinctive portraits and everyday scenes.',
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
        description:
          'Turn stories, pets, and trips into images with text prompts.',
      },
    ],
  },
  promptTips: {
    title: 'Write a clearer image description',
    description:
      'Specific details about the subject, setting, light, and style usually lead to more predictable results.',
    tips: [
      'Start with the subject and main action',
      'Add the setting, lighting, color, and composition',
      'Use short, direct sentences for the key details',
    ],
  },
  tools: {
    title: 'Creative tools',
    description:
      'Choose an image template and aspect ratio for what you want to make.',
    imageLabel: 'AI image creator',
    posterMakerAction: 'Explore AI Poster Maker',
  },
  pricing: {
    title: 'Use credits for the work you create',
    description:
      'The workspace shows the credits required before each generation. The server quote at submission is the source of truth.',
    actionLabel: 'View creation credits',
  },
  faqTitle: 'FAQ',
  faq: [
    {
      question: 'What can jevailab do today?',
      answer:
        'You can choose a published template, describe your idea, and create and download a still AI image.',
    },
    {
      question: 'Do I need to upload an image?',
      answer:
        'The current image workspace does not require an upload. Choose a template and add a text description.',
    },
    {
      question: 'Can I create without a template?',
      answer:
        'Yes. Choose Free creation and describe the image you want to generate.',
    },
    {
      question: 'Where do template examples come from?',
      answer: 'They are jevailab template examples, not public user creations.',
    },
    {
      question: 'Can I choose an image ratio?',
      answer:
        'Yes. The workspace offers several output ratios and shows your active choice before generation.',
    },
    {
      question: 'How many images can I generate at once?',
      answer:
        'The current interface uses the selected template settings. The server quote shown before submission is the source of truth for credits charged.',
    },
    {
      question: 'How do I know the credit cost?',
      answer:
        'The workspace shows a server-calculated quote before submission. Please use that quote as the source of truth.',
    },
    {
      question: 'Can I turn my image into a template?',
      answer:
        'The current version supports published templates only; template creation and management are not yet available.',
    },
    {
      question: 'Are prompts and results reviewed?',
      answer:
        'Yes. Text descriptions and generated results may be reviewed through automated or human-assisted systems. Content that does not meet safety requirements may not be generated or shown.',
    },
    {
      question: 'What if my result is not what I expected?',
      answer:
        'Try more specific notes about light, composition, color, and subject, or choose another template direction.',
    },
  ],
  finalCta: {
    eyebrow: 'Private by default',
    title: 'Turn your next idea into an image',
    description:
      'Choose a template, describe your idea, and start creating now.',
    actionLabel: 'Start creating',
  },
};

const homepageContent: Record<JevailabLocale, JevailabHomepageContent> = {
  en,
  zh,
};

export function getJevailabHomepageContent(
  locale: JevailabLocale
): JevailabHomepageContent {
  return homepageContent[locale];
}

export type { FaqItem, GalleryExample, JevailabHomepageContent };

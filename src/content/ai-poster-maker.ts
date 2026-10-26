import type { JevailabLocale } from './jevailab-homepage';

export const posterMakerTemplateIds = [
  'image-template-1015',
  'image-template-1014',
  'image-template-1013',
  'image-template-1010',
  'image-template-1009',
  'image-template-0914',
] as const;

type PosterFaq = { question: string; answer: string };
type PosterTemplate = {
  name: string;
  imageUrl: string;
  alt: string;
  description: string;
};

type PosterMakerContent = {
  meta: { title: string; description: string };
  hero: { eyebrow: string; h1: string; intro: string; answer: string };
  templatesTitle: string;
  templates: readonly PosterTemplate[];
  howItWorks: { title: string; steps: readonly { title: string; text: string }[] };
  sizes: {
    title: string;
    intro: string;
    rows: readonly { format: string; ratio: string; use: string }[];
  };
  occasions: {
    title: string;
    items: readonly { title: string; text: string }[];
  };
  pricing: { title: string; text: string; items: readonly string[] };
  comparison: {
    title: string;
    intro: string;
    rows: readonly { tool: string; strength: string; tradeoff: string }[];
  };
  faqTitle: string;
  faq: readonly PosterFaq[];
  cta: { title: string; text: string; create: string; pricing: string };
  bodyWordCount: number;
};

const en: PosterMakerContent = {
  meta: {
    title: 'Free AI Poster Maker 2026 — Make a Poster from a Photo or Prompt',
    description:
      'Create a poster online from a reference photo or a text prompt. Explore published styles, choose a ratio, review the credit quote, and generate a downloadable image with jevailab.',
  },
  hero: {
    eyebrow: 'jevailab · AI poster maker 2026',
    h1: 'AI Poster Maker: Turn a Photo or a Prompt into a Poster',
    intro:
      'jevailab is an online AI poster maker for turning a reference photo or a text idea into a designed still image. Browse templates without signing in, then sign in when you are ready to submit a generation. The workspace supports 3:4, 9:16, 1:1, 4:3, and 16:9 output ratios, and shows the server-calculated credit quote before generation.',
    answer:
      'Use jevailab to start with a published visual direction, describe the subject and mood, choose an output ratio, and download a private AI poster. The Starter Pack is $9.90 one time; Pro Monthly is $19.90 per month; Pro Annual is $149 per year.',
  },
  templatesTitle: 'What you can make with an AI poster maker',
  templates: [
    {
      name: 'Summer Sky Editorial Portrait',
      imageUrl: '/images/image-templates/1015.png',
      alt: '3:4 blue-sky editorial portrait poster with a summer magazine layout',
      description:
        'A portrait-led editorial direction for profile images, personal brands, and visual introductions. The reference photo stays recognizable while the lower half adds a quiet printed-memory treatment, pale paper, restrained typography, and a calm blue palette that feels closer to a small art magazine than a generic filter.',
    },
    {
      name: 'Playful Cat Crayon Poster',
      imageUrl: '/images/image-templates/1014.png',
      alt: '3:4 pet poster combining a realistic cat photo with a pink crayon drawing',
      description:
        'A playful pet poster that translates the same animal into a warm hand-drawn scene. It works for cat and dog portraits, family keepsakes, and light social posts because the photo and illustration share one subject instead of becoming unrelated images. Crayon marks, paper texture, and simple shapes keep the result friendly and easy to read.',
    },
    {
      name: 'Blue Sky Motion Poster',
      imageUrl: '/images/image-templates/1013.png',
      alt: '3:4 blue-sky music poster showing a guitarist in motion above a paper illustration',
      description:
        'A motion-focused poster for music, performances, workshops, and energetic announcements. The upper photograph carries the gesture and movement, while the lower paper illustration echoes the same performer and instrument. It gives a reference image a clear event-poster rhythm without requiring a separate design tool or a complicated layout brief.',
    },
    {
      name: 'Spring Kite Travel Poster',
      imageUrl: '/images/image-templates/1010.png',
      alt: '3:4 spring travel poster with colorful kites, a pale paper field, and editorial labels',
      description:
        'A travel-oriented poster direction built around spring color, flying kites, and a printed field-guide feeling. Use it for trip memories, destination concepts, outdoor events, or a seasonal campaign. The embroidered-badge and paper details create a sense of place while keeping the original subject and color story as the visual anchor.',
    },
    {
      name: 'Summer Cycling Editorial',
      imageUrl: '/images/image-templates/1009.png',
      alt: '3:4 family cycling poster with a bright blue sky and geometric lower illustration',
      description:
        'A lifestyle poster for cycling, family stories, and everyday movement. The reference photo appears above a geometric interpretation that simplifies people, bicycles, and open sky into clean shapes. It is useful when you want a personal photograph to become a polished campaign visual while retaining the warmth and recognizability of the original scene.',
    },
    {
      name: 'Sweet Color Food Poster',
      imageUrl: '/images/image-templates/0914.png',
      alt: '3:4 food poster featuring green and orange macarons with bold Sweet Moments lettering',
      description:
        'A food and hospitality poster direction for menus, bakery launches, café announcements, and colorful product stories. The close-up reference remains the main subject while the lower treatment adds a bold editorial title and tactile print character. It favors clear color, appetizing detail, and a compact composition that reads well as a social preview.',
    },
  ],
  howItWorks: {
    title: 'How to make a poster with AI in 3 steps',
    steps: [
      {
        title: '1. Choose a visual direction',
        text: 'Select a published template that matches the mood, use case, or reference treatment you want. You can browse templates before logging in and change the choice while preparing your idea.',
      },
      {
        title: '2. Describe the image',
        text: 'Write the subject, setting, lighting, color, composition, and mood in plain language. A concise prompt is enough; the selected template supplies the starting visual direction and your description adds the story.',
      },
      {
        title: '3. Review, generate, and save',
        text: 'Choose the output ratio, review the server-side credit quote, confirm your rights to submitted content, and sign in to generate. Approved private results can be viewed and downloaded from the workspace.',
      },
    ],
  },
  sizes: {
    title: 'Poster sizes and formats',
    intro:
      'The image ratio controls the composition sent to the generation service. Pick the closest format to the place where you will use the finished image, then describe any important cropping or subject-position needs in your prompt.',
    rows: [
      { format: '3:4', ratio: 'Portrait', use: 'Posters, editorial portraits, feeds' },
      { format: '9:16', ratio: 'Tall portrait', use: 'Stories, mobile screens, vertical announcements' },
      { format: '1:1', ratio: 'Square', use: 'Avatars, product tiles, social grids' },
      { format: '4:3', ratio: 'Classic landscape', use: 'Slides, web cards, landscape scenes' },
      { format: '16:9', ratio: 'Wide landscape', use: 'Banners, thumbnails, presentation covers' },
      { format: 'A4 / 1080×1350', ratio: 'Prepare in editor', use: 'Export or crop after generation for print and platform-specific layouts' },
    ],
  },
  occasions: {
    title: 'Poster ideas by occasion',
    items: [
      { title: 'Birthdays and family memories', text: 'Start from a portrait or pet photo and ask for a warm palette, a clear title area, and a keepsake-like paper finish.' },
      { title: 'Music and performances', text: 'Use a motion-led style, describe the performer and atmosphere, and leave room for the event name and date in the final design.' },
      { title: 'Travel and outdoor events', text: 'Mention the destination, season, landmark, and desired print mood so the template can turn a trip photograph into a travel poster.' },
      { title: 'Food and small businesses', text: 'Describe the product, flavor, color, and audience. A close-up reference plus a concise headline works well for cafés and launches.' },
      { title: 'Social and campaign content', text: 'Choose a ratio for the platform first, then specify the subject, callout, and visual hierarchy instead of asking for a generic attractive image.' },
    ],
  },
  pricing: {
    title: 'Pricing and credits',
    text: 'jevailab shows the applicable server-side credit quote before a generation is submitted. Plans are designed for still image creation and editing, and the current product does not include an active AI video creator.',
    items: [
      'Starter Pack — $9.90 one-time payment, 66 credits.',
      'Pro Monthly — $19.90/month, 180 credits refreshed each billing cycle.',
      'Pro Annual — $149/year, 240 credits per month refreshed each billing cycle.',
      'Credits do not roll over between billing cycles; the account page shows your balance and credit history.',
    ],
  },
  comparison: {
    title: 'jevailab compared with other AI poster makers',
    intro:
      'Different tools optimize for different workflows. The comparison below describes the product approach honestly: jevailab is focused on reference-led still images, published visual directions, server-quoted credits, and a small workflow that can be used before choosing a plan.',
    rows: [
      { tool: 'jevailab', strength: 'Reference-led templates, ratio choice, private generation, visible credit quote', tradeoff: 'Currently focused on still images; template creation and video are not open' },
      { tool: 'Canva', strength: 'Broad manual design editor and large asset library', tradeoff: 'More editing decisions when you want a fast reference-to-poster workflow' },
      { tool: 'Adobe Express', strength: 'Strong brand and layout tools across Adobe workflows', tradeoff: 'Best value depends on the wider Adobe plan and asset needs' },
      { tool: 'PosterMyWall', strength: 'Large catalogue of ready-made marketing designs', tradeoff: 'Template editing is different from generating a new image direction from a reference' },
    ],
  },
  faqTitle: 'AI poster maker FAQ',
  faq: [
    { question: 'Is there a free AI poster maker?', answer: 'jevailab lets visitors browse the image workspace and published template examples before signing in. Generation uses account credits, and the server displays the required credit quote before submission.' },
    { question: 'Does AI poster making require a design tool?', answer: 'No separate design tool is required for the basic workflow. Choose a published direction, describe your idea, select a ratio, review the quote, and generate a still image in the workspace.' },
    { question: 'Can I turn a photo into a poster?', answer: 'Yes. Select a reference-led template and describe how the subject, mood, colors, and layout should be treated. The current image workspace supports one optional reference image.' },
    { question: 'What size should an AI poster be?', answer: 'Choose the ratio that matches the destination: 3:4 for portrait posters, 9:16 for stories, 1:1 for square tiles, 4:3 for classic landscape, or 16:9 for wide banners.' },
    { question: 'Do I need an account to make a poster?', answer: 'You can explore templates and prepare the creative direction without an account. You need to sign in before submitting a generation so credits, private results, and creation history can be attached to your account.' },
    { question: 'How much does it cost per poster?', answer: 'The credit cost depends on the selected service settings and is quoted by the server before submission. Current plans include a $9.90 Starter Pack, $19.90 monthly plan, and $149 annual plan.' },
    { question: 'Can I use my poster commercially?', answer: 'Commercial usage depends on the plan and the rights to the text and reference material you submit. Review the plan terms and upload only content you own or are authorized to use.' },
    { question: "What's the difference between a poster and a flyer?", answer: 'A poster usually prioritizes a strong visual and short message at a distance, while a flyer often carries more practical details. Pick a ratio and prompt that match how people will view the result.' },
    { question: 'Can I make posters in Chinese?', answer: 'Yes. You can switch the site to Chinese and write your creative direction in Chinese. Generated text inside an image can vary, so keep important final wording short and review the result.' },
    { question: 'Does it work on mobile?', answer: 'The workspace is designed to be usable on mobile and desktop browsers. A tall ratio such as 9:16 is useful for mobile-first stories, while 1:1 works well for square social previews.' },
  ],
  cta: {
    title: 'Start with a visual direction, not a blank canvas',
    text: 'Browse the published styles, describe the image you want, and use the server quote to decide when you are ready to generate.',
    create: 'Open the image creator',
    pricing: 'View plans and credits',
  },
  bodyWordCount: 1480,
};

const zh: PosterMakerContent = {
  ...en,
  meta: {
    title: 'AI 海报制作工具 2026｜用照片或文字创作海报',
    description: '使用照片或文字描述在线创作 AI 海报，选择模板、比例并在生成前查看积分报价。',
  },
  hero: {
    eyebrow: 'jevailab · AI 海报制作工具 2026',
    h1: 'AI 海报制作：把照片或文字变成一张海报',
    intro: 'jevailab 是一个在线 AI 海报制作工具，可以从参考图片或文字想法开始创作静态图片。访客可以先浏览模板，准备提交生成时再登录。工作台支持 3:4、9:16、1:1、4:3 和 16:9 比例，并在提交前展示服务端计算的积分报价。',
    answer: '选择视觉方向，补充主体、场景和氛围，设置图片比例，确认积分报价后即可生成并下载私有 AI 海报。入门包 $9.90 一次性，专业月付 $19.90/月，专业年付 $149/年。',
  },
  templatesTitle: 'AI 海报工具可以制作什么',
  howItWorks: { title: '使用 AI 制作海报的 3 个步骤', steps: [
    { title: '1. 选择视觉方向', text: '从已发布模板中选择接近目标氛围的风格，访客无需登录即可浏览。' },
    { title: '2. 描述画面', text: '写下主体、场景、光线、颜色、构图和氛围，模板提供基础方向，文字补充具体故事。' },
    { title: '3. 查看报价并生成', text: '选择比例，确认服务端积分报价，完成登录和授权确认后生成并下载。' },
  ] },
  sizes: { title: '海报尺寸与比例', intro: '选择与使用场景匹配的比例，再在创意要求中补充裁切、主体位置和构图要求。', rows: [
    { format: '3:4', ratio: '竖版', use: '海报、人物编辑图、社交内容' },
    { format: '9:16', ratio: '长竖版', use: '故事、手机屏幕、竖版公告' },
    { format: '1:1', ratio: '方形', use: '头像、产品卡片、社交网格' },
    { format: '4:3', ratio: '经典横版', use: '幻灯片、网页卡片、风景图' },
    { format: '16:9', ratio: '宽屏', use: '横幅、缩略图、演示文稿封面' },
    { format: 'A4 / 1080×1350', ratio: '后期编辑', use: '生成后用于打印或平台适配' },
  ] },
  occasions: { title: '不同场景的海报灵感', items: [
    { title: '生日与家庭回忆', text: '从人物或宠物照片开始，指定温暖色彩、标题区域和纪念册般的纸张质感。' },
    { title: '音乐与演出', text: '选择有动作感的模板，描述表演者、气氛和活动信息。' },
    { title: '旅行与户外活动', text: '补充地点、季节、地标和印刷风格，让旅行照片成为目的地海报。' },
    { title: '食品与小型商家', text: '描述产品、味道、颜色和受众，使用特写参考图和简短标题。' },
    { title: '社交与活动内容', text: '先选择平台适合的比例，再说明主体、重点信息和视觉层级。' },
  ] },
  pricing: { title: '价格与积分', text: '每次生成前会由服务端计算并展示积分报价，当前产品专注于静态图片创作，不包含已开放的视频生成器。', items: ['入门包：$9.90 一次性，66 积分。', '专业月付：$19.90/月，每个计费周期刷新 180 积分。', '专业年付：$149/年，每月刷新 240 积分。', '积分不跨计费周期结转，个人中心会显示余额和明细。'] },
  comparison: { title: 'jevailab 与其他 AI 海报工具', intro: '不同工具适合不同工作流。jevailab 更专注于参考图片、已发布模板、比例设置和服务端积分报价。', rows: [
    { tool: 'jevailab', strength: '参考图模板、比例选择、私有生成、生成前查看积分', tradeoff: '当前专注静态图片，暂不开放模板创建和视频' },
    { tool: 'Canva', strength: '完整的手动设计编辑器和素材库', tradeoff: '快速从参考图到海报时需要更多编辑决策' },
    { tool: 'Adobe Express', strength: '适合 Adobe 工作流的品牌与版式工具', tradeoff: '价值取决于整体 Adobe 套餐和素材需求' },
    { tool: 'PosterMyWall', strength: '大量现成营销设计模板', tradeoff: '更偏模板编辑，不同于从参考图生成新方向' },
  ] },
  faqTitle: 'AI 海报制作常见问题',
  faq: [
    { question: '有没有免费的 AI 海报制作工具？', answer: 'jevailab 支持访客浏览工作台和模板示例，生成图片使用账户积分，提交前会展示服务端计算的积分报价。' },
    { question: 'AI 制作海报需要设计软件吗？', answer: '基础流程不需要额外设计软件。选择模板、描述想法、设置比例、查看报价后即可生成静态图片。' },
    { question: '可以把照片变成海报吗？', answer: '可以。选择参考图模板，描述主体、氛围、颜色和布局，工作台支持上传一张可选参考图。' },
    { question: 'AI 海报应该使用什么尺寸？', answer: '竖版海报可选 3:4，故事和手机内容可选 9:16，方形内容可选 1:1，横幅可选 4:3 或 16:9。' },
    { question: '制作海报需要注册吗？', answer: '浏览模板和准备创意不需要登录，但提交生成前需要登录，以便管理积分、私有结果和创作记录。' },
    { question: '每张海报需要多少费用？', answer: '具体积分由服务端根据当前设置报价，当前套餐包括 $9.90 入门包、$19.90 专业月付和 $149 专业年付。' },
    { question: '生成的海报可以商用吗？', answer: '商用权限取决于购买的套餐以及你提交的文字和参考素材权利，请只上传自己拥有或已获授权的内容。' },
    { question: '海报和传单有什么区别？', answer: '海报通常强调远距离识别和强视觉，传单通常包含更多实际信息，应根据观看场景选择比例和提示词。' },
    { question: '可以制作中文海报吗？', answer: '可以切换中文并用中文描述创意。图片内文字可能存在变化，重要文案应保持简短并检查结果。' },
    { question: '手机可以使用吗？', answer: '工作台支持手机和桌面浏览器，手机优先内容可选择 9:16，方形社交预览可选择 1:1。' },
  ],
  cta: { title: '从视觉方向开始，而不是面对空白画布', text: '先浏览模板和示例，再写下你的创意，确认服务端报价后开始生成。', create: '打开图片创作', pricing: '查看套餐与积分' },
  bodyWordCount: 1480,
};

export function getAiPosterMakerContent(locale: JevailabLocale): PosterMakerContent {
  return locale === 'zh' ? zh : en;
}

export type { PosterFaq, PosterMakerContent, PosterTemplate };

export const JEVAILAB_TEMPLATE_SELECTION_EVENT = 'jevailab:select-template';
export const IMAGE_CREATOR_REFERENCE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_CREATOR_REFERENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export function validateImageCreatorReferenceFile(file: {
  type: string;
  size: number;
}): 'type' | 'size' | null {
  if (
    !IMAGE_CREATOR_REFERENCE_TYPES.includes(
      file.type as (typeof IMAGE_CREATOR_REFERENCE_TYPES)[number]
    )
  ) {
    return 'type';
  }
  return file.size > IMAGE_CREATOR_REFERENCE_MAX_BYTES ? 'size' : null;
}

export function buildImageCreatorAuthHref({
  loginPath,
  callbackUrl,
}: {
  loginPath: string;
  callbackUrl: string;
}): string {
  return `${loginPath}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export function buildImageCreatorCallbackUrl({
  pathname,
  search,
  hash,
}: {
  pathname: string;
  search: string;
  hash: string;
}): string {
  const params = new URLSearchParams(search);
  params.delete('create');
  params.delete('template');
  if (hash === '#create') params.set('create', '1');
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}

export function canSubmitImageCreatorDraft({
  isSubmitting,
  consentAccepted,
  templateId,
  prompt,
}: {
  isSubmitting: boolean;
  consentAccepted: boolean;
  templateId: string | null;
  prompt: string;
}): boolean {
  return (
    !isSubmitting &&
    consentAccepted &&
    (Boolean(templateId) || prompt.trim().length > 0)
  );
}

export function resolveExternalTemplateSelection({
  currentTemplateId,
  requestedTemplateId,
  availableTemplateIds,
}: {
  currentTemplateId: string | null;
  requestedTemplateId: string;
  availableTemplateIds: readonly string[];
}): string | null {
  return availableTemplateIds.includes(requestedTemplateId)
    ? requestedTemplateId
    : currentTemplateId;
}

type LocalizableTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
};

const zhTemplateCopy: Record<
  string,
  Pick<LocalizableTemplate, 'name' | 'description' | 'category'>
> = {
  'cinematic-portrait': {
    name: '电影人像',
    description: '柔和定向光，呈现杂志感人物肖像。',
    category: '摄影',
  },
  'sunset-story': {
    name: '日落故事',
    description: '以自然金色光线营造旅行故事感。',
    category: '摄影',
  },
  storybook: {
    name: '绘本世界',
    description: '温暖手绘感的故事书插画风格。',
    category: '插画',
  },
  'editorial-poster': {
    name: '编辑海报',
    description: '为创意需求打造鲜明的编辑海报构图。',
    category: '海报',
  },
  dreamscape: {
    name: '梦境艺术',
    description: '细节丰富的超现实艺术梦境。',
    category: '艺术',
  },
  'minimal-product': {
    name: '极简产品',
    description: '用简洁构图与质感光线生成干净高级的产品广告视觉。',
    category: '海报',
  },
};

const enTemplateCopy: Record<
  string,
  Pick<LocalizableTemplate, 'name' | 'description' | 'category'>
> = {
  'cinematic-portrait': {
    name: 'Cinematic portrait',
    description: 'Soft directional light for an editorial portrait.',
    category: 'Photography',
  },
  'sunset-story': {
    name: 'Sunset story',
    description: 'A travel-story mood shaped by natural golden light.',
    category: 'Photography',
  },
  storybook: {
    name: 'Storybook world',
    description: 'A warm, hand-drawn storybook illustration style.',
    category: 'Illustration',
  },
  'editorial-poster': {
    name: 'Editorial poster',
    description: 'A bold editorial poster composition for creative briefs.',
    category: 'Poster',
  },
  dreamscape: {
    name: 'Dreamscape art',
    description: 'A richly detailed surreal artistic dreamscape.',
    category: 'Art',
  },
  'minimal-product': {
    name: 'Minimal product',
    description:
      'A clean, premium product advertising visual with restrained styling.',
    category: 'Poster',
  },
};

type LocalizedTemplateCopy = Pick<
  LocalizableTemplate,
  'name' | 'description' | 'category'
>;
type SpreadsheetTemplateCopy = Partial<Record<Locale, LocalizedTemplateCopy>>;

const spreadsheetTemplateCopy: Record<string, SpreadsheetTemplateCopy> = {
  'image-template-1015': {
    zh: {
      name: '夏日云际编辑肖像',
      description: '蓝天人物与夏日海报质感的肖像风格。',
      category: '图片创作',
    },
    en: {
      name: 'Summer Sky Editorial Portrait',
      description:
        'A blue-sky editorial portrait with a soft summer poster finish.',
      category: 'Image creation',
    },
  },
  'image-template-1014': {
    zh: {
      name: '趣味猫咪蜡笔海报',
      description: '童趣蜡笔插画与温暖日常氛围结合的轻松海报风格。',
      category: '图片创作',
    },
    en: {
      name: 'Playful Cat Crayon Poster',
      description:
        'A lighthearted poster style blending crayon illustration with cozy everyday moments.',
      category: 'Image creation',
    },
  },
  'image-template-1013': {
    zh: {
      name: '蓝天跃动艺术海报',
      description: '用明亮蓝天和动态姿态呈现轻盈的艺术海报。',
      category: '图片创作',
    },
    en: {
      name: 'Blue Sky Motion Poster',
      description:
        'A bright art-poster style built around blue skies and expressive motion.',
      category: 'Image creation',
    },
  },
  'image-template-1012': {
    zh: {
      name: '彩伞图案艺术海报',
      description: '以重复图案、柔和色彩和生活细节构成艺术海报。',
      category: '图片创作',
    },
    en: {
      name: 'Colorful Umbrella Art Poster',
      description:
        'An art-poster composition built from repeating patterns and soft color.',
      category: 'Image creation',
    },
  },
  'image-template-1011': {
    zh: {
      name: '青春骑行纪念海报',
      description: '把日常骑行画面转化为温暖、充满故事感的纪念海报。',
      category: '图片创作',
    },
    en: {
      name: 'Forever Young Ride Poster',
      description:
        'A warm memory poster for everyday rides and youthful stories.',
      category: 'Image creation',
    },
  },
  'image-template-1010': {
    zh: {
      name: '春日风筝旅行海报',
      description: '以春日色彩和风中图案营造轻快的旅行视觉。',
      category: '图片创作',
    },
    en: {
      name: 'Spring Kite Travel Poster',
      description:
        'A fresh travel-poster style inspired by spring color and motion.',
      category: 'Image creation',
    },
  },
  'image-template-1009': {
    zh: {
      name: '夏日骑行编辑海报',
      description: '适合人物与运动场景的清爽夏日编辑海报。',
      category: '图片创作',
    },
    en: {
      name: 'Summer Cycling Editorial',
      description: 'A crisp summer editorial style for people and movement.',
      category: 'Image creation',
    },
  },
  'image-template-1008': {
    zh: {
      name: '晴空球场几何海报',
      description: '用几何线条、晴空和运动场景打造现代视觉。',
      category: '图片创作',
    },
    en: {
      name: 'Blue Court Geometric Poster',
      description:
        'A modern graphic style with geometric lines, sky, and sport scenes.',
      category: 'Image creation',
    },
  },
  'image-template-1007': {
    zh: {
      name: '雪境蓝调诗意海报',
      description: '冷调雪景与留白结合的安静诗意海报。',
      category: '图片创作',
    },
    en: {
      name: 'Snowfield Blue Poetry',
      description:
        'A quiet poetic poster style with cool snow tones and open space.',
      category: 'Image creation',
    },
  },
  'image-template-1006': {
    zh: {
      name: '暖阳人像拼贴',
      description: '以暖色光线和拼贴构图突出人物的生活感。',
      category: '图片创作',
    },
    en: {
      name: 'Warm Sun Portrait Collage',
      description:
        'A warm collage style that brings out the everyday character of a portrait.',
      category: 'Image creation',
    },
  },
  'image-template-1005': {
    zh: {
      name: '芥末黄裙装拼贴',
      description: '高明度服饰、花束和拼贴画面组成的时装风格。',
      category: '图片创作',
    },
    en: {
      name: 'Mustard Dress Collage',
      description:
        'A fashion collage style with bright clothing and graphic flowers.',
      category: 'Image creation',
    },
  },
  'image-template-1004': {
    zh: {
      name: '蓝门花艺刺绣',
      description: '蓝色建筑、花艺和手工质感结合的静物风格。',
      category: '图片创作',
    },
    en: {
      name: 'Blue Door Floral Embroidery',
      description:
        'A handcrafted still-life style pairing blue architecture with flowers.',
      category: 'Image creation',
    },
  },
  'image-template-1003': {
    zh: {
      name: '暖意宝宝生活海报',
      description: '用柔和光线和生活化构图记录可爱的日常瞬间。',
      category: '图片创作',
    },
    en: {
      name: 'Cozy Baby Lifestyle Poster',
      description: 'A soft lifestyle poster style for warm everyday portraits.',
      category: 'Image creation',
    },
  },
  'image-template-1002': {
    zh: {
      name: '花间少女手绘海报',
      description: '人物、花朵和手绘线稿组成的清新编辑海报。',
      category: '图片创作',
    },
    en: {
      name: 'Garden Girl Sketch Poster',
      description:
        'A fresh editorial poster with a portrait, flowers, and hand-drawn lines.',
      category: 'Image creation',
    },
  },
  'image-template-1001': {
    zh: {
      name: '海岸皮划艇旅行海报',
      description: '用海岸色彩和旅行构图呈现轻松的户外记忆。',
      category: '图片创作',
    },
    en: {
      name: 'Coastal Kayak Travel Poster',
      description:
        'A relaxed outdoor travel style shaped by coastlines and bright color.',
      category: 'Image creation',
    },
  },
  'image-template-0930': {
    zh: {
      name: '海边假日彩绘海报',
      description: '明亮海滩、彩色物件和假日氛围组成的旅行海报。',
      category: '图片创作',
    },
    en: {
      name: 'Seaside Holiday Painted Poster',
      description:
        'A colorful holiday poster style for beaches, objects, and summer memories.',
      category: 'Image creation',
    },
  },
  'image-template-0929': {
    zh: {
      name: '晴日花田故事',
      description: '以花田、人物和明亮天空讲述轻盈的户外故事。',
      category: '图片创作',
    },
    en: {
      name: 'Sunny Flower Field Story',
      description:
        'A bright outdoor story style with flower fields and open sky.',
      category: 'Image creation',
    },
  },
  'image-template-0928': {
    zh: {
      name: '花园猫咪涂鸦',
      description: '花园绿意与俏皮猫咪结合的手绘涂鸦风格。',
      category: '图片创作',
    },
    en: {
      name: 'Garden Cat Doodle',
      description:
        'A playful hand-drawn style pairing garden greenery with a curious cat.',
      category: 'Image creation',
    },
  },
  'image-template-0927': {
    zh: {
      name: '蓝门花卉拼贴',
      description: '蓝色门面与花卉细节组成的清爽拼贴视觉。',
      category: '图片创作',
    },
    en: {
      name: 'Blue Door Floral Collage',
      description:
        'A clean collage style built from blue architecture and floral details.',
      category: 'Image creation',
    },
  },
  'image-template-0925': {
    zh: {
      name: '绿野陪伴插画',
      description: '自然草地、人物与宠物组成的温柔陪伴画面。',
      category: '图片创作',
    },
    en: {
      name: 'Meadow Companion Illustration',
      description:
        'A gentle illustration style for people, pets, and open meadow scenes.',
      category: 'Image creation',
    },
  },
  'image-template-0924': {
    zh: {
      name: '蓝海热气球旅行海报',
      description: '海岸、热气球和明亮蓝色组成的梦幻旅行视觉。',
      category: '图片创作',
    },
    en: {
      name: 'Blue Escape Travel Poster',
      description:
        'A dreamy travel-poster style with blue water and floating color.',
      category: 'Image creation',
    },
  },
  'image-template-0923': {
    zh: {
      name: '彩色信号街景海报',
      description: '以城市信号灯和天空构成明快的街景海报。',
      category: '图片创作',
    },
    en: {
      name: 'Color Signal Street Poster',
      description:
        'A graphic street-poster style built around color and urban rhythm.',
      category: 'Image creation',
    },
  },
  'image-template-0922': {
    zh: {
      name: '果园野趣插画',
      description: '自然果实、枝叶和动物细节组成的轻松插画。',
      category: '图片创作',
    },
    en: {
      name: 'Orchard Daydream Illustration',
      description:
        'A playful nature illustration with fruit, leaves, and animal details.',
      category: 'Image creation',
    },
  },
  'image-template-0921': {
    zh: {
      name: '雏菊小熊手绘',
      description: '雏菊、柔和色彩和小熊组成的温暖手绘风格。',
      category: '图片创作',
    },
    en: {
      name: 'Daisy Bear Hand Drawn',
      description:
        'A warm hand-drawn style with daisies, soft color, and a tiny bear.',
      category: 'Image creation',
    },
  },
  'image-template-0920': {
    zh: {
      name: '好友宠物手绘海报',
      description: '人物与宠物的轻松合影，转化为友好手绘海报。',
      category: '图片创作',
    },
    en: {
      name: 'Good Friends Pet Poster',
      description:
        'A friendly hand-drawn poster style for people and their pets.',
      category: 'Image creation',
    },
  },
  'image-template-0919': {
    zh: {
      name: '金色艺境人物海报',
      description: '金色背景、人物姿态与画框元素组成的艺术海报。',
      category: '图片创作',
    },
    en: {
      name: 'Golden Gallery Portrait',
      description:
        'An art-gallery portrait style with warm gold and framed compositions.',
      category: 'Image creation',
    },
  },
  'image-template-0918': {
    zh: {
      name: '花园伙伴萌趣插画',
      description: '花园色彩与动物表情结合的轻松趣味插画。',
      category: '图片创作',
    },
    en: {
      name: 'Garden Friends Playful Art',
      description:
        'A cheerful illustration style with garden color and expressive animals.',
      category: 'Image creation',
    },
  },
  'image-template-0917': {
    zh: {
      name: '猫咪文字艺术海报',
      description: '猫咪肖像与排版文字结合的复古艺术海报。',
      category: '图片创作',
    },
    en: {
      name: 'Cat Letterpress Art Poster',
      description:
        'A retro art-poster style combining a cat portrait with expressive type.',
      category: 'Image creation',
    },
  },
  'image-template-0916': {
    zh: {
      name: '金色秋日旅行海报',
      description: '秋日树影、人物与复古排版组成的旅行海报。',
      category: '图片创作',
    },
    en: {
      name: 'Golden Autumn Travel Poster',
      description:
        'A vintage travel-poster style with autumn light and quiet scenery.',
      category: 'Image creation',
    },
  },
  'image-template-0915': {
    zh: {
      name: '晨光花野人物海报',
      description: '花野、自然光与人物姿态结合的清新编辑风格。',
      category: '图片创作',
    },
    en: {
      name: 'Morning Meadow Editorial',
      description:
        'A fresh editorial style with natural light, flowers, and portrait mood.',
      category: 'Image creation',
    },
  },
  'image-template-0914': {
    zh: {
      name: '甜点色彩美食海报',
      description: '高饱和甜点色彩与整齐构图组成的美食海报。',
      category: '图片创作',
    },
    en: {
      name: 'Sweet Color Food Poster',
      description:
        'A bright food-poster style with playful color and orderly composition.',
      category: 'Image creation',
    },
  },
  'image-template-0913': {
    zh: {
      name: '几何时装拼贴海报',
      description: '人物肖像、几何切片和高对比色彩组成的时装拼贴。',
      category: '图片创作',
    },
    en: {
      name: 'Geometric Fashion Collage',
      description:
        'A fashion collage style with portrait details, geometry, and contrast.',
      category: 'Image creation',
    },
  },
  'image-template-0912': {
    zh: {
      name: '山湖留白风景海报',
      description: '山湖、留白和手绘笔触组成的安静风景海报。',
      category: '图片创作',
    },
    en: {
      name: 'Mountain Lake Minimal Poster',
      description:
        'A calm landscape poster style with mountain shapes and generous space.',
      category: 'Image creation',
    },
  },
  'image-template-0911': {
    zh: {
      name: '春光花影人物海报',
      description: '春日花影、人物肖像和柔和色彩构成的编辑海报。',
      category: '图片创作',
    },
    en: {
      name: 'Spring Light Floral Portrait',
      description:
        'An editorial portrait style with spring flowers and soft color.',
      category: 'Image creation',
    },
  },
  'image-template-0910': {
    zh: {
      name: '慵夏帽影生活海报',
      description: '草帽、夏日光线和生活细节组成的轻松海报风格。',
      category: '图片创作',
    },
    en: {
      name: 'Lazy Summer Hat Poster',
      description:
        'A relaxed summer poster style with hats, light, and everyday detail.',
      category: 'Image creation',
    },
  },
  'image-template-0909': {
    zh: {
      name: '明日骑士童趣海报',
      description: '人物、明亮色块和童趣插画组成的活力海报。',
      category: '图片创作',
    },
    en: {
      name: 'Bright Rider Story Poster',
      description:
        'An energetic story-poster style with bright color and playful illustration.',
      category: 'Image creation',
    },
  },
  'image-template-0908': {
    zh: {
      name: '椰影童年故事海报',
      description: '热带植物、人物和手绘明信片质感组成的童年故事。',
      category: '图片创作',
    },
    en: {
      name: 'Coconut Grove Story Poster',
      description:
        'A nostalgic story-poster style with tropical foliage and hand-drawn detail.',
      category: 'Image creation',
    },
  },
};

function getSpreadsheetTemplateCopy(
  templateId: string,
  locale: Locale
): LocalizedTemplateCopy | undefined {
  return (
    spreadsheetTemplateCopy[templateId]?.[locale] ??
    spreadsheetTemplateCopy[templateId]?.en
  );
}

export function getLocalizedImageTemplate<T extends LocalizableTemplate>(
  template: T,
  locale: Locale
): T {
  const copy = {
    ...enTemplateCopy[template.id],
    ...(locale === 'zh'
      ? zhTemplateCopy[template.id]
      : getSpreadsheetTemplateCopy(template.id, locale)),
  };
  return Object.keys(copy).length > 0 ? { ...template, ...copy } : template;
}
import type { Locale } from '@/lib/locale';

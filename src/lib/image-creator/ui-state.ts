export const PICVILO_TEMPLATE_SELECTION_EVENT = 'picvilo:select-template';

export function canSubmitImageCreatorDraft({
  isSignedIn,
  isSubmitting,
  consentAccepted,
  templateId,
  prompt,
}: {
  isSignedIn: boolean;
  isSubmitting: boolean;
  consentAccepted: boolean;
  templateId: string | null;
  prompt: string;
}): boolean {
  return (
    isSignedIn &&
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
    description: '基于产品参考图创建干净高级的广告视觉。',
    category: '海报',
  },
};

function getSpreadsheetTemplateCopy(
  templateId: string
): Pick<LocalizableTemplate, 'name' | 'description' | 'category'> | undefined {
  const match = /^image-template-(\d{4})$/.exec(templateId);
  if (!match) return undefined;

  return {
    name: `图片模板 ${match[1]}`,
    description: `来自 ${match[1]} 图片方案的 3:4 创作模板。`,
    category: '图片创作',
  };
}

export function getLocalizedImageTemplate<T extends LocalizableTemplate>(
  template: T,
  locale: 'zh' | 'en'
): T {
  const copy =
    locale === 'zh'
      ? (zhTemplateCopy[template.id] ?? getSpreadsheetTemplateCopy(template.id))
      : undefined;
  return copy ? { ...template, ...copy } : template;
}

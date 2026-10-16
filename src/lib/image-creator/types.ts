export const IMAGE_CREATOR_MODES = ['1K_SD', '2K_HD'] as const;
export const IMAGE_CREATOR_RATIOS = [
  'AUTO',
  '9:16',
  '2:3',
  '3:4',
  '1:1',
  '4:3',
  '3:2',
  '16:9',
  '21:9',
] as const;

export type ImageCreatorMode = (typeof IMAGE_CREATOR_MODES)[number];
export type ImageCreatorRatio = (typeof IMAGE_CREATOR_RATIOS)[number];
export type ImageTemplateInputPolicy = 'optional' | 'required' | 'forbidden';

export type ImageCreatorDraft = {
  templateId: string | null;
  referenceAssetId: string | null;
  mode: ImageCreatorMode;
  ratio: ImageCreatorRatio;
  count: number;
  extraPrompt: string;
};

export type PublicImageTemplate = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  description: string;
  coverUrl: string;
  exampleUrl: string;
  inputPolicy: ImageTemplateInputPolicy;
  defaultMode: ImageCreatorMode;
  defaultRatio: ImageCreatorRatio;
  defaultCount: number;
};

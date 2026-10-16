import type {
  ImageCreatorMode,
  ImageCreatorRatio,
  ImageTemplateInputPolicy,
  PublicImageTemplate,
} from './types';

export type ImageTemplate = PublicImageTemplate & {
  revision: number;
  basePrompt: string;
  negativePrompt: string;
};

const template = (
  id: string,
  name: string,
  category: string,
  image: number,
  inputPolicy: ImageTemplateInputPolicy,
  basePrompt: string,
  defaultMode: ImageCreatorMode = '1K_SD',
  defaultRatio: ImageCreatorRatio = '3:4'
): ImageTemplate => ({
  id,
  name,
  category,
  tags: [category.toLowerCase()],
  description: `A ${name.toLowerCase()} look for your next creation.`,
  coverUrl: `/images/hero-gallery/${image}.png`,
  exampleUrl: `/images/hero-gallery/${image}.png`,
  inputPolicy,
  defaultMode,
  defaultRatio,
  defaultCount: 1,
  revision: 1,
  basePrompt,
  negativePrompt: 'low quality, distorted details, watermark, text',
});

/** Server-only presets. Do not import this module from a client component. */
export const imageTemplateSeeds: readonly ImageTemplate[] = [
  template(
    'cinematic-portrait',
    'Cinematic portrait',
    'Photography',
    1,
    'optional',
    'Create a cinematic editorial portrait with soft directional lighting.'
  ),
  template(
    'sunset-story',
    'Sunset story',
    'Photography',
    2,
    'optional',
    'Create an emotional golden-hour travel photograph with natural light.'
  ),
  template(
    'storybook',
    'Storybook world',
    'Illustration',
    3,
    'optional',
    'Create a charming hand-painted storybook illustration.'
  ),
  template(
    'editorial-poster',
    'Editorial poster',
    'Poster',
    4,
    'forbidden',
    'Create a bold editorial poster composition from the user request.',
    '2K_HD',
    '3:4'
  ),
  template(
    'dreamscape',
    'Dreamscape',
    'Art',
    5,
    'optional',
    'Create a surreal, richly detailed fine-art dreamscape.'
  ),
  template(
    'minimal-product',
    'Minimal product',
    'Poster',
    6,
    'required',
    'Use the provided product reference to create a clean premium campaign image.'
  ),
];

export function toPublicImageTemplate(
  template: ImageTemplate
): PublicImageTemplate {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    tags: template.tags,
    description: template.description,
    coverUrl: template.coverUrl,
    exampleUrl: template.exampleUrl,
    inputPolicy: template.inputPolicy,
    defaultMode: template.defaultMode,
    defaultRatio: template.defaultRatio,
    defaultCount: template.defaultCount,
  };
}

export function findImageTemplate(id: string): ImageTemplate | undefined {
  return imageTemplateSeeds.find((template) => template.id === id);
}

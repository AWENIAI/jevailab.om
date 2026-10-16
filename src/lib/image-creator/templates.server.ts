import type { PublicImageTemplate } from './types';
import { spreadsheetImageTemplateSeeds } from './spreadsheet-templates.server';

export type ImageTemplate = PublicImageTemplate & {
  revision: number;
  basePrompt: string;
  negativePrompt: string;
};

/** Server-only presets. Do not import this module from a client component. */
export const imageTemplateSeeds: readonly ImageTemplate[] =
  spreadsheetImageTemplateSeeds;

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

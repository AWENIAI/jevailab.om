import type {
  ImageTemplateStyleFamily,
  ImageTemplateUseCase,
  PublicImageTemplate,
} from './types';
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
    ...(template.useCase ? { useCase: template.useCase } : {}),
    ...(template.styleFamily ? { styleFamily: template.styleFamily } : {}),
  };
}

export function findImageTemplate(id: string): ImageTemplate | undefined {
  return imageTemplateSeeds.find((template) => template.id === id);
}

export function listClassifiedImageTemplates({
  useCase,
  styleFamily,
}: {
  useCase?: ImageTemplateUseCase;
  styleFamily?: ImageTemplateStyleFamily;
} = {}): ImageTemplate[] {
  return imageTemplateSeeds.filter(
    (template) =>
      template.useCase !== undefined &&
      template.styleFamily !== undefined &&
      (useCase === undefined || template.useCase === useCase) &&
      (styleFamily === undefined || template.styleFamily === styleFamily)
  );
}

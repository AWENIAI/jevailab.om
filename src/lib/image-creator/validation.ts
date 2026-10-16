import { z } from 'zod';
import {
  IMAGE_CREATOR_MODES,
  IMAGE_CREATOR_RATIOS,
  type ImageCreatorDraft,
} from './types';
import type { ImageTemplate } from './templates.server';

export const imageCreatorDraftSchema = z.object({
  templateId: z.string().min(1).nullable(),
  referenceAssetId: z.string().min(1).nullable(),
  mode: z.enum(IMAGE_CREATOR_MODES),
  ratio: z.enum(IMAGE_CREATOR_RATIOS),
  count: z.number().int().min(1).max(9),
  extraPrompt: z.string().max(1000),
});

const REFERENCE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateReferenceImageMetadata({
  name,
  type,
  size,
}: {
  name: string;
  type: string;
  size: number;
}): void {
  if (!name.trim()) throw new Error('Reference image file name is required.');
  if (!REFERENCE_IMAGE_TYPES.has(type)) {
    throw new Error('Reference images must be JPG, PNG, or WebP.');
  }
  if (size <= 0 || size > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error('Reference images must be 10MB or smaller.');
  }
}

export function validateImageCreatorDraft({
  template,
  draft,
}: {
  template: ImageTemplate | null;
  draft: ImageCreatorDraft;
}): ImageCreatorDraft {
  const parsed = imageCreatorDraftSchema.parse(draft);
  const extraPrompt = parsed.extraPrompt.trim();

  if (!template && !extraPrompt) {
    throw new Error('Describe what you want to create.');
  }
  if (template && parsed.templateId !== template.id) {
    throw new Error('The selected template is no longer available.');
  }
  if (template?.inputPolicy === 'required' && !parsed.referenceAssetId) {
    throw new Error('This template requires one reference image.');
  }
  if (template?.inputPolicy === 'forbidden' && parsed.referenceAssetId) {
    throw new Error('This template does not accept a reference image.');
  }

  return { ...parsed, extraPrompt };
}

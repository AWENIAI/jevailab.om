import { describe, expect, it } from 'vitest';
import {
  toPublicImageTemplate,
  type ImageTemplate,
} from '@/lib/image-creator/templates.server';
import {
  validateImageCreatorDraft,
  validateReferenceImageMetadata,
} from '@/lib/image-creator/validation';

const optionalTemplate: ImageTemplate = {
  id: 'portrait-studio',
  name: 'Portrait Studio',
  category: 'Photography',
  tags: ['portrait'],
  description: 'A clean editorial portrait treatment.',
  coverUrl: '/images/hero-gallery/1.png',
  exampleUrl: '/images/hero-gallery/1.png',
  inputPolicy: 'optional',
  defaultMode: '1K_SD',
  defaultRatio: '3:4',
  defaultCount: 1,
  revision: 1,
  basePrompt: 'private template prompt',
  negativePrompt: 'private negative prompt',
};

describe('image creator draft validation', () => {
  it('rejects a free draft whose prompt is whitespace', () => {
    expect(() =>
      validateImageCreatorDraft({
        template: null,
        draft: {
          templateId: null,
          referenceAssetId: null,
          mode: '1K_SD',
          ratio: '3:4',
          count: 1,
          extraPrompt: '   ',
        },
      })
    ).toThrow('Describe what you want to create.');
  });

  it('rejects a reference image when the selected template forbids it', () => {
    expect(() =>
      validateImageCreatorDraft({
        template: { ...optionalTemplate, inputPolicy: 'forbidden' },
        draft: {
          templateId: optionalTemplate.id,
          referenceAssetId: 'asset_1',
          mode: '1K_SD',
          ratio: '3:4',
          count: 1,
          extraPrompt: '',
        },
      })
    ).toThrow('This template does not accept a reference image.');
  });

  it('accepts only documented quality, ratio and output-count values', () => {
    expect(
      validateImageCreatorDraft({
        template: optionalTemplate,
        draft: {
          templateId: optionalTemplate.id,
          referenceAssetId: null,
          mode: '2K_HD',
          ratio: '21:9',
          count: 9,
          extraPrompt: 'Warm, cinematic sunset light.',
        },
      })
    ).toMatchObject({ mode: '2K_HD', ratio: '21:9', count: 9 });
  });

  it('only maps explicitly public template fields to the browser', () => {
    const result = toPublicImageTemplate(optionalTemplate);

    expect(result).not.toHaveProperty('basePrompt');
    expect(result).not.toHaveProperty('negativePrompt');
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('allows exactly the documented reference image media types and size', () => {
    expect(() =>
      validateReferenceImageMetadata({
        name: 'portrait.webp',
        type: 'image/webp',
        size: 10 * 1024 * 1024,
      })
    ).not.toThrow();
    expect(() =>
      validateReferenceImageMetadata({
        name: 'portrait.gif',
        type: 'image/gif',
        size: 100,
      })
    ).toThrow('Reference images must be JPG, PNG, or WebP.');
  });
});

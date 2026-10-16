import { describe, expect, it } from 'vitest';
import {
  imageTemplateSeeds,
  toPublicImageTemplate,
} from '@/lib/image-creator/templates.server';

describe('spreadsheet image template catalog', () => {
  it('publishes the source-image templates from newest to oldest', () => {
    expect(imageTemplateSeeds).toHaveLength(37);
    expect(imageTemplateSeeds[0]).toMatchObject({
      id: 'image-template-1015',
      coverUrl: '/images/image-templates/1015.png',
    });
    expect(imageTemplateSeeds.at(-1)).toMatchObject({
      id: 'image-template-0908',
      coverUrl: '/images/image-templates/0908.png',
    });
  });

  it('keeps the English generation prompt server-only', () => {
    const privateTemplate = imageTemplateSeeds[0];
    const publicTemplate = toPublicImageTemplate(privateTemplate);

    expect(privateTemplate.basePrompt).toMatch(/[A-Za-z]{8}/);
    expect(publicTemplate).not.toHaveProperty('basePrompt');
    expect(JSON.stringify(publicTemplate)).not.toContain(
      privateTemplate.basePrompt.slice(0, 48)
    );
  });
});

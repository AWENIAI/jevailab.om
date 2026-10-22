import { describe, expect, it } from 'vitest';
import {
  imageTemplateSeeds,
  listClassifiedImageTemplates,
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

  it('classifies only the six reviewed poster templates', () => {
    const classifiedTemplates = imageTemplateSeeds.filter(
      (template) => template.useCase && template.styleFamily
    );

    expect(classifiedTemplates).toHaveLength(6);
    expect(
      classifiedTemplates.map(({ id, useCase, styleFamily }) => ({
        id,
        useCase,
        styleFamily,
      }))
    ).toEqual([
      {
        id: 'image-template-1015',
        useCase: 'personal-brand',
        styleFamily: 'photo-editorial',
      },
      {
        id: 'image-template-1014',
        useCase: 'pet',
        styleFamily: 'hand-drawn',
      },
      {
        id: 'image-template-1013',
        useCase: 'event',
        styleFamily: 'collage',
      },
      {
        id: 'image-template-1012',
        useCase: 'event',
        styleFamily: 'collage',
      },
      {
        id: 'image-template-1011',
        useCase: 'social',
        styleFamily: 'collage',
      },
      {
        id: 'image-template-1010',
        useCase: 'travel',
        styleFamily: 'poster-print',
      },
    ]);
  });

  it('keeps the remaining templates unclassified', () => {
    const unclassifiedTemplates = imageTemplateSeeds.filter(
      (template) => !template.useCase && !template.styleFamily
    );

    expect(unclassifiedTemplates).toHaveLength(31);
    expect(unclassifiedTemplates).not.toContainEqual(
      expect.objectContaining({ id: 'image-template-1015' })
    );
  });

  it('never stores a partial classification', () => {
    for (const template of imageTemplateSeeds) {
      expect(Boolean(template.useCase)).toBe(Boolean(template.styleFamily));
    }
  });

  it('excludes unclassified templates from landing-page collections', () => {
    const landingPageTemplates = listClassifiedImageTemplates({
      useCase: 'event',
    });

    expect(landingPageTemplates.map((template) => template.id)).toEqual([
      'image-template-1013',
      'image-template-1012',
    ]);
    expect(
      listClassifiedImageTemplates({ styleFamily: 'photo-editorial' }).map(
        (template) => template.id
      )
    ).toEqual(['image-template-1015']);
  });

  it('keeps the English generation prompt server-only', () => {
    const privateTemplate = imageTemplateSeeds[0];
    const publicTemplate = toPublicImageTemplate(privateTemplate);

    expect(privateTemplate.basePrompt).toMatch(/[A-Za-z]{8}/);
    expect(publicTemplate).toMatchObject({
      useCase: 'personal-brand',
      styleFamily: 'photo-editorial',
    });
    expect(publicTemplate).not.toHaveProperty('basePrompt');
    expect(JSON.stringify(publicTemplate)).not.toContain(
      privateTemplate.basePrompt.slice(0, 48)
    );
  });
});

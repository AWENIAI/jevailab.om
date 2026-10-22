import { describe, expect, it } from 'vitest';
import {
  buildImageCreatorAuthHref,
  buildImageCreatorCallbackUrl,
  canSubmitImageCreatorDraft,
  getLocalizedImageTemplate,
  resolveExternalTemplateSelection,
  validateImageCreatorReferenceFile,
} from '@/lib/image-creator/ui-state';

describe('image creator submit state', () => {
  it('disables a free draft without a meaningful prompt', () => {
    expect(
      canSubmitImageCreatorDraft({
        isSubmitting: false,
        consentAccepted: true,
        templateId: null,
        prompt: '   ',
      })
    ).toBe(false);
  });

  it('allows a complete local draft without requiring sign-in', () => {
    expect(
      canSubmitImageCreatorDraft({
        isSubmitting: false,
        consentAccepted: true,
        templateId: 'cinematic-portrait',
        prompt: '',
      })
    ).toBe(true);
    expect(
      canSubmitImageCreatorDraft({
        isSubmitting: false,
        consentAccepted: true,
        templateId: 'cinematic-portrait',
        prompt: '',
      })
    ).toBe(true);
  });

  it('still requires consent and an idle request before submission', () => {
    expect(
      canSubmitImageCreatorDraft({
        isSubmitting: false,
        consentAccepted: false,
        templateId: 'cinematic-portrait',
        prompt: '',
      })
    ).toBe(false);
    expect(
      canSubmitImageCreatorDraft({
        isSubmitting: true,
        consentAccepted: true,
        templateId: 'cinematic-portrait',
        prompt: '',
      })
    ).toBe(false);
  });

  it('accepts a published external template selection and ignores an unknown one', () => {
    const availableTemplateIds = ['cinematic-portrait', 'sunset-story'];

    expect(
      resolveExternalTemplateSelection({
        currentTemplateId: 'cinematic-portrait',
        requestedTemplateId: 'sunset-story',
        availableTemplateIds,
      })
    ).toBe('sunset-story');
    expect(
      resolveExternalTemplateSelection({
        currentTemplateId: 'sunset-story',
        requestedTemplateId: 'not-a-template',
        availableTemplateIds,
      })
    ).toBe('sunset-story');
  });

  it('uses the selected locale for published template labels', () => {
    expect(
      getLocalizedImageTemplate(
        {
          id: 'cinematic-portrait',
          name: 'Cinematic portrait',
          description: 'English fallback',
          category: 'Photography',
        },
        'zh'
      )
    ).toMatchObject({ name: '电影人像', category: '摄影' });
  });

  it('rejects unsupported or oversized reference images before upload', () => {
    expect(
      validateImageCreatorReferenceFile({
        type: 'image/gif',
        size: 1024,
      })
    ).toBe('type');
    expect(
      validateImageCreatorReferenceFile({
        type: 'image/png',
        size: 10 * 1024 * 1024 + 1,
      })
    ).toBe('size');
    expect(
      validateImageCreatorReferenceFile({
        type: 'image/webp',
        size: 10 * 1024 * 1024,
      })
    ).toBeNull();
  });

  it('returns to the same editor after authentication', () => {
    expect(
      buildImageCreatorCallbackUrl({
        pathname: '/create',
        search: '?tab=image',
        hash: '',
      })
    ).toBe('/create?tab=image');
    expect(
      buildImageCreatorAuthHref({
        loginPath: '/auth/login',
        callbackUrl: '/create?tab=image',
      })
    ).toBe('/auth/login?callbackUrl=%2Fcreate%3Ftab%3Dimage');
  });
});

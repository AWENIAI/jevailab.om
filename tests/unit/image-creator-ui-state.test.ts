import { describe, expect, it } from 'vitest';
import {
  canSubmitImageCreatorDraft,
  getLocalizedImageTemplate,
  resolveExternalTemplateSelection,
} from '@/lib/image-creator/ui-state';

describe('image creator submit state', () => {
  it('disables a free draft without a meaningful prompt', () => {
    expect(
      canSubmitImageCreatorDraft({
        isSignedIn: true,
        isSubmitting: false,
        consentAccepted: true,
        templateId: null,
        prompt: '   ',
      })
    ).toBe(false);
  });

  it('requires sign-in, consent and an idle request before submission', () => {
    expect(
      canSubmitImageCreatorDraft({
        isSignedIn: true,
        isSubmitting: false,
        consentAccepted: true,
        templateId: 'cinematic-portrait',
        prompt: '',
      })
    ).toBe(true);
    expect(
      canSubmitImageCreatorDraft({
        isSignedIn: false,
        isSubmitting: false,
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
});

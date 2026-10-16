import { describe, expect, it } from 'vitest';
import { canSubmitImageCreatorDraft } from '@/lib/image-creator/ui-state';

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
});

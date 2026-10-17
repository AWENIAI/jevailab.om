import { describe, expect, it } from 'vitest';
import { canGenerateBulinVideo } from '@/lib/video-creator/ui-state';

describe('AI video creator state', () => {
  it('requires sign-in, an image, and explicit authorization before generation', () => {
    expect(
      canGenerateBulinVideo({
        isSignedIn: false,
        hasPhoto: true,
        authorizationAccepted: true,
        hasCurrentQuote: true,
        isSubmitting: false,
      })
    ).toBe(false);
    expect(
      canGenerateBulinVideo({
        isSignedIn: true,
        hasPhoto: false,
        authorizationAccepted: true,
        hasCurrentQuote: true,
        isSubmitting: false,
      })
    ).toBe(false);
    expect(
      canGenerateBulinVideo({
        isSignedIn: true,
        hasPhoto: true,
        authorizationAccepted: false,
        hasCurrentQuote: true,
        isSubmitting: false,
      })
    ).toBe(false);
    expect(
      canGenerateBulinVideo({
        isSignedIn: true,
        hasPhoto: true,
        authorizationAccepted: true,
        hasCurrentQuote: false,
        isSubmitting: false,
      })
    ).toBe(false);
    expect(
      canGenerateBulinVideo({
        isSignedIn: true,
        hasPhoto: true,
        authorizationAccepted: true,
        hasCurrentQuote: true,
        isSubmitting: true,
      })
    ).toBe(false);
    expect(
      canGenerateBulinVideo({
        isSignedIn: true,
        hasPhoto: true,
        authorizationAccepted: true,
        hasCurrentQuote: true,
        isSubmitting: false,
      })
    ).toBe(true);
  });
});

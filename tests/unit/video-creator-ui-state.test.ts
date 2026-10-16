import { describe, expect, it } from 'vitest';
import {
  canGenerateBulinVideo,
  getBulinVideoCredits,
} from '@/lib/video-creator/ui-state';

describe('Bulin 47 video creator state', () => {
  it('prices the selected model, resolution, and duration together', () => {
    expect(
      getBulinVideoCredits({
        model: 'standard',
        resolution: '720p',
        duration: 12,
      })
    ).toBe(10);
    expect(
      getBulinVideoCredits({
        model: 'ultra',
        resolution: '720p',
        duration: 15,
      })
    ).toBe(32);
  });

  it('requires both a signed-in user and a photo before video generation', () => {
    expect(
      canGenerateBulinVideo({
        isSignedIn: true,
        hasPhoto: false,
        isSubmitting: false,
      })
    ).toBe(false);
    expect(
      canGenerateBulinVideo({
        isSignedIn: true,
        hasPhoto: true,
        isSubmitting: false,
      })
    ).toBe(true);
  });
});

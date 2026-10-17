import { describe, expect, test } from 'vitest';
import { getCreatorTabState } from '@/lib/home-creator-tabs';

describe('homepage creator tabs', () => {
  test('opens the Bulin 47 video workspace for the video hash', () => {
    expect(getCreatorTabState('#video')).toEqual({
      surface: 'video',
      videoTab: 'bulin47',
    });
  });

  test('opens the duet video workspace without changing the video surface', () => {
    expect(getCreatorTabState('#video-duet')).toEqual({
      surface: 'video',
      videoTab: 'duet',
    });
  });

  test('opens the image workspace directly for image and legacy create links', () => {
    expect(getCreatorTabState('#image')).toEqual({
      surface: 'image',
      videoTab: 'bulin47',
    });
    expect(getCreatorTabState('#create')).toEqual({
      surface: 'image',
      videoTab: 'bulin47',
    });
  });

  test('accepts TanStack Router hashes that omit the leading number sign', () => {
    expect(getCreatorTabState('image')).toEqual({
      surface: 'image',
      videoTab: 'bulin47',
    });
    expect(getCreatorTabState('video-duet')).toEqual({
      surface: 'video',
      videoTab: 'duet',
    });
  });
});

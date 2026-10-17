import { describe, expect, test } from 'vitest';

import { getVideoCreatorCapabilitySnapshot } from '@/lib/video-creator/capabilities';

describe('video creator capability contract', () => {
  test('exposes only the two approved models and no 580p public option', () => {
    const capabilities = getVideoCreatorCapabilitySnapshot();
    expect(capabilities.models.map((model) => model.id)).toEqual([
      'bytedance/seedance-2-mini',
      'wan/2-2-animate-replace',
    ]);
    expect(capabilities.resolutions).toEqual(['480p', '720p']);
    expect(capabilities.referenceImage).toEqual({
      maxBytes: 8 * 1024 * 1024,
      mediaTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
  });
});

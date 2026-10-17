import { describe, expect, test } from 'vitest';
import { isSafeVideoProviderResultUrl } from '@/lib/video-creator/provider-result-url';

describe('video provider result URL validation', () => {
  test('accepts only public HTTPS output URLs', () => {
    expect(isSafeVideoProviderResultUrl('https://cdn.kie.ai/result.mp4')).toBe(
      true
    );
    expect(isSafeVideoProviderResultUrl('http://cdn.kie.ai/result.mp4')).toBe(
      false
    );
    expect(isSafeVideoProviderResultUrl('https://127.0.0.1/result.mp4')).toBe(
      false
    );
    expect(isSafeVideoProviderResultUrl('https://10.0.0.1/result.mp4')).toBe(
      false
    );
    expect(isSafeVideoProviderResultUrl('https://172.16.0.1/result.mp4')).toBe(
      false
    );
    expect(isSafeVideoProviderResultUrl('https://169.254.169.254/latest')).toBe(
      false
    );
    expect(isSafeVideoProviderResultUrl('https://192.168.1.1/result.mp4')).toBe(
      false
    );
    expect(
      isSafeVideoProviderResultUrl('https://service.local/result.mp4')
    ).toBe(false);
  });
});

import { describe, expect, test } from 'vitest';

import {
  VIDEO_PRICE_VERSION,
  estimateVideoProviderCostMicros,
  quoteVideoCredits,
} from '@/lib/video-creator/pricing';

describe('video creator pricing', () => {
  test('quotes Seedance using both input and output seconds in integer units', () => {
    expect(
      quoteVideoCredits({
        model: 'bytedance/seedance-2-mini',
        resolution: '480p',
        inputSeconds: 8,
        outputSeconds: 8,
      })
    ).toEqual({
      quotedUnits: 384,
      priceVersion: VIDEO_PRICE_VERSION,
      billableSeconds: 16,
    });
  });

  test('quotes Wan using only its trusted template duration', () => {
    expect(
      quoteVideoCredits({
        model: 'wan/2-2-animate-replace',
        resolution: '720p',
        inputSeconds: 12,
        outputSeconds: 12,
      })
    ).toEqual({
      quotedUnits: 1500,
      priceVersion: VIDEO_PRICE_VERSION,
      billableSeconds: 12,
    });
  });

  test('rejects the disabled 580p rate before a quote exists', () => {
    expect(() =>
      quoteVideoCredits({
        model: 'wan/2-2-animate-replace',
        resolution: '580p',
        inputSeconds: 8,
        outputSeconds: 8,
      })
    ).toThrow('not enabled');
  });

  test('derives provider budget cost in integer micros without floats', () => {
    expect(
      estimateVideoProviderCostMicros({
        model: 'bytedance/seedance-2-mini',
        resolution: '720p',
        inputSeconds: 12,
        outputSeconds: 12,
      })
    ).toBe(600_000);
  });
});

import { describe, expect, it } from 'vitest';
import {
  getAvailableKieImageAspectRatios,
  getKieImageCreditCost,
  toKieImageInput,
} from '@/lib/kie-image';

describe('Kie GPT Image 2 request rules', () => {
  it('uses the official per-image credit cost for each resolution', () => {
    expect(getKieImageCreditCost('1K', 1)).toBe(6);
    expect(getKieImageCreditCost('2K', 2)).toBe(20);
    expect(getKieImageCreditCost('4K', 3)).toBe(48);
  });

  it('removes aspect ratios unsupported by higher resolutions', () => {
    expect(getAvailableKieImageAspectRatios('2K')).not.toContain('5:4');
    expect(getAvailableKieImageAspectRatios('2K')).not.toContain('9:21');
    expect(getAvailableKieImageAspectRatios('4K')).not.toContain('3:1');
    expect(getAvailableKieImageAspectRatios('4K')).toContain('5:4');
  });

  it('only sends background settings for 1K images', () => {
    expect(
      toKieImageInput({
        prompt: 'A bright product photograph',
        resolution: '1K',
        aspectRatio: '1:1',
        background: 'transparent',
      })
    ).toEqual({
      prompt: 'A bright product photograph',
      resolution: '1K',
      aspect_ratio: '1:1',
      background: 'transparent',
    });

    expect(
      toKieImageInput({
        prompt: 'A bright product photograph',
        resolution: '2K',
        aspectRatio: '1:1',
        background: 'transparent',
      })
    ).not.toHaveProperty('background');
  });
});

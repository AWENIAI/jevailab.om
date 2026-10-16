import { describe, expect, it } from 'vitest';
import {
  createImageCreatorDraftFingerprint,
  getImageCreatorQuote,
} from '@/lib/image-creator/pricing';

describe('image creator server pricing', () => {
  it('calculates the configured price per generated image', () => {
    expect(getImageCreatorQuote({ mode: '1K_SD', count: 2 })).toMatchObject({
      unitCredits: 2,
      totalCredits: 4,
    });
    expect(getImageCreatorQuote({ mode: '2K_HD', count: 3 })).toMatchObject({
      unitCredits: 5,
      totalCredits: 15,
    });
  });

  it('makes the same normalized draft produce the same fingerprint', async () => {
    await expect(
      createImageCreatorDraftFingerprint({
        templateId: 'cinematic-portrait',
        referenceAssetId: null,
        mode: '1K_SD',
        ratio: '3:4',
        count: 1,
        extraPrompt: '  warm portrait  ',
      })
    ).resolves.toBe(
      await createImageCreatorDraftFingerprint({
        templateId: 'cinematic-portrait',
        referenceAssetId: null,
        mode: '1K_SD',
        ratio: '3:4',
        count: 1,
        extraPrompt: 'warm portrait',
      })
    );
  });
});

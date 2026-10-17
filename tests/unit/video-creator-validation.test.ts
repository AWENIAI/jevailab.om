import { describe, expect, test } from 'vitest';

import {
  validateVideoReferenceImageMetadata,
  videoGenerateInputSchema,
} from '@/lib/video-creator/validation';

describe('video creator validation', () => {
  test('allows only a small supported portrait image', async () => {
    const file = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      'portrait.png',
      { type: 'image/png' }
    );
    await expect(
      validateVideoReferenceImageMetadata(file)
    ).resolves.toBeUndefined();
  });

  test('rejects a claimed image whose bytes are SVG markup', async () => {
    const file = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg"/>'],
      'portrait.png',
      {
        type: 'image/png',
      }
    );
    await expect(validateVideoReferenceImageMetadata(file)).rejects.toThrow(
      'file signature'
    );
  });

  test('requires authorization acceptance and opaque IDs on generation', () => {
    expect(
      videoGenerateInputSchema.safeParse({
        quoteId: 'quote_12345678',
        assetId: 'asset_12345678',
        idempotencyKey: 'request_12345678',
        authorizationAccepted: false,
      }).success
    ).toBe(false);
  });
});

import { z } from 'zod';
import { VIDEO_MODELS, VIDEO_RESOLUTIONS } from './contracts';

const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const videoQuoteInputSchema = z.object({
  templateId: z.string().trim().min(8).max(128),
  model: z.enum(VIDEO_MODELS),
  resolution: z.enum(VIDEO_RESOLUTIONS).refine((value) => value !== '580p', {
    message: '580p is not available.',
  }),
});

export const videoGenerateInputSchema = z.object({
  quoteId: z.string().trim().min(8).max(128),
  assetId: z.string().trim().min(8).max(128),
  idempotencyKey: z.string().trim().min(8).max(128),
  authorizationAccepted: z.literal(true),
});

function matchesSignature(
  mediaType: (typeof ALLOWED_MEDIA_TYPES)[number],
  bytes: Uint8Array
) {
  if (mediaType === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mediaType === 'image/jpeg') {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }
  return (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  );
}

export async function validateVideoReferenceImageMetadata(file: File) {
  if (
    !ALLOWED_MEDIA_TYPES.includes(
      file.type as (typeof ALLOWED_MEDIA_TYPES)[number]
    )
  ) {
    throw new Error('Unsupported reference image type.');
  }
  if (file.size <= 0 || file.size > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error('Reference image must be no larger than 8 MB.');
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (
    !matchesSignature(file.type as (typeof ALLOWED_MEDIA_TYPES)[number], bytes)
  ) {
    throw new Error(
      'Reference image file signature does not match its declared type.'
    );
  }
}

export const videoReferenceUploadSchema = z
  .custom<FormData>((value): value is FormData => value instanceof FormData)
  .transform((formData) => {
    const file = formData.get('file');
    const authorizationAccepted =
      formData.get('authorizationAccepted') === 'true';
    if (!file || !(file instanceof File)) {
      throw new Error('Reference image is required.');
    }
    if (!authorizationAccepted) {
      throw new Error('Authorization acceptance is required.');
    }
    return { file, authorizationAccepted };
  });

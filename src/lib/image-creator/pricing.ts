import type { ImageCreatorDraft, ImageCreatorMode } from './types';

export const IMAGE_CREATOR_PRICE_VERSION = '2026-10-16';

const CREDITS_PER_IMAGE: Record<ImageCreatorMode, number> = {
  '1K_SD': 2,
  '2K_HD': 5,
};

export function getImageCreatorQuote({
  mode,
  count,
}: Pick<ImageCreatorDraft, 'mode' | 'count'>) {
  const unitCredits = CREDITS_PER_IMAGE[mode];
  return {
    priceVersion: IMAGE_CREATOR_PRICE_VERSION,
    unitCredits,
    totalCredits: unitCredits * count,
  };
}

export async function createImageCreatorDraftFingerprint(
  draft: ImageCreatorDraft
): Promise<string> {
  const normalized = JSON.stringify({
    ...draft,
    extraPrompt: draft.extraPrompt.trim(),
  });
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

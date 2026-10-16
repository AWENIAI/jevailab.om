export const KIE_IMAGE_RESOLUTIONS = ['1K', '2K', '4K'] as const;
export const KIE_IMAGE_ASPECT_RATIOS = [
  'auto',
  '1:1',
  '3:2',
  '2:3',
  '4:3',
  '3:4',
  '5:4',
  '4:5',
  '16:9',
  '9:16',
  '2:1',
  '1:2',
  '3:1',
  '1:3',
  '21:9',
  '9:21',
] as const;
export const KIE_IMAGE_BACKGROUNDS = ['auto', 'opaque', 'transparent'] as const;

export type KieImageResolution = (typeof KIE_IMAGE_RESOLUTIONS)[number];
export type KieImageAspectRatio = (typeof KIE_IMAGE_ASPECT_RATIOS)[number];
export type KieImageBackground = (typeof KIE_IMAGE_BACKGROUNDS)[number];

const CREDIT_COST: Record<KieImageResolution, number> = {
  '1K': 6,
  '2K': 10,
  '4K': 16,
};

const UNSUPPORTED_RATIOS: Partial<
  Record<KieImageResolution, readonly KieImageAspectRatio[]>
> = {
  '2K': ['5:4', '4:5', '3:1', '1:3', '9:21'],
  '4K': ['3:1', '1:3', '9:21'],
};

export function getKieImageCreditCost(
  resolution: KieImageResolution,
  count: number
): number {
  return CREDIT_COST[resolution] * count;
}

export function getAvailableKieImageAspectRatios(
  resolution: KieImageResolution
): KieImageAspectRatio[] {
  const unsupported = new Set(UNSUPPORTED_RATIOS[resolution] ?? []);
  return KIE_IMAGE_ASPECT_RATIOS.filter((ratio) => !unsupported.has(ratio));
}

export function toKieImageInput({
  prompt,
  resolution,
  aspectRatio,
  background,
}: {
  prompt: string;
  resolution: KieImageResolution;
  aspectRatio: KieImageAspectRatio;
  background: KieImageBackground;
}) {
  if (!getAvailableKieImageAspectRatios(resolution).includes(aspectRatio)) {
    throw new Error(`${aspectRatio} is not supported at ${resolution}.`);
  }

  return {
    prompt,
    resolution,
    aspect_ratio: aspectRatio,
    ...(resolution === '1K' ? { background } : {}),
  };
}

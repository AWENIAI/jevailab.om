export type BulinVideoModel =
  | 'standard'
  | 'fast'
  | 'pro'
  | 'ultra'
  | 'wan'
  | 'wan-prime';

export type BulinVideoResolution = '480p' | '720p';

const MODEL_CREDITS: Record<BulinVideoModel, number> = {
  standard: 10,
  fast: 8,
  pro: 18,
  ultra: 24,
  wan: 16,
  'wan-prime': 22,
};

export function getBulinVideoCredits({
  model,
  resolution,
  duration,
}: {
  model: BulinVideoModel;
  resolution: BulinVideoResolution;
  duration: 12 | 15;
}) {
  const resolutionFactor = resolution === '720p' ? 1 : 0.8;
  const durationFactor = duration === 15 ? 1.35 : 1;
  return Math.round(MODEL_CREDITS[model] * resolutionFactor * durationFactor);
}

export function canGenerateBulinVideo({
  isSignedIn,
  hasPhoto,
  isSubmitting,
}: {
  isSignedIn: boolean;
  hasPhoto: boolean;
  isSubmitting: boolean;
}) {
  return isSignedIn && hasPhoto && !isSubmitting;
}

import type { VideoModel, VideoQuoteInput, VideoResolution } from './contracts';

export const VIDEO_PRICE_VERSION = 'kie-public-2026-10-17';

type PriceRate = {
  unitsPerSecond: number;
  usdMicrosPerSecond: number;
  billableMode: 'input' | 'input_and_output';
  enabled: boolean;
};

export type VersionedVideoPriceRate = PriceRate & {
  priceVersion: string;
};

const RATES: Record<VideoModel, Record<VideoResolution, PriceRate>> = {
  'bytedance/seedance-2-mini': {
    '480p': {
      unitsPerSecond: 24,
      usdMicrosPerSecond: 12_000,
      billableMode: 'input_and_output',
      enabled: true,
    },
    '580p': {
      unitsPerSecond: 0,
      usdMicrosPerSecond: 0,
      billableMode: 'input_and_output',
      enabled: false,
    },
    '720p': {
      unitsPerSecond: 50,
      usdMicrosPerSecond: 25_000,
      billableMode: 'input_and_output',
      enabled: true,
    },
  },
  'wan/2-2-animate-replace': {
    '480p': {
      unitsPerSecond: 60,
      usdMicrosPerSecond: 30_000,
      billableMode: 'input',
      enabled: true,
    },
    '580p': {
      unitsPerSecond: 95,
      usdMicrosPerSecond: 47_500,
      billableMode: 'input',
      enabled: false,
    },
    '720p': {
      unitsPerSecond: 125,
      usdMicrosPerSecond: 62_500,
      billableMode: 'input',
      enabled: true,
    },
  },
};

function assertSeconds(value: number, label: string) {
  if (!Number.isInteger(value) || value < 4 || value > 15) {
    throw new Error(`${label} must be an integer between 4 and 15 seconds.`);
  }
}

export function quoteVideoCreditsAtRate(
  input: VideoQuoteInput,
  rate: VersionedVideoPriceRate
) {
  assertSeconds(input.inputSeconds, 'Input duration');
  assertSeconds(input.outputSeconds, 'Output duration');
  if (!rate.enabled) {
    throw new Error(
      `${input.model} at ${input.resolution} is not enabled for video creation.`
    );
  }
  const billableSeconds =
    rate.billableMode === 'input'
      ? input.inputSeconds
      : input.inputSeconds + input.outputSeconds;
  return {
    quotedUnits: rate.unitsPerSecond * billableSeconds,
    priceVersion: rate.priceVersion,
    billableSeconds,
  };
}

export function quoteVideoCredits(input: VideoQuoteInput) {
  return quoteVideoCreditsAtRate(input, {
    ...RATES[input.model][input.resolution],
    priceVersion: VIDEO_PRICE_VERSION,
  });
}

export function getVideoPriceRate(
  model: VideoModel,
  resolution: VideoResolution
) {
  return RATES[model][resolution];
}

export function estimateVideoProviderCostMicros(input: VideoQuoteInput) {
  const quote = quoteVideoCredits(input);
  const rate = RATES[input.model][input.resolution];
  return quote.billableSeconds * rate.usdMicrosPerSecond;
}

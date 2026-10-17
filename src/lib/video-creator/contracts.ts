export const VIDEO_MODELS = [
  'bytedance/seedance-2-mini',
  'wan/2-2-animate-replace',
] as const;

export type VideoModel = (typeof VIDEO_MODELS)[number];

export const VIDEO_RESOLUTIONS = ['480p', '580p', '720p'] as const;

export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

export type VideoQuoteInput = {
  model: VideoModel;
  resolution: VideoResolution;
  inputSeconds: number;
  outputSeconds: number;
};

export type VideoFeatureFlags = {
  enabled: boolean;
  providerSendEnabled: boolean;
  liveTestEnabled: boolean;
};

export type VideoJobStatus =
  | 'QUEUED'
  | 'DISPATCHING'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REVIEW_REQUIRED'
  | 'CANCELLED';

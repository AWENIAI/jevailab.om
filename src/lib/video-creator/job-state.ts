import type { VideoJobStatus } from './contracts';

export type VideoJobEvent =
  | 'claimed'
  | 'provider_submitted'
  | 'provider_processing'
  | 'provider_succeeded'
  | 'provider_failed'
  | 'unknown_dispatch'
  | 'cancelled';

export function nextVideoJobStatus(
  current: VideoJobStatus,
  event: VideoJobEvent
): VideoJobStatus {
  if (
    current === 'SUCCEEDED' ||
    current === 'FAILED' ||
    current === 'CANCELLED'
  ) {
    return current;
  }
  if (event === 'unknown_dispatch') return 'REVIEW_REQUIRED';
  if (event === 'cancelled') return 'CANCELLED';
  if (event === 'provider_failed') return 'FAILED';
  if (event === 'provider_succeeded') return 'SUCCEEDED';
  if (event === 'provider_processing') return 'PROCESSING';
  if (event === 'provider_submitted') return 'SUBMITTED';
  if (event === 'claimed') return 'DISPATCHING';
  return current;
}

export function isVideoJobTerminal(status: VideoJobStatus) {
  return ['SUCCEEDED', 'FAILED', 'CANCELLED', 'REVIEW_REQUIRED'].includes(
    status
  );
}

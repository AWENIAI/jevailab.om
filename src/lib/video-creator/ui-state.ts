import type { VideoModel } from './contracts';

export type BulinVideoModel = VideoModel;
export type BulinVideoResolution = '480p' | '720p';

export function canGenerateBulinVideo({
  isSignedIn,
  hasPhoto,
  authorizationAccepted,
  hasCurrentQuote,
  isSubmitting,
}: {
  isSignedIn: boolean;
  hasPhoto: boolean;
  authorizationAccepted: boolean;
  hasCurrentQuote: boolean;
  isSubmitting: boolean;
}) {
  return (
    isSignedIn &&
    hasPhoto &&
    authorizationAccepted &&
    hasCurrentQuote &&
    !isSubmitting
  );
}

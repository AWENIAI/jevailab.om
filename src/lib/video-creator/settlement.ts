import type { VideoJobStatus } from './contracts';

export function getVideoSettlementPlan({
  jobStatus,
  providerState,
  privateOutputStored,
}: {
  jobStatus: VideoJobStatus;
  providerState: 'SUCCEEDED' | 'FAILED' | 'PROCESSING' | 'REVIEW_REQUIRED';
  privateOutputStored: boolean;
}) {
  if (jobStatus === 'SUCCEEDED' || jobStatus === 'FAILED') {
    return { nextStatus: jobStatus, ledgerEvent: 'NONE' as const };
  }
  if (providerState === 'FAILED') {
    return { nextStatus: 'FAILED' as const, ledgerEvent: 'RELEASE' as const };
  }
  if (providerState === 'SUCCEEDED' && privateOutputStored) {
    return {
      nextStatus: 'SUCCEEDED' as const,
      ledgerEvent: 'CAPTURE' as const,
    };
  }
  if (providerState === 'SUCCEEDED' || providerState === 'REVIEW_REQUIRED') {
    return {
      nextStatus: 'REVIEW_REQUIRED' as const,
      ledgerEvent: 'NONE' as const,
    };
  }
  return { nextStatus: 'PROCESSING' as const, ledgerEvent: 'NONE' as const };
}

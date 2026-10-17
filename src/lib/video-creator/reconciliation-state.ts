import type { VideoJobStatus } from './contracts';

/**
 * Kie callbacks are best-effort. Only these persisted in-flight states are
 * eligible for the scheduled recordInfo fallback; terminal and unsent jobs
 * must never produce a provider lookup.
 */
export function isKieReconciliationCandidate({
  status,
  providerTaskId,
}: {
  status: VideoJobStatus;
  providerTaskId: string | null;
}) {
  return (
    Boolean(providerTaskId) &&
    (status === 'SUBMITTED' || status === 'PROCESSING')
  );
}

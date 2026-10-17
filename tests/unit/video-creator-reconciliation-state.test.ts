import { describe, expect, test } from 'vitest';
import { isKieReconciliationCandidate } from '@/lib/video-creator/reconciliation-state';

describe('Kie reconciliation candidates', () => {
  test('polls submitted and processing jobs when no callback arrives', () => {
    expect(
      isKieReconciliationCandidate({
        status: 'SUBMITTED',
        providerTaskId: 'task_1',
      })
    ).toBe(true);
    expect(
      isKieReconciliationCandidate({
        status: 'PROCESSING',
        providerTaskId: 'task_2',
      })
    ).toBe(true);
  });

  test('never polls terminal, pre-dispatch, or taskless jobs', () => {
    expect(
      isKieReconciliationCandidate({
        status: 'SUCCEEDED',
        providerTaskId: 'task_3',
      })
    ).toBe(false);
    expect(
      isKieReconciliationCandidate({
        status: 'QUEUED',
        providerTaskId: 'task_4',
      })
    ).toBe(false);
    expect(
      isKieReconciliationCandidate({
        status: 'SUBMITTED',
        providerTaskId: null,
      })
    ).toBe(false);
  });
});

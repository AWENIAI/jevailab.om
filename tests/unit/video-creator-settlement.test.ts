import { describe, expect, test } from 'vitest';

import { getVideoSettlementPlan } from '@/lib/video-creator/settlement';

describe('video job settlement', () => {
  test('captures an accepted hold only after private result storage succeeds', () => {
    expect(
      getVideoSettlementPlan({
        jobStatus: 'PROCESSING',
        providerState: 'SUCCEEDED',
        privateOutputStored: true,
      })
    ).toEqual({ nextStatus: 'SUCCEEDED', ledgerEvent: 'CAPTURE' });
  });

  test('releases an unconsumed hold for a provider failure', () => {
    expect(
      getVideoSettlementPlan({
        jobStatus: 'PROCESSING',
        providerState: 'FAILED',
        privateOutputStored: false,
      })
    ).toEqual({ nextStatus: 'FAILED', ledgerEvent: 'RELEASE' });
  });

  test('moves a success without stored output to review instead of charging', () => {
    expect(
      getVideoSettlementPlan({
        jobStatus: 'PROCESSING',
        providerState: 'SUCCEEDED',
        privateOutputStored: false,
      })
    ).toEqual({ nextStatus: 'REVIEW_REQUIRED', ledgerEvent: 'NONE' });
  });
});

import { describe, expect, test } from 'vitest';
import { getVideoBudgetDecision } from '@/lib/video-creator/budget';

const limits = {
  providerMaxInflight: 3,
  hourlyBudgetMicros: 3_000_000,
  dailyBudgetMicros: 10_000_000,
  perUserDailyBudgetMicros: 1_500_000,
};

describe('video provider budget gate', () => {
  test('blocks a job before dispatch when a strict budget or inflight limit would be exceeded', () => {
    expect(
      getVideoBudgetDecision({
        ...limits,
        activeProviderJobs: 3,
        hourlyReservedMicros: 0,
        dailyReservedMicros: 0,
        userDailyReservedMicros: 0,
        requestedMicros: 1,
      })
    ).toEqual({ allowed: false, reason: 'PROVIDER_INFLIGHT_LIMIT' });
    expect(
      getVideoBudgetDecision({
        ...limits,
        activeProviderJobs: 0,
        hourlyReservedMicros: 2_900_000,
        dailyReservedMicros: 2_900_000,
        userDailyReservedMicros: 0,
        requestedMicros: 200_000,
      })
    ).toEqual({ allowed: false, reason: 'HOURLY_BUDGET_LIMIT' });
    expect(
      getVideoBudgetDecision({
        ...limits,
        activeProviderJobs: 0,
        hourlyReservedMicros: 0,
        dailyReservedMicros: 0,
        userDailyReservedMicros: 1_400_000,
        requestedMicros: 200_000,
      })
    ).toEqual({ allowed: false, reason: 'USER_DAILY_BUDGET_LIMIT' });
  });

  test('permits a job only when all independent limits remain below their caps', () => {
    expect(
      getVideoBudgetDecision({
        ...limits,
        activeProviderJobs: 1,
        hourlyReservedMicros: 1_000_000,
        dailyReservedMicros: 4_000_000,
        userDailyReservedMicros: 200_000,
        requestedMicros: 300_000,
      })
    ).toEqual({ allowed: true });
  });
});

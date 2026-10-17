export type VideoBudgetDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | 'PROVIDER_INFLIGHT_LIMIT'
        | 'HOURLY_BUDGET_LIMIT'
        | 'DAILY_BUDGET_LIMIT'
        | 'USER_DAILY_BUDGET_LIMIT';
    };

export function getVideoBudgetDecision({
  providerMaxInflight,
  hourlyBudgetMicros,
  dailyBudgetMicros,
  perUserDailyBudgetMicros,
  activeProviderJobs,
  hourlyReservedMicros,
  dailyReservedMicros,
  userDailyReservedMicros,
  requestedMicros,
}: {
  providerMaxInflight: number;
  hourlyBudgetMicros: number;
  dailyBudgetMicros: number;
  perUserDailyBudgetMicros: number;
  activeProviderJobs: number;
  hourlyReservedMicros: number;
  dailyReservedMicros: number;
  userDailyReservedMicros: number;
  requestedMicros: number;
}): VideoBudgetDecision {
  if (activeProviderJobs >= providerMaxInflight) {
    return { allowed: false, reason: 'PROVIDER_INFLIGHT_LIMIT' };
  }
  if (hourlyReservedMicros + requestedMicros > hourlyBudgetMicros) {
    return { allowed: false, reason: 'HOURLY_BUDGET_LIMIT' };
  }
  if (dailyReservedMicros + requestedMicros > dailyBudgetMicros) {
    return { allowed: false, reason: 'DAILY_BUDGET_LIMIT' };
  }
  if (userDailyReservedMicros + requestedMicros > perUserDailyBudgetMicros) {
    return { allowed: false, reason: 'USER_DAILY_BUDGET_LIMIT' };
  }
  return { allowed: true };
}

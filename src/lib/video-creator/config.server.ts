import { serverEnv } from '@/env/server';

function boundedInteger(
  value: string,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : fallback;
}

function usdToMicros(value: string, fallbackMicros: number) {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) return fallbackMicros;
  const [whole, fraction = ''] = value.split('.');
  const micros =
    Number(whole) * 1_000_000 + Number((fraction + '000000').slice(0, 6));
  return Number.isSafeInteger(micros) && micros > 0 ? micros : fallbackMicros;
}

export function getVideoFeatureFlags() {
  return {
    enabled: serverEnv.VIDEO_REPLACEMENT_ENABLED === 'true',
    providerSendEnabled:
      serverEnv.VIDEO_REPLACEMENT_PROVIDER_SEND_ENABLED === 'true',
    liveTestEnabled: serverEnv.KIE_LIVE_TEST_ENABLED === 'true',
    allowPromoCredits:
      serverEnv.VIDEO_REPLACEMENT_ALLOW_PROMO_CREDITS === 'true',
  };
}

export function getVideoRuntimeLimits() {
  return {
    maxActivePerUser: boundedInteger(
      serverEnv.VIDEO_REPLACEMENT_MAX_ACTIVE_PER_USER,
      1,
      1,
      10
    ),
    maxJobsPerUserDay: boundedInteger(
      serverEnv.VIDEO_REPLACEMENT_MAX_JOBS_PER_USER_DAY,
      3,
      1,
      100
    ),
    maxJobsPerUserWeek: boundedInteger(
      serverEnv.VIDEO_REPLACEMENT_MAX_JOBS_PER_USER_WEEK,
      10,
      1,
      500
    ),
    quoteTtlSeconds: boundedInteger(
      serverEnv.VIDEO_REPLACEMENT_QUOTE_TTL_SECONDS,
      300,
      60,
      900
    ),
    providerMaxInflight: boundedInteger(
      serverEnv.VIDEO_REPLACEMENT_PROVIDER_MAX_INFLIGHT,
      3,
      1,
      20
    ),
    hourlyBudgetMicros: usdToMicros(
      serverEnv.VIDEO_REPLACEMENT_HOURLY_BUDGET_USD,
      3_000_000
    ),
    dailyBudgetMicros: usdToMicros(
      serverEnv.VIDEO_REPLACEMENT_DAILY_BUDGET_USD,
      10_000_000
    ),
    perUserDailyBudgetMicros: usdToMicros(
      serverEnv.VIDEO_REPLACEMENT_PER_USER_DAILY_BUDGET_USD,
      1_500_000
    ),
  };
}

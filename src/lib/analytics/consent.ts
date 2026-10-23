export const ANALYTICS_CONSENT_STORAGE_KEY = 'jevailab:analytics-consent:v1';

export type AnalyticsConsent = 'granted' | 'denied';
let fallbackConsent: AnalyticsConsent | null = null;

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === 'undefined') return fallbackConsent;
  const value = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

export function setAnalyticsConsent(value: AnalyticsConsent) {
  if (typeof window === 'undefined') {
    fallbackConsent = value;
    return;
  }
  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
}

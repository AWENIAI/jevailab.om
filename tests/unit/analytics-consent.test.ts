import { describe, expect, it } from 'vitest';
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
} from '@/lib/analytics/consent';

describe('analytics consent', () => {
  it('stores an explicit analytics choice', () => {
    expect(getAnalyticsConsent()).toBeNull();
    setAnalyticsConsent('granted');
    expect(getAnalyticsConsent()).toBe('granted');
    setAnalyticsConsent('denied');
    expect(getAnalyticsConsent()).toBe('denied');
  });
});

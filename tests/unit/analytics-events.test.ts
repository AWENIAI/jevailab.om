import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  sanitizeAnalyticsPath,
  trackAnalyticsEvent,
  trackPageView,
} from '@/lib/analytics/events';
import { setAnalyticsConsent } from '@/lib/analytics/consent';

describe('analytics event contract', () => {
  afterEach(() => {
    delete (globalThis as { gtag?: unknown }).gtag;
  });

  it('sends only whitelisted template fields', () => {
    const gtag = vi.fn();
    (globalThis as { gtag?: unknown }).gtag = gtag;
    setAnalyticsConsent('granted');

    trackAnalyticsEvent('template_selected', {
      template_id: 'image-template-1015',
      template_category: 'Editorial',
      email: 'person@example.com',
    } as never);

    expect(gtag).toHaveBeenCalledWith('event', 'template_selected', {
      template_id: 'image-template-1015',
      template_category: 'Editorial',
    });
  });

  it('removes query strings and fragments from page views', () => {
    const gtag = vi.fn();
    (globalThis as { gtag?: unknown }).gtag = gtag;
    setAnalyticsConsent('granted');

    expect(
      sanitizeAnalyticsPath('/settings/payment?session_id=secret#done')
    ).toBe('/settings/payment');
    trackPageView('/settings/payment?session_id=secret#done', 'en');

    expect(gtag).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/settings/payment',
      locale: 'en',
    });
  });

  it('does nothing when the Google tag is unavailable', () => {
    expect(() =>
      trackAnalyticsEvent('login', { method: 'email' })
    ).not.toThrow();
  });
});

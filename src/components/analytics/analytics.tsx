import { GoogleAnalytics } from './google-analytics';
import { useEffect, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import {
  getAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analytics/consent';
import { AnalyticsConsentPrompt } from './analytics-consent';
import { trackPageView } from '@/lib/analytics/events';
import { getLocale } from '@/lib/locale';
import { clientEnv } from '@/env/client';

/**
 * Renders all script-based analytics (only in production)
 */
export function Analytics() {
  if (!import.meta.env.PROD) return null;
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    setConsent(getAnalyticsConsent());
  }, []);

  useEffect(() => {
    if (consent !== 'granted' || !clientEnv.VITE_GOOGLE_ANALYTICS_ID) return;
    const analyticsWindow = window as typeof window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
    analyticsWindow.gtag =
      analyticsWindow.gtag ??
      ((...args: unknown[]) => analyticsWindow.dataLayer?.push(args));
    analyticsWindow.gtag('js', new Date());
    analyticsWindow.gtag('config', clientEnv.VITE_GOOGLE_ANALYTICS_ID, {
      send_page_view: false,
    });
    trackPageView(pathname, getLocale());
  }, [consent, pathname]);

  return (
    <>
      <GoogleAnalytics enabled={consent === 'granted'} />
      {consent === null ? (
        <AnalyticsConsentPrompt onChange={setConsent} />
      ) : null}
    </>
  );
}

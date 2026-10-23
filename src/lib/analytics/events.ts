import { getAnalyticsConsent } from './consent';

type AnalyticsValue = string | number;

type AnalyticsPayloads = {
  sign_up: { method: 'email' | 'google' };
  login: { method: 'email' | 'google' };
  create_page_view: { locale: string };
  template_selected: { template_id: string; template_category: string };
  quote_requested: {
    mode: string;
    ratio: string;
    output_count: number;
    total_credits: number;
  };
  generation_started: {
    mode: string;
    ratio: string;
    output_count: number;
    total_credits: number;
  };
  generation_completed: { mode: string; ratio: string; output_count: number };
  generation_failed: { failure_stage: string; error_code: string };
  image_downloaded: { mode: string; ratio: string };
  pricing_viewed: { locale: string };
  checkout_started: { plan_id: string; billing_interval: string };
  purchase: { plan_id: string; billing_interval: string };
};

export type AnalyticsEventName = keyof AnalyticsPayloads;

type Gtag = (
  command: 'event',
  event: string,
  params: Record<string, AnalyticsValue>
) => void;

const allowedFields: Record<AnalyticsEventName, readonly string[]> = {
  sign_up: ['method'],
  login: ['method'],
  create_page_view: ['locale'],
  template_selected: ['template_id', 'template_category'],
  quote_requested: ['mode', 'ratio', 'output_count', 'total_credits'],
  generation_started: ['mode', 'ratio', 'output_count', 'total_credits'],
  generation_completed: ['mode', 'ratio', 'output_count'],
  generation_failed: ['failure_stage', 'error_code'],
  image_downloaded: ['mode', 'ratio'],
  pricing_viewed: ['locale'],
  checkout_started: ['plan_id', 'billing_interval'],
  purchase: ['plan_id', 'billing_interval'],
};

function getGtag(): Gtag | null {
  const candidate = (globalThis as { gtag?: unknown }).gtag;
  return typeof candidate === 'function' ? (candidate as Gtag) : null;
}

export function sanitizeAnalyticsPath(pathname: string) {
  const value = pathname.split(/[?#]/, 1)[0] || '/';
  return value.startsWith('/') ? value : '/';
}

export function trackAnalyticsEvent<T extends AnalyticsEventName>(
  event: T,
  payload: AnalyticsPayloads[T]
) {
  const gtag = getGtag();
  if (getAnalyticsConsent() !== 'granted') return;
  if (!gtag) return;

  const safePayload = Object.fromEntries(
    allowedFields[event].flatMap((key) => {
      const value = (payload as Record<string, unknown>)[key];
      return typeof value === 'string' || typeof value === 'number'
        ? [[key, value]]
        : [];
    })
  ) as Record<string, AnalyticsValue>;
  gtag('event', event, safePayload);
}

export function trackPageView(pathname: string, locale: string) {
  const gtag = getGtag();
  if (getAnalyticsConsent() !== 'granted') return;
  if (!gtag) return;
  gtag('event', 'page_view', {
    page_path: sanitizeAnalyticsPath(pathname),
    locale,
  });
}

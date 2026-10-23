import { ClientScript } from '@/components/shared/client-script';
import { clientEnv } from '@/env/client';

/**
 * Google Analytics (GA4)
 * https://analytics.google.com
 */
export function GoogleAnalytics({ enabled = false }: { enabled?: boolean }) {
  if (!import.meta.env.PROD) return null;
  if (!enabled) return null;
  const id = clientEnv.VITE_GOOGLE_ANALYTICS_ID;
  if (!id) return null;

  return (
    <ClientScript
      src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      async
    />
  );
}

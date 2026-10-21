import { auth } from '@/auth/auth';
import { redirect } from '@tanstack/react-router';
import { createMiddleware } from '@tanstack/react-start';
import { getRequestHeaders, getRequestUrl } from '@tanstack/react-start/server';
import { DEFAULT_LOGIN_REDIRECT, Routes } from '@/lib/routes';
import { getSafeInternalRedirect } from '@/lib/safe-redirect';
import { websiteConfig } from '@/config/website';

/**
 * Guest Route middleware: redirects authenticated users to the dashboard.
 * Use on public auth pages (login, register) to prevent logged-in users
 * from seeing them.
 */
export const guestRouteMiddleware = createMiddleware().server(
  async ({ next }) => {
    if (!websiteConfig.auth?.enable) {
      throw redirect({ to: Routes.Root });
    }

    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (session?.user) {
      const callbackUrl = new URL(getRequestUrl()).searchParams.get(
        'callbackUrl'
      );
      throw redirect({
        href:
          getSafeInternalRedirect(callbackUrl) ??
          getSafeInternalRedirect(DEFAULT_LOGIN_REDIRECT) ??
          Routes.Root,
      });
    }

    return await next();
  }
);

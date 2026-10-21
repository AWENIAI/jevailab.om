import { m } from '@/locale/paraglide/messages';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { LoginForm } from '@/components/auth/login-form';
import { authClient } from '@/auth/client';
import { guestRouteMiddleware } from '@/middlewares/guest-middleware';
import { websiteConfig } from '@/config/website';
import { DEFAULT_LOGIN_REDIRECT, Routes } from '@/lib/routes';
import { getSafeInternalRedirect } from '@/lib/safe-redirect';

export const Route = createFileRoute('/auth/login')({
  beforeLoad: async ({ search }) => {
    if (!websiteConfig.auth?.enable) {
      throw redirect({ to: Routes.Root });
    }
    // Server middleware handles full-page navigation. This check covers
    // client-side navigation from pricing or a login modal.
    if (typeof window !== 'undefined') {
      const { data: session } = await authClient.getSession();
      if (session?.user) {
        throw redirect({
          href:
            getSafeInternalRedirect(search.callbackUrl) ??
            getSafeInternalRedirect(DEFAULT_LOGIN_REDIRECT) ??
            Routes.Root,
        });
      }
    }
  },
  validateSearch: (
    search: Record<string, unknown>
  ): { callbackUrl?: string; error?: string } => ({
    callbackUrl:
      typeof search.callbackUrl === 'string' ? search.callbackUrl : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: LoginPage,
  server: {
    // Server-side navigation: check session in server, 302 redirect
    middleware: [guestRouteMiddleware],
  },
  head: () => ({
    meta: [
      { title: m.auth_login_title() },
      { name: 'description', content: m.auth_login_description() },
    ],
  }),
});

function LoginPage() {
  const { callbackUrl } = Route.useSearch();

  return (
    <div className="flex flex-col gap-4">
      <LoginForm callbackUrl={callbackUrl} />
      <div className="text-balance text-center text-xs text-muted-foreground">
        {m.auth_common_by_clicking_continue()}
        <Link
          to={Routes.TermsOfService}
          className="underline underline-offset-4 hover:text-primary"
        >
          {m.auth_common_terms_of_service()}
        </Link>
        {m.auth_common_and()}
        <Link
          to={Routes.PrivacyPolicy}
          className="underline underline-offset-4 hover:text-primary"
        >
          {m.auth_common_privacy_policy()}
        </Link>
      </div>
    </div>
  );
}

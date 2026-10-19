import { adminClient, inferAdditionalFields } from 'better-auth/client/plugins';
import { apiKeyClient } from '@better-auth/api-key/client';
import { createAuthClient } from 'better-auth/react';
import { getBaseUrl } from '@/lib/urls';
import type { auth } from './auth';

/**
 * Browser requests must target the origin that rendered the app. Using the
 * canonical production URL here breaks local/preview auth with a CORS error
 * whenever VITE_BASE_URL points at the production site.
 *
 * Server-side consumers keep using the configured canonical URL because they
 * do not have a browser origin.
 */
function getAuthClientBaseUrl(): string {
  return typeof window === 'undefined' ? getBaseUrl() : window.location.origin;
}

/**
 * Better Auth Client Configuration
 * https://www.better-auth.com/docs/integrations/tanstack
 */
export const authClient = createAuthClient({
  baseURL: getAuthClientBaseUrl(),
  plugins: [
    // https://www.better-auth.com/docs/plugins/admin#add-the-client-plugin
    adminClient(),
    // https://www.better-auth.com/docs/plugins/api-key#add-the-client-plugin
    apiKeyClient(),
    // https://www.better-auth.com/docs/concepts/typescript#inferring-additional-fields-on-client
    inferAdditionalFields<typeof auth>(),
  ],
});

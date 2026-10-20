import { APIError } from 'better-auth/api';
import { logOperationalEvent } from '@/lib/observability';
import type { SendEmailResult, SendTemplateParams } from '@/mail/types';

const MAX_SEND_ATTEMPTS = 3;

type AuthEmailParams = SendTemplateParams & {
  template: 'verifyEmail' | 'forgotPassword';
};

/**
 * Better Auth can derive its origin from a local/preview request. Those links
 * are unusable from an inbox, so transactional links use the configured
 * public site origin instead.
 */
export function buildPublicAuthEmailUrl(
  url: string,
  publicBaseUrl: string
): string {
  const link = new URL(url);
  const base = new URL(publicBaseUrl);
  const isLoopback =
    link.hostname === 'localhost' ||
    link.hostname.endsWith('.localhost') ||
    link.hostname === '::1' ||
    link.hostname.startsWith('127.');
  if (isLoopback) {
    link.port = base.port;
    link.hostname = base.hostname;
    link.protocol = base.protocol;
  }
  return link.toString();
}

/** Try up to three times with the same link; never log recipients, links or provider errors. */
export async function sendAuthEmail(
  params: AuthEmailParams,
  send: (params: SendTemplateParams) => Promise<SendEmailResult>,
  publicBaseUrl = ''
): Promise<void> {
  const safeParams =
    publicBaseUrl && typeof params.context.url === 'string'
      ? {
          ...params,
          context: {
            ...params.context,
            url: buildPublicAuthEmailUrl(params.context.url, publicBaseUrl),
          },
        }
      : params;
  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    let success = false;
    try {
      success = (await send(safeParams)).success;
    } catch {
      // A sender may throw instead of returning a failure result.
    }
    if (success) {
      logOperationalEvent.info('auth.mail.accepted', {
        template: params.template,
        attempt,
      });
      return;
    }
    logOperationalEvent.warn('auth.mail.attempt_failed', {
      template: params.template,
      attempt,
    });
    if (attempt < MAX_SEND_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  logOperationalEvent.error('auth.mail.delivery_failed', {
    template: params.template,
    attempts: MAX_SEND_ATTEMPTS,
  });
  // Reset responses must not reveal whether an account exists, even if the
  // library changes its background error handling in a future release.
  if (params.template === 'verifyEmail') {
    throw new APIError('SERVICE_UNAVAILABLE', {
      code: 'AUTH_EMAIL_SEND_FAILED',
      message: 'Unable to send verification email. Please try again later.',
    });
  }
}

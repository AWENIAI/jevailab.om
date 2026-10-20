import { logOperationalEvent } from '@/lib/observability';
import { websiteConfig } from '@/config/website';
import { getTemplate } from '../render';
import type {
  MailProvider,
  SendEmailResult,
  SendRawEmailParams,
  SendTemplateParams,
} from '@/mail/types';

type EmailBinding = {
  send(message: {
    to: string | EmailAddress;
    from: string | EmailAddress;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ messageId: string }>;
};

type EmailAddress = {
  name: string;
  email: string;
};

/**
 * Parse the configured sender without passing a display-name string straight
 * to Cloudflare. The Workers API uses a structured `EmailAddress` for names.
 */
function parseSender(from: string): string | EmailAddress {
  const trimmed = from.trim();
  const match = /^(.*?)\s*<([^<>]+)>$/.exec(trimmed);
  if (!match) return trimmed;

  const name = match[1].trim();
  const email = match[2].trim();
  return name ? { name, email } : email;
}

/**
 * Cloudflare Email Service provider implementation.
 * Uses the native Worker send_email binding, so the Worker never stores an
 * account-scoped API token.
 * https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
 */
export class CloudflareProvider implements MailProvider {
  private from: string | EmailAddress;
  private email: EmailBinding;

  constructor(email: EmailBinding) {
    const from = websiteConfig.mail?.fromEmail;
    if (!from) throw new Error('mail.fromEmail is required.');
    this.from = parseSender(from);
    this.email = email;
  }

  getProviderName(): string {
    return 'cloudflare';
  }

  async sendTemplate(params: SendTemplateParams): Promise<SendEmailResult> {
    const { to, template, context } = params;
    try {
      const mailTemplate = await getTemplate({ template, context });
      return this.sendRawEmail({
        to,
        subject: mailTemplate.subject,
        html: mailTemplate.html,
        text: mailTemplate.text,
      });
    } catch (error) {
      logOperationalEvent.error('mail.template_failed');
      return { success: false, error };
    }
  }

  async sendRawEmail(params: SendRawEmailParams): Promise<SendEmailResult> {
    const { to, subject, html, text } = params;
    if (!this.from || !to || !subject || !html) {
      logOperationalEvent.warn('Missing required fields for email send');
      return { success: false, error: 'Missing required fields' };
    }
    try {
      const result = await this.email.send({
        to,
        from: this.from,
        subject,
        html,
        text,
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logOperationalEvent.error('mail.provider_failed');
      return { success: false, error };
    }
  }
}

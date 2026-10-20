import { getDb } from '@/db';
import { newsletterSubscriptions } from '@/db/app.schema';
import { logOperationalEvent } from '@/lib/observability';
import type {
  CheckSubscribeStatusParams,
  NewsletterProvider,
  SubscribeNewsletterParams,
  UnsubscribeNewsletterParams,
} from '@/newsletter/types';
import { eq } from 'drizzle-orm';

/**
 * Cloudflare-hosted newsletter provider backed by D1.
 *
 * D1 is the source of truth for consent. Unsubscribe updates the existing row
 * instead of deleting it so the application retains an auditable opt-out.
 */
export class CloudflareNewsletterProvider implements NewsletterProvider {
  getProviderName(): string {
    return 'cloudflare';
  }

  async subscribe({ email }: SubscribeNewsletterParams): Promise<boolean> {
    try {
      const now = new Date();
      await getDb()
        .insert(newsletterSubscriptions)
        .values({
          email: normalizeEmail(email),
          subscribed: true,
          subscribedAt: now,
          unsubscribedAt: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: newsletterSubscriptions.email,
          set: {
            subscribed: true,
            subscribedAt: now,
            unsubscribedAt: null,
            updatedAt: now,
          },
        });
      return true;
    } catch (error) {
      logOperationalEvent.error('Error subscribing newsletter', error);
      return false;
    }
  }

  async unsubscribe({ email }: UnsubscribeNewsletterParams): Promise<boolean> {
    try {
      const now = new Date();
      await getDb()
        .update(newsletterSubscriptions)
        .set({
          subscribed: false,
          unsubscribedAt: now,
          updatedAt: now,
        })
        .where(eq(newsletterSubscriptions.email, normalizeEmail(email)));

      // An address that never subscribed is already effectively unsubscribed.
      return true;
    } catch (error) {
      logOperationalEvent.error('Error unsubscribing newsletter', error);
      return false;
    }
  }

  async checkSubscribeStatus({
    email,
  }: CheckSubscribeStatusParams): Promise<boolean> {
    try {
      const [record] = await getDb()
        .select({ subscribed: newsletterSubscriptions.subscribed })
        .from(newsletterSubscriptions)
        .where(eq(newsletterSubscriptions.email, normalizeEmail(email)))
        .limit(1);
      return record?.subscribed ?? false;
    } catch (error) {
      logOperationalEvent.error('Error checking subscribe status', error);
      return false;
    }
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

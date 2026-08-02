import { createFileRoute } from '@tanstack/react-router';
import { and, desc, eq, inArray, like } from 'drizzle-orm';
import { getDb } from '@/db';
import { account, apikey, session, user } from '@/db/auth.schema';
import { payment, userFiles } from '@/db/app.schema';
import { PaymentTypes } from '@/payment/types';

const TEST_EMAIL_PATTERN = 'e2e-%@example.test';
const TEST_API_SECRET = 'mkfast-e2e-secret';

function assertE2EAccess(request: Request) {
  const requestSecret = request.headers.get('x-e2e-secret');
  const isLocalE2EMode =
    import.meta.env.DEV === true && import.meta.env.MODE === 'e2e';

  if (!isLocalE2EMode || requestSecret !== TEST_API_SECRET) {
    return Response.json({ error: 'Not Found' }, { status: 404 });
  }

  return null;
}

function isE2EEmail(email: string) {
  return email.startsWith('e2e-') && email.endsWith('@example.test');
}

export const Route = createFileRoute('/api/e2e/users')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const accessError = assertE2EAccess(request);
        if (accessError) return accessError;

        // Read-only lookup used by E2E specs to poll for webhook delivery.
        // Returns whether the user has at least one paid payment row.
        const url = new URL(request.url);
        const email = url.searchParams.get('email') ?? '';
        if (!isE2EEmail(email)) {
          return Response.json(
            { error: 'Invalid test email' },
            { status: 400 }
          );
        }
        const paidOnly = url.searchParams.get('paid') === 'true';

        const db = getDb();
        const [row] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, email))
          .limit(1);
        if (!row) return Response.json({ paymentCount: 0 });

        const filters = paidOnly
          ? and(eq(payment.userId, row.id), eq(payment.paid, true))
          : eq(payment.userId, row.id);
        const rows = await db
          .select({ id: payment.id })
          .from(payment)
          .where(filters);
        if (!paidOnly) {
          return Response.json({ paymentCount: rows.length });
        }
        // Expose the latest subscription row so specs can assert webhook
        // lifecycle state (activation + renewal updates) from the DB instead
        // of relying on rendered UI text alone.
        const [subscriptionRow] = await db
          .select({
            status: payment.status,
            interval: payment.interval,
            periodStart: payment.periodStart,
            periodEnd: payment.periodEnd,
            cancelAtPeriodEnd: payment.cancelAtPeriodEnd,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
          })
          .from(payment)
          .where(
            and(
              eq(payment.userId, row.id),
              eq(payment.paid, true),
              eq(payment.type, PaymentTypes.SUBSCRIPTION)
            )
          )
          .orderBy(desc(payment.createdAt))
          .limit(1);
        return Response.json({
          paymentCount: rows.length,
          subscription: subscriptionRow
            ? {
                ...subscriptionRow,
                cancelAtPeriodEnd: subscriptionRow.cancelAtPeriodEnd ?? false,
              }
            : null,
        });
      },
      PATCH: async ({ request }) => {
        const accessError = assertE2EAccess(request);
        if (accessError) return accessError;

        const body = (await request.json()) as {
          email?: unknown;
          emailVerified?: unknown;
          role?: unknown;
        };
        const email = typeof body.email === 'string' ? body.email : '';

        if (!isE2EEmail(email)) {
          return Response.json(
            { error: 'Invalid test email' },
            { status: 400 }
          );
        }

        const updates: {
          emailVerified?: boolean;
          role?: string | null;
          updatedAt: Date;
        } = { updatedAt: new Date() };

        if (typeof body.emailVerified === 'boolean') {
          updates.emailVerified = body.emailVerified;
        }
        if (
          body.role === null ||
          body.role === 'admin' ||
          body.role === 'user'
        ) {
          updates.role = body.role === 'user' ? null : body.role;
        }

        const [updatedUser] = await getDb()
          .update(user)
          .set(updates)
          .where(eq(user.email, email))
          .returning({
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            role: user.role,
          });

        if (!updatedUser) {
          return Response.json({ error: 'User not found' }, { status: 404 });
        }

        return Response.json({ user: updatedUser });
      },
      DELETE: async ({ request }) => {
        const accessError = assertE2EAccess(request);
        if (accessError) return accessError;

        const db = getDb();
        const rows = await db
          .select({ id: user.id })
          .from(user)
          .where(like(user.email, TEST_EMAIL_PATTERN));
        const userIds = rows.map((row) => row.id);

        if (userIds.length === 0) {
          return Response.json({ deleted: 0 });
        }

        await db.delete(session).where(inArray(session.userId, userIds));
        await db.delete(account).where(inArray(account.userId, userIds));
        await db.delete(apikey).where(inArray(apikey.referenceId, userIds));
        await db.delete(payment).where(inArray(payment.userId, userIds));
        await db.delete(userFiles).where(inArray(userFiles.userId, userIds));
        await db.delete(user).where(inArray(user.id, userIds));

        return Response.json({ deleted: userIds.length });
      },
    },
  },
});

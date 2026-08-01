import { m } from '@/locale/paraglide/messages';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PaymentCard } from '@/components/payment/payment-card';

export const Route = createFileRoute('/settings/payment')({
  validateSearch: (
    s
  ): {
    session_id?: string;
    callback?: string;
  } => ({
    session_id: typeof s?.session_id === 'string' ? s.session_id : undefined,
    callback: typeof s?.callback === 'string' ? s.callback : undefined,
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const search = useSearch({ from: '/settings/payment' });
  const breadcrumbs = [
    { label: m.common_settings(), isCurrentPage: false },
    { label: m.settings_billing_breadcrumb(), isCurrentPage: true },
  ];
  return (
    <DashboardLayout
      breadcrumbs={breadcrumbs}
      title={m.settings_billing_title()}
      description={m.settings_billing_description()}
    >
      <PaymentCard
        sessionId={search.session_id}
        callback={search.callback ?? '/settings/billing'}
      />
    </DashboardLayout>
  );
}

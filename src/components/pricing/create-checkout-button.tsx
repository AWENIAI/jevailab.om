import { m } from '@/locale/paraglide/messages';
import { createCheckoutSession } from '@/api/payment';
import { Button } from '@/components/ui/button';
import { useResolvedTheme } from '@/components/theme/theme-provider';
import { logOperationalEvent } from '@/lib/observability';
import { trackAnalyticsEvent } from '@/lib/analytics/events';
import { cn } from '@/lib/utils';
import { IconLoader2 } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'sonner';

export async function startCheckout({
  planId,
  priceId,
  metadata,
  theme,
}: {
  planId: string;
  priceId: string;
  metadata?: Record<string, string>;
  theme?: 'dark' | 'light';
}): Promise<string> {
  const result = await createCheckoutSession({
    data: {
      planId,
      priceId,
      theme,
      metadata,
    },
  });
  if (!result?.url) {
    throw new Error(m.pricing_checkout_failed());
  }
  return result.url;
}

interface CheckoutButtonProps {
  planId: string;
  priceId: string;
  'data-testid'?: string;
  metadata?: Record<string, string>;
  'aria-busy'?: boolean;
  variant?:
    | 'default'
    | 'outline'
    | 'destructive'
    | 'secondary'
    | 'ghost'
    | 'link'
    | null;
  size?: 'default' | 'sm' | 'lg' | 'icon' | null;
  className?: string;
  children?: React.ReactNode;
}
export function CheckoutButton({
  planId,
  priceId,
  'data-testid': dataTestId,
  metadata,
  variant = 'default',
  size = 'default',
  className,
  children,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const resolvedTheme = useResolvedTheme();
  const handleClick = async () => {
    try {
      setIsLoading(true);
      const mergedMetadata = metadata ? { ...metadata } : {};
      const url = await startCheckout({
        planId,
        priceId,
        theme: resolvedTheme,
        metadata:
          Object.keys(mergedMetadata).length > 0 ? mergedMetadata : undefined,
      });
      trackAnalyticsEvent('checkout_started', {
        plan_id: planId,
        billing_interval: planId === 'lifetime' ? 'one_time' : 'subscription',
      });
      window.location.href = url;
    } catch (err) {
      logOperationalEvent.error('Checkout error:', err);
      toast.error(m.pricing_checkout_failed());
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Button
      data-testid={dataTestId}
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <IconLoader2 className="mr-2 size-4 animate-spin" />
          {m.pricing_checkout_loading()}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

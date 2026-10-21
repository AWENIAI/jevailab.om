import { m } from '@/locale/paraglide/messages';
import { authClient } from '@/auth/client';
import { LoginDialog } from '@/components/auth/login-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { useResolvedTheme } from '@/components/theme/theme-provider';
import { logOperationalEvent } from '@/lib/observability';
import { cn } from '@/lib/utils';
import { IconLoader2 } from '@tabler/icons-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { startCheckout } from './create-checkout-button';

const CHECKOUT_INTENT_KEY = 'jevailab:checkout-intent';
const CHECKOUT_INTENT_MAX_AGE_MS = 15 * 60 * 1_000;
const CHECKOUT_INTENT_CHANGED_EVENT = 'jevailab:checkout-intent-changed';

type CheckoutIntent = {
  planId: string;
  priceId: string;
  createdAt: number;
};

function rememberCheckoutIntent(planId: string, priceId: string) {
  if (typeof window === 'undefined') return;

  const intent: CheckoutIntent = { planId, priceId, createdAt: Date.now() };
  window.sessionStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify(intent));
  window.dispatchEvent(new Event(CHECKOUT_INTENT_CHANGED_EVENT));
}

function clearCheckoutIntent() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
  window.dispatchEvent(new Event(CHECKOUT_INTENT_CHANGED_EVENT));
}

function consumeCheckoutIntent(planId: string, priceId: string) {
  if (typeof window === 'undefined') return false;

  const serialized = window.sessionStorage.getItem(CHECKOUT_INTENT_KEY);
  if (!serialized) return false;

  try {
    const intent = JSON.parse(serialized) as Partial<CheckoutIntent>;
    const isExpired =
      typeof intent.createdAt !== 'number' ||
      Date.now() - intent.createdAt >= CHECKOUT_INTENT_MAX_AGE_MS;
    if (isExpired) {
      window.sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
      return false;
    }

    // Every plan CTA on the page observes the same stored intent. Only the
    // matching CTA may consume it, otherwise the first card can clear the
    // intent before the selected plan resumes checkout after sign-in.
    if (intent.planId !== planId || intent.priceId !== priceId) {
      return false;
    }

    window.sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
    return true;
  } catch {
    window.sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
    return false;
  }
}

type CheckoutVariant =
  | 'default'
  | 'outline'
  | 'destructive'
  | 'secondary'
  | 'ghost'
  | 'link'
  | null;

type CheckoutSize =
  | 'default'
  | 'sm'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg'
  | null;

type CheckoutAuthButtonProps = {
  planId: string | null;
  priceId: string | null;
  children: ReactNode;
  callbackUrl: string;
  className?: string;
  dataTestId?: string;
  metadata?: Record<string, string>;
  size?: CheckoutSize;
  variant?: CheckoutVariant;
};

/**
 * Shared purchase entry point.
 *
 * Guests see the login/register dialog. Authenticated users go straight to
 * checkout, and a successful in-dialog login continues into checkout without
 * making the user press the CTA a second time.
 */
export function CheckoutAuthButton({
  planId,
  priceId,
  children,
  callbackUrl,
  className,
  dataTestId,
  metadata,
  size = 'default',
  variant = 'default',
}: CheckoutAuthButtonProps) {
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutIntentVersion, setCheckoutIntentVersion] = useState(0);
  const checkoutLockRef = useRef(false);
  const autoCheckoutStartedRef = useRef(false);
  const theme = useResolvedTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleIntentChanged = () => {
      setCheckoutIntentVersion((version) => version + 1);
    };

    window.addEventListener(CHECKOUT_INTENT_CHANGED_EVENT, handleIntentChanged);
    return () => {
      window.removeEventListener(
        CHECKOUT_INTENT_CHANGED_EVENT,
        handleIntentChanged
      );
    };
  }, []);

  const isAuthenticated = mounted && !!session?.user;
  const isCheckingSession = !mounted || isPending;
  const buttonClassName = cn(buttonVariants({ variant, size }), className);

  const startPayment = async () => {
    if (!planId || !priceId || checkoutLockRef.current) return;

    try {
      checkoutLockRef.current = true;
      setIsCheckingOut(true);
      const url = await startCheckout({
        planId,
        priceId,
        metadata,
        theme,
      });
      window.location.href = url;
    } catch (error) {
      logOperationalEvent.error('Checkout error:', error);
      toast.error(m.pricing_checkout_failed());
    } finally {
      checkoutLockRef.current = false;
      setIsCheckingOut(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (open && planId && priceId) {
      rememberCheckoutIntent(planId, priceId);
    } else if (!open) {
      clearCheckoutIntent();
    }
  };

  const handleLoginSuccess = () => {
    clearCheckoutIntent();
    setDialogOpen(false);
    void startPayment();
  };

  useEffect(() => {
    if (
      !isAuthenticated ||
      isCheckingSession ||
      autoCheckoutStartedRef.current ||
      !planId ||
      !priceId ||
      !consumeCheckoutIntent(planId, priceId)
    ) {
      return;
    }

    autoCheckoutStartedRef.current = true;
    void startPayment();
  }, [
    checkoutIntentVersion,
    isAuthenticated,
    isCheckingSession,
    planId,
    priceId,
  ]);

  if (isCheckingSession) {
    return (
      <button
        type="button"
        disabled
        className={buttonClassName}
        data-testid={dataTestId}
        aria-busy={isCheckingSession || undefined}
      >
        {children}
      </button>
    );
  }

  if (isCheckingOut) {
    return (
      <button
        type="button"
        disabled
        className={buttonClassName}
        data-testid={dataTestId}
        aria-busy="true"
      >
        <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
        {m.pricing_checkout_loading()}
      </button>
    );
  }

  if (!planId || !priceId) {
    return (
      <button
        type="button"
        disabled
        className={buttonClassName}
        data-testid={dataTestId}
      >
        {children}
      </button>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginDialog
        callbackUrl={callbackUrl}
        data-testid={dataTestId}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onLoginSuccess={handleLoginSuccess}
        triggerClassName={buttonClassName}
      >
        {children}
      </LoginDialog>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      data-testid={dataTestId}
      onClick={() => void startPayment()}
    >
      {children}
    </Button>
  );
}

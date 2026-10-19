import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomLinkProps {
  href: string;
  label: string;
  callbackUrl?: string;
}

export function BottomLink({ href, label, callbackUrl }: BottomLinkProps) {
  return (
    <a
      data-testid="auth-switch-link"
      href={
        callbackUrl
          ? `${href}?callbackUrl=${encodeURIComponent(callbackUrl)}`
          : href
      }
      className={cn(
        buttonVariants({ variant: 'link', size: 'sm' }),
        'font-normal w-full text-muted-foreground hover:underline underline-offset-4 hover:text-primary'
      )}
    >
      {label}
    </a>
  );
}

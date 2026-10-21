import { BottomLink } from '@/components/auth/bottom-link';
import { Logo } from '@/components/shared/logo';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  children: React.ReactNode;
  headerLabel: string;
  bottomButtonLabel: string;
  bottomButtonHref: string;
  callbackUrl?: string;
  className?: string;
  hideFooter?: boolean;
  hideHeader?: boolean;
}

export function AuthCard({
  children,
  headerLabel,
  bottomButtonLabel,
  bottomButtonHref,
  callbackUrl,
  className,
  hideFooter = false,
  hideHeader = false,
}: AuthCardProps) {
  return (
    <Card
      className={cn('shadow-xs border border-border pt-6', className)}
      size="default"
    >
      {hideHeader ? null : (
        <CardHeader className="flex flex-col items-center">
          <Link to="/">
            <Logo className="mb-2" />
          </Link>
          <CardDescription>{headerLabel}</CardDescription>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {hideFooter ? null : (
        <CardFooter data-testid="auth-card-footer">
          <BottomLink
            label={bottomButtonLabel}
            href={bottomButtonHref}
            callbackUrl={callbackUrl}
          />
        </CardFooter>
      )}
    </Card>
  );
}

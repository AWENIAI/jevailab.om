import { m } from '@/locale/paraglide/messages';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

interface LoginDialogProps {
  callbackUrl?: string;
  children: React.ReactNode;
  'data-testid'?: string;
  initialMode?: 'login' | 'register';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onLoginSuccess?: () => void;
  triggerClassName?: string;
}

/**
 * Auth dialog with login/register tabs. Guests switch between the two modes
 * without leaving the page, so CTAs can keep their context.
 */
export function LoginDialog({
  callbackUrl,
  children,
  'data-testid': dataTestId,
  initialMode = 'login',
  open,
  onOpenChange,
  onLoginSuccess,
  triggerClassName,
}: LoginDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <button
        type="button"
        data-testid={dataTestId}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <DialogContent
        data-testid="auth-login-dialog"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-[26rem]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {mode === 'login'
              ? m.auth_login_welcome_back()
              : m.auth_register_create_account()}
          </DialogTitle>
        </DialogHeader>
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as 'login' | 'register')}
          className="gap-0"
        >
          <TabsList className="w-full rounded-none">
            <TabsTrigger value="login" className="flex-1">
              {m.auth_common_login()}
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1">
              {m.auth_common_signup()}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="p-1">
            <LoginForm
              callbackUrl={callbackUrl}
              onSuccess={() => {
                setOpen(false);
                onLoginSuccess?.();
              }}
              className="border-0 shadow-none"
              hideCardFooter
              hideCardHeader
            />
          </TabsContent>
          <TabsContent value="register" className="p-1">
            <RegisterForm
              callbackUrl={callbackUrl}
              className="border-0 shadow-none"
              hideCardFooter
              hideCardHeader
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

import { websiteConfig } from '@/config/website';
import { cn } from '@/lib/utils';
import { m } from '@/locale/paraglide/messages';

export function Logo({ className }: { className?: string }) {
  const name = websiteConfig.metadata?.name ?? 'App';
  const logoLight = websiteConfig.metadata?.images?.logoLight ?? '/logo.png';
  const logoDark = websiteConfig.metadata?.images?.logoDark ?? logoLight;

  return (
    <>
      <img
        src={logoLight}
        alt={`${name} ${m.common_logo()}`}
        className={cn('size-8 rounded-md dark:hidden', className)}
        width={32}
        height={32}
        decoding="async"
      />
      <img
        src={logoDark}
        alt={`${name} ${m.common_logo()}`}
        className={cn('size-8 rounded-md hidden dark:block', className)}
        width={32}
        height={32}
        decoding="async"
      />
    </>
  );
}

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { m } from '@/locale/paraglide/messages';

export default function BuiltWithButton() {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href="https://jevailab.com"
      className={cn(
        buttonVariants({ variant: 'outline', size: 'sm' }),
        'border border-border px-4 py-4 rounded-md gap-2'
      )}
    >
      <span>{m.common_built_with()}</span>
      <img src="/jevailab-icon.png" alt="jevailab" className="size-5" />
      <span className="font-semibold">jevailab</span>
    </a>
  );
}

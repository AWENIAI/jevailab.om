import { IconUser } from '@tabler/icons-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { m } from '@/locale/paraglide/messages';
import { cn } from '@/lib/utils';

/**
 * User avatar
 */
export function UserAvatar({
  name,
  image,
  className,
}: {
  name: string | null;
  image: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn('size-8 border', className)}>
      <AvatarImage
        alt={name ?? ''}
        src={image ?? undefined}
        referrerPolicy="no-referrer"
      />
      <AvatarFallback className="absolute inset-0">
        <span className="sr-only">{name ?? m.common_user()}</span>
        <IconUser className="size-4" />
      </AvatarFallback>
    </Avatar>
  );
}

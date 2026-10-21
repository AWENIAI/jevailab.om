import { m } from '@/locale/paraglide/messages';
import { IconPhoto } from '@tabler/icons-react';
import type { MenuItemConfig } from '../types';

export function getNavbarLinks(): MenuItemConfig[] {
  const links = [
    {
      key: 'image',
      title: m.jevailab_nav_image_title(),
      href: '/#image',
      external: false,
    },
    {
      key: 'pricing',
      title: m.nav_pricing(),
      href: '/launch-pricing',
      external: false,
    },
    {
      key: 'ai',
      title: m.nav_ai_title(),
      items: [
        {
          title: m.jevailab_nav_image_title(),
          description: m.jevailab_nav_image_description(),
          href: '/#image',
          icon: IconPhoto,
          external: false,
        },
      ],
    },
  ] satisfies Array<MenuItemConfig & { key: string }>;

  return links.map(({ key: _key, ...item }) => item);
}

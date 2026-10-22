import { m } from '@/locale/paraglide/messages';
import type { MenuItemConfig } from '../types';

export function getNavbarLinks(): MenuItemConfig[] {
  const links = [
    {
      key: 'image',
      title: m.jevailab_nav_image_title(),
      href: '/create',
      external: false,
    },
    {
      key: 'pricing',
      title: m.nav_pricing(),
      href: '/launch-pricing',
      external: false,
    },
  ] satisfies Array<MenuItemConfig & { key: string }>;

  return links.map(({ key: _key, ...item }) => item);
}

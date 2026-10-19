import { m } from '@/locale/paraglide/messages';
import { IconPhoto, IconVideo } from '@tabler/icons-react';
import type { MenuItemConfig } from '../types';

/**
 * Homepage-first navigation. Video and the AI menu stay implemented, but are
 * temporarily hidden from the public navigation while image creation is the
 * homepage focus.
 */
export function getNavbarLinks(): MenuItemConfig[] {
  const hiddenKeys = new Set(['video', 'ai']);
  const links = [
    {
      key: 'video',
      title: m.jevailab_nav_video_title(),
      href: '/#video',
      external: false,
    },
    {
      key: 'image',
      title: m.jevailab_nav_image_title(),
      href: '/#image',
      external: false,
    },
    {
      key: 'pricing',
      title: m.nav_pricing(),
      href: '/#pricing',
      external: false,
    },
    {
      key: 'ai',
      title: m.nav_ai_title(),
      items: [
        {
          title: m.jevailab_nav_video_title(),
          description: m.jevailab_nav_video_description(),
          href: '/#video',
          icon: IconVideo,
          external: false,
        },
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

  return links
    .filter((item) => !hiddenKeys.has(item.key))
    .map(({ key: _key, ...item }) => item);
}

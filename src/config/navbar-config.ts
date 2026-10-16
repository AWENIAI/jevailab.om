import { m } from '@/locale/paraglide/messages';
import { IconPhoto, IconVideo } from '@tabler/icons-react';
import type { MenuItemConfig } from '../types';

/**
 * Homepage-first navigation. Every active destination is a visible section on
 * the root route, with video as the default creative workspace.
 */
export function getNavbarLinks(): MenuItemConfig[] {
  return [
    {
      title: m.picvilo_nav_gallery(),
      href: '/#gallery',
      external: false,
    },
    {
      title: m.picvilo_nav_how_it_works(),
      href: '/#how-it-works',
      external: false,
    },
    {
      title: m.nav_pricing(),
      href: '/#pricing',
      external: false,
    },
    {
      title: m.nav_ai_title(),
      items: [
        {
          title: m.picvilo_nav_video_title(),
          description: m.picvilo_nav_video_description(),
          href: '/#video',
          icon: IconVideo,
          external: false,
        },
        {
          title: m.picvilo_nav_image_title(),
          description: m.picvilo_nav_image_description(),
          href: '/#image',
          icon: IconPhoto,
          external: false,
        },
      ],
    },
  ];
}

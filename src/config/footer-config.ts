import { m } from '@/locale/paraglide/messages';
import { Routes } from '@/lib/routes';
import type { MenuItemConfig } from '../types';
import { websiteConfig } from './website';

/** Homepage-first footer; legal routes remain available as real pages. */
export function getFooterLinks(): MenuItemConfig[] {
  const resources: MenuItemConfig[] = [
    {
      title: m.nav_contact_title(),
      href: Routes.Contact,
      external: false,
    },
  ];
  if (websiteConfig.blog?.enable) {
    resources.unshift({
      title: m.nav_blog(),
      href: Routes.Blog,
      external: false,
    });
  }

  return [
    {
      title: m.nav_product(),
      items: [
        { title: m.home_hero_primary(), href: '/create', external: false },
        { title: m.jevailab_nav_gallery(), href: '/#gallery', external: false },
        {
          title: m.jevailab_nav_how_it_works(),
          href: '/#how-it-works',
          external: false,
        },
        {
          title: m.nav_pricing(),
          href: Routes.LaunchPricing,
          external: false,
        },
        { title: m.nav_faq(), href: '/#faq', external: false },
      ],
    },
    { title: m.nav_resources(), items: resources },
    {
      title: m.nav_company(),
      items: [
        { title: m.nav_about_title(), href: '/#about', external: false },
        { title: m.nav_contact_title(), href: Routes.Contact, external: false },
      ],
    },
    {
      title: m.nav_legal(),
      items: [
        {
          title: m.nav_cookie_policy_title(),
          href: Routes.CookiePolicy,
          external: false,
        },
        {
          title: m.nav_privacy_policy_title(),
          href: Routes.PrivacyPolicy,
          external: false,
        },
        {
          title: m.nav_terms_of_service_title(),
          href: Routes.TermsOfService,
          external: false,
        },
      ],
    },
  ];
}

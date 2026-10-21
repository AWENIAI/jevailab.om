import { describe, expect, it } from 'vitest';
import { getAvatarLinks } from '@/config/avatar-config';
import { getSidebarLinks } from '@/config/sidebar-config';
import { DEFAULT_LOGIN_REDIRECT, Routes } from '@/lib/routes';

function flattenLinks(
  items: ReturnType<typeof getSidebarLinks>
): ReturnType<typeof getSidebarLinks> {
  return items.flatMap((item) => [
    item,
    ...(item.items ? flattenLinks(item.items) : []),
  ]);
}

describe('account navigation', () => {
  it('sends users to billing after login', () => {
    expect(DEFAULT_LOGIN_REDIRECT).toBe(Routes.SettingsBilling);
  });

  it.each([
    Routes.Dashboard,
    Routes.SettingsFiles,
    Routes.SettingsApiKeys,
    Routes.SettingsNotifications,
  ])('hides %s from the account sidebar', (href) => {
    const link = flattenLinks(getSidebarLinks()).find(
      (item) => item.href === href
    );

    expect(link?.hidden).toBe(true);
  });

  it('keeps profile, billing, and security visible in the account sidebar', () => {
    const visibleHrefs = flattenLinks(getSidebarLinks())
      .filter((item) => !item.hidden)
      .map((item) => item.href);

    expect(visibleHrefs).toEqual(
      expect.arrayContaining([
        Routes.SettingsProfile,
        Routes.SettingsBilling,
        Routes.SettingsSecurity,
      ])
    );
  });

  it('does not expose the dashboard in the avatar menu', () => {
    expect(getAvatarLinks().map((item) => item.href)).not.toContain(
      Routes.Dashboard
    );
  });
});

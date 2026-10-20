import { describe, expect, it } from 'vitest';
import { websiteConfig } from '@/config/website';

describe('transactional mail configuration', () => {
  it('uses the provider whose credentials are configured for production', () => {
    expect(websiteConfig.mail).toMatchObject({
      enable: true,
      provider: 'cloudflare',
      fromEmail: 'jevailab <support@jevailab.com>',
      supportEmail: 'support@jevailab.com',
    });
  });
});

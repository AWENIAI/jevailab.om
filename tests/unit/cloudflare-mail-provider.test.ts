import { describe, expect, it, vi } from 'vitest';
import { CloudflareProvider } from '@/mail/provider/cloudflare';

vi.mock('@/config/website', () => ({
  websiteConfig: {
    mail: {
      fromEmail: 'jevailab <support@jevailab.com>',
    },
  },
}));
vi.mock('../render', () => ({
  getTemplate: vi.fn(),
}));
vi.mock('@/lib/observability', () => ({
  logOperationalEvent: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Cloudflare mail provider', () => {
  it('sends through the native Worker email binding', async () => {
    const send = vi.fn().mockResolvedValue({ messageId: 'email-message-id' });
    const provider = new CloudflareProvider({ send });

    await expect(
      provider.sendRawEmail({
        to: 'recipient@example.com',
        subject: 'Verify your email',
        html: '<p>Verify</p>',
        text: 'Verify',
      })
    ).resolves.toEqual({
      success: true,
      messageId: 'email-message-id',
    });
    expect(send).toHaveBeenCalledExactlyOnceWith({
      to: 'recipient@example.com',
      from: {
        name: 'jevailab',
        email: 'support@jevailab.com',
      },
      subject: 'Verify your email',
      html: '<p>Verify</p>',
      text: 'Verify',
    });
  });

  it('passes a bare sender address through unchanged', async () => {
    vi.resetModules();
    vi.doMock('@/config/website', () => ({
      websiteConfig: {
        mail: {
          fromEmail: 'support@jevailab.com',
        },
      },
    }));
    const { CloudflareProvider: BareSenderProvider } = await import(
      '@/mail/provider/cloudflare'
    );
    const send = vi.fn().mockResolvedValue({ messageId: 'email-message-id' });
    const provider = new BareSenderProvider({ send });

    await provider.sendRawEmail({
      to: 'recipient@example.com',
      subject: 'Verify your email',
      html: '<p>Verify</p>',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'support@jevailab.com',
      })
    );
  });
});

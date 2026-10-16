import { describe, expect, it } from 'vitest';
import { resolveModerationProvider } from '@/lib/image-creator/moderation.server';

describe('image creator moderation boundary', () => {
  it('fails closed in production when no moderation provider is configured', async () => {
    const provider = resolveModerationProvider({
      environment: 'production',
      allowDevelopmentMock: false,
    });

    await expect(
      provider.review({ kind: 'prompt', text: 'An editorial portrait.' })
    ).resolves.toMatchObject({ decision: 'unavailable' });
  });

  it('allows the explicit local-only mock in development', async () => {
    const provider = resolveModerationProvider({
      environment: 'development',
      allowDevelopmentMock: true,
    });

    await expect(
      provider.review({ kind: 'prompt', text: 'A safe landscape.' })
    ).resolves.toMatchObject({
      decision: 'approved',
      policyVersion: 'local-mock',
    });
  });
});

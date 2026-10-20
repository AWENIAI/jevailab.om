import { describe, expect, it, vi } from 'vitest';
import {
  resolveModerationProvider,
  WaffoPromptModerationProvider,
} from '@/lib/image-creator/moderation.server';

function scanResult(
  action: 'allow' | 'review' | 'block',
  reasonCode:
    | 'allowed'
    | 'review_required'
    | 'restricted_content'
    | 'service_degraded' = action === 'allow'
    ? 'allowed'
    : action === 'block'
      ? 'restricted_content'
      : 'review_required'
) {
  return {
    action,
    reasonCode,
    matchedCategories: [],
    requestId: 'req_test',
    semanticStatus: 'scored',
  } as const;
}

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

  it('routes prompts through Waffo and images through SeeAPI', async () => {
    const scanPrompt = vi.fn().mockResolvedValue(scanResult('allow'));
    const provider = resolveModerationProvider({
      environment: 'production',
      allowDevelopmentMock: false,
      waffo: { scanPrompt },
    });

    await expect(
      provider.review({ kind: 'prompt', text: 'A safe landscape.' })
    ).resolves.toMatchObject({
      decision: 'approved',
      policyVersion: 'waffo-scan-prompt-v1',
    });
    await expect(
      provider.review({
        kind: 'generated_image',
        jobId: 'job_1',
        outputId: 'out_1',
        sourceUrl: 'https://example.com/image.png',
      })
    ).resolves.toMatchObject({
      decision: 'unavailable',
      reasonCode: 'MODERATION_NOT_CONFIGURED',
    });
    expect(scanPrompt).toHaveBeenCalledOnce();
  });
});

describe('Waffo prompt moderation provider', () => {
  it.each([
    ['allow', 'approved'],
    ['block', 'rejected'],
    ['review', 'manual_review'],
  ] as const)('maps %s to %s', async (action, decision) => {
    const provider = new WaffoPromptModerationProvider({
      scanPrompt: vi.fn().mockResolvedValue(scanResult(action)),
    });

    await expect(
      provider.review({ kind: 'prompt', text: 'A cinematic landscape.' })
    ).resolves.toMatchObject({
      decision,
      policyVersion: 'waffo-scan-prompt-v1',
    });
  });

  it('fails closed when Waffo reports service degradation', async () => {
    const provider = new WaffoPromptModerationProvider({
      scanPrompt: vi
        .fn()
        .mockResolvedValue(scanResult('review', 'service_degraded')),
    });

    await expect(
      provider.review({ kind: 'prompt', text: 'A cinematic landscape.' })
    ).resolves.toMatchObject({
      decision: 'unavailable',
      reasonCode: 'WAFFO_SERVICE_DEGRADED',
    });
  });

  it('fails closed when the Waffo SDK throws', async () => {
    const provider = new WaffoPromptModerationProvider({
      scanPrompt: vi.fn().mockRejectedValue(new Error('network down')),
    });

    await expect(
      provider.review({ kind: 'prompt', text: 'A cinematic landscape.' })
    ).resolves.toMatchObject({
      decision: 'unavailable',
      reasonCode: 'WAFFO_REQUEST_FAILED',
    });
  });

  it('sends the detected locale and enforce mode', async () => {
    const scanPrompt = vi.fn().mockResolvedValue(scanResult('allow'));
    const provider = new WaffoPromptModerationProvider({ scanPrompt });

    await provider.review({ kind: 'prompt', text: '一张电影感海报' });

    expect(scanPrompt).toHaveBeenCalledWith({
      prompt: '一张电影感海报',
      locale: 'zh',
      semantic: 'enforce',
    });
  });

  it('does not treat an over-limit prompt as approved', async () => {
    const scanPrompt = vi.fn();
    const provider = new WaffoPromptModerationProvider({ scanPrompt });

    await expect(
      provider.review({ kind: 'prompt', text: 'a'.repeat(10_001) })
    ).resolves.toMatchObject({
      decision: 'unavailable',
      reasonCode: 'WAFFO_PROMPT_LENGTH_INVALID',
    });
    expect(scanPrompt).not.toHaveBeenCalled();
  });
});

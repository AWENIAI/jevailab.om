export type ModerationSubject =
  | { kind: 'prompt'; text: string }
  | { kind: 'reference_image'; assetId: string; storageKey: string }
  | {
      kind: 'generated_image';
      jobId: string;
      outputId: string;
      storageKey: string;
    };

export type ModerationResult = {
  decision: 'approved' | 'rejected' | 'manual_review' | 'unavailable';
  policyVersion: string;
  reasonCode?: string;
};

export interface ModerationProvider {
  review(subject: ModerationSubject): Promise<ModerationResult>;
}

class UnavailableModerationProvider implements ModerationProvider {
  async review(): Promise<ModerationResult> {
    return {
      decision: 'unavailable',
      policyVersion: 'unconfigured',
      reasonCode: 'MODERATION_NOT_CONFIGURED',
    };
  }
}

class LocalMockModerationProvider implements ModerationProvider {
  async review(): Promise<ModerationResult> {
    return { decision: 'approved', policyVersion: 'local-mock' };
  }
}

export function resolveModerationProvider({
  environment,
  allowDevelopmentMock,
}: {
  environment: string | undefined;
  allowDevelopmentMock: boolean;
}): ModerationProvider {
  if (environment !== 'production' && allowDevelopmentMock) {
    return new LocalMockModerationProvider();
  }
  return new UnavailableModerationProvider();
}

export function getRuntimeModerationProvider(): ModerationProvider {
  return resolveModerationProvider({
    environment: process.env.NODE_ENV,
    allowDevelopmentMock:
      process.env.IMAGE_CREATOR_DEV_MODERATION_MOCK === 'true',
  });
}

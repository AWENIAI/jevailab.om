export type ModerationSubject =
  | { kind: 'prompt'; text: string }
  | { kind: 'reference_image'; assetId: string; storageKey: string }
  | {
      kind: 'generated_image';
      jobId: string;
      outputId: string;
      storageKey?: string;
      /** A provider-hosted output URL that SeeAPI can download directly. */
      sourceUrl?: string;
    };

export type ModerationResult = {
  decision: 'approved' | 'rejected' | 'manual_review' | 'unavailable';
  policyVersion: string;
  reasonCode?: string;
};

export interface ModerationProvider {
  review(subject: ModerationSubject): Promise<ModerationResult>;
}

type FetchLike = typeof fetch;

type SeeApiTask = {
  id?: string;
  status?: string;
  result?: {
    data?: {
      flagged?: boolean;
      categories?: { nsfw?: unknown; special_care?: unknown };
    };
  };
};

type SeeApiImageModerationOptions = {
  apiKey: string;
  getReviewUrl: (storageKey: string) => string | Promise<string>;
  fetchFn?: FetchLike;
  pollDelayMs?: number;
  maxPollAttempts?: number;
  thresholdOffset?: number;
  strictSpecialCare?: boolean;
};

const SEEAPI_BASE_URL = 'https://api.seeapi.com/v1/inferences';
const SEEAPI_POLICY_VERSION = 'seeapi-nsfw-filter-v1';

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function wait(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * SeeAPI's documented nsfw-filter endpoint only accepts downloadable images.
 * The provider deliberately reports prompts as unsupported instead of treating
 * them as approved, so a future text-moderation provider can be added safely.
 */
export class SeeApiImageModerationProvider implements ModerationProvider {
  private readonly fetchFn: FetchLike;
  private readonly pollDelayMs: number;
  private readonly maxPollAttempts: number;
  private readonly thresholdOffset: number;
  private readonly strictSpecialCare: boolean;

  constructor(private readonly options: SeeApiImageModerationOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.pollDelayMs = options.pollDelayMs ?? 750;
    this.maxPollAttempts = options.maxPollAttempts ?? 8;
    this.thresholdOffset = options.thresholdOffset ?? 0.02;
    this.strictSpecialCare = options.strictSpecialCare ?? true;
  }

  async review(subject: ModerationSubject): Promise<ModerationResult> {
    if (subject.kind === 'prompt') {
      return {
        decision: 'unavailable',
        policyVersion: SEEAPI_POLICY_VERSION,
        reasonCode: 'SEEAPI_IMAGE_ONLY',
      };
    }

    const sourceUrl =
      subject.kind === 'generated_image' ? subject.sourceUrl : undefined;
    const imageUrl = sourceUrl
      ? sourceUrl
      : subject.storageKey
        ? await this.options.getReviewUrl(subject.storageKey)
        : undefined;
    if (!imageUrl) {
      return {
        decision: 'unavailable',
        policyVersion: SEEAPI_POLICY_VERSION,
        reasonCode: 'SEEAPI_IMAGE_URL_UNAVAILABLE',
      };
    }

    try {
      const createResponse = await this.fetchFn(SEEAPI_BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `nsfw-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          model: 'nsfw-filter',
          endpoint: 'image-moderation',
          provider: 'seeapi',
          input: {
            image_url: imageUrl,
            threshold_offset: this.thresholdOffset,
            strict_special_care: this.strictSpecialCare,
          },
        }),
      });
      if (createResponse.status !== 202) {
        return this.unavailable('SEEAPI_CREATE_FAILED');
      }
      const created = (await createResponse.json()) as SeeApiTask;
      if (!created.id) return this.unavailable('SEEAPI_TASK_ID_MISSING');

      for (let attempt = 0; attempt < this.maxPollAttempts; attempt += 1) {
        await wait(attempt === 0 ? 0 : this.pollDelayMs);
        const taskResponse = await this.fetchFn(
          `${SEEAPI_BASE_URL}/${encodeURIComponent(created.id)}`,
          { headers: { Authorization: `Bearer ${this.options.apiKey}` } }
        );
        if (!taskResponse.ok) return this.unavailable('SEEAPI_STATUS_FAILED');
        const task = (await taskResponse.json()) as SeeApiTask;
        if (task.status === 'succeeded') return this.toDecision(task);
        if (task.status === 'failed' || task.status === 'error') {
          return this.unavailable('SEEAPI_TASK_FAILED');
        }
      }
      return this.unavailable('SEEAPI_TIMEOUT');
    } catch {
      return this.unavailable('SEEAPI_REQUEST_FAILED');
    }
  }

  private toDecision(task: SeeApiTask): ModerationResult {
    const data = task.result?.data;
    if (!data) return this.unavailable('SEEAPI_RESULT_MISSING');
    const specialCare = asStringList(data.categories?.special_care);
    if (specialCare.length > 0) {
      return {
        decision: 'manual_review',
        policyVersion: SEEAPI_POLICY_VERSION,
        reasonCode: 'SEEAPI_SPECIAL_CARE',
      };
    }
    if (data.flagged || asStringList(data.categories?.nsfw).length > 0) {
      return {
        decision: 'rejected',
        policyVersion: SEEAPI_POLICY_VERSION,
        reasonCode: 'SEEAPI_NSFW_DETECTED',
      };
    }
    return { decision: 'approved', policyVersion: SEEAPI_POLICY_VERSION };
  }

  private unavailable(reasonCode: string): ModerationResult {
    return {
      decision: 'unavailable',
      policyVersion: SEEAPI_POLICY_VERSION,
      reasonCode,
    };
  }
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
  seeApi,
}: {
  environment: string | undefined;
  allowDevelopmentMock: boolean;
  seeApi?: {
    apiKey: string;
    getReviewUrl: (storageKey: string) => string | Promise<string>;
    thresholdOffset?: number;
    strictSpecialCare?: boolean;
  };
}): ModerationProvider {
  if (seeApi?.apiKey) {
    return new SeeApiImageModerationProvider(seeApi);
  }
  if (environment !== 'production' && allowDevelopmentMock) {
    return new LocalMockModerationProvider();
  }
  return new UnavailableModerationProvider();
}

export function getRuntimeModerationProvider(): ModerationProvider {
  const apiKey = process.env.SEEAPI_API_KEY;
  return resolveModerationProvider({
    environment: process.env.NODE_ENV,
    allowDevelopmentMock:
      process.env.IMAGE_CREATOR_DEV_MODERATION_MOCK === 'true',
    seeApi: apiKey
      ? {
          apiKey,
          getReviewUrl: async (storageKey) => {
            const { createSeeApiReviewUrl } = await import(
              './seeapi-review-url.server'
            );
            return createSeeApiReviewUrl(storageKey);
          },
          thresholdOffset:
            Number(process.env.SEEAPI_NSFW_THRESHOLD_OFFSET) || 0.02,
          strictSpecialCare:
            process.env.SEEAPI_NSFW_STRICT_SPECIAL_CARE !== 'false',
        }
      : undefined,
  });
}

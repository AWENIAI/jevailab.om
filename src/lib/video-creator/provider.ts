import type { VideoModel, VideoResolution } from './contracts';

export type KieCreateTaskInput = {
  callbackUrl: string;
  model: VideoModel;
  resolution: VideoResolution;
  templateUrl: string;
  imageUrl: string;
  aspectRatio: string;
  durationSeconds: number;
  seedancePrompt: string;
};

export type KieTaskRecord = {
  state: 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REVIEW_REQUIRED';
  providerState: string | null;
  resultUrls: string[];
  creditsConsumed: number | null;
  failureCode: string | null;
  failureMessage: string | null;
};

export type KieCallbackHint = {
  taskId: string;
  providerCode: number | null;
  providerState: 'success' | 'fail';
  failureCode: string | null;
  failureMessage: string | null;
};

export function buildKieCreateTaskPayload(input: KieCreateTaskInput) {
  if (input.model === 'wan/2-2-animate-replace') {
    return {
      model: input.model,
      callBackUrl: input.callbackUrl,
      input: {
        video_url: input.templateUrl,
        image_url: input.imageUrl,
        resolution: input.resolution,
        nsfw_checker: true,
      },
    };
  }
  return {
    model: input.model,
    callBackUrl: input.callbackUrl,
    input: {
      reference_image_urls: [input.imageUrl],
      reference_video_urls: [input.templateUrl],
      prompt: input.seedancePrompt,
      resolution: input.resolution,
      aspect_ratio: input.aspectRatio,
      duration: input.durationSeconds,
      generate_audio: false,
      web_search: false,
      nsfw_checker: true,
    },
  };
}

function parseResultUrls(resultJson: unknown) {
  if (typeof resultJson !== 'string') return [];
  try {
    const parsed = JSON.parse(resultJson) as { resultUrls?: unknown };
    if (!Array.isArray(parsed.resultUrls)) return [];
    return parsed.resultUrls.filter(
      (value): value is string =>
        typeof value === 'string' && value.startsWith('https://')
    );
  } catch {
    return [];
  }
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readProviderData(payload: unknown) {
  const root = payload as { code?: unknown; data?: unknown } | null;
  const data = root?.data as Record<string, unknown> | undefined;
  return {
    code: typeof root?.code === 'number' ? root.code : null,
    data,
    providerState: readString(data?.state)?.toLowerCase() ?? null,
    failureCode: readString(data?.failCode),
    failureMessage: readString(data?.failMsg),
  };
}

/**
 * A webhook is only a signed notification. This intentionally extracts the
 * minimal terminal hint for audit and queues an authoritative recordInfo
 * lookup before the task can be settled.
 */
export function parseKieCallbackHint(payload: unknown): KieCallbackHint | null {
  const { code, data, providerState, failureCode, failureMessage } =
    readProviderData(payload);
  const taskId = readString(data?.taskId);
  if (!taskId || (providerState !== 'success' && providerState !== 'fail')) {
    return null;
  }
  return {
    taskId,
    providerCode: code,
    providerState,
    failureCode,
    failureMessage,
  };
}

export function parseKieTaskRecord(payload: unknown): KieTaskRecord {
  const { code, data, providerState, failureCode, failureMessage } =
    readProviderData(payload);
  const rawState = providerState ?? '';
  const creditsConsumed =
    typeof data?.creditsConsumed === 'number' &&
    Number.isFinite(data.creditsConsumed)
      ? Math.floor(data.creditsConsumed)
      : null;
  if (rawState === 'success') {
    const resultUrls = parseResultUrls(data?.resultJson);
    return resultUrls.length > 0
      ? {
          state: 'SUCCEEDED',
          providerState,
          resultUrls,
          creditsConsumed,
          failureCode,
          failureMessage,
        }
      : {
          state: 'REVIEW_REQUIRED',
          providerState,
          resultUrls: [],
          creditsConsumed,
          failureCode,
          failureMessage,
        };
  }
  if (rawState === 'fail' || rawState === 'failed' || code === 501) {
    return {
      state: 'FAILED',
      providerState,
      resultUrls: [],
      creditsConsumed,
      failureCode,
      failureMessage,
    };
  }
  if (
    rawState === 'waiting' ||
    rawState === 'queuing' ||
    rawState === 'generating'
  ) {
    return {
      state: 'PROCESSING',
      providerState,
      resultUrls: [],
      creditsConsumed,
      failureCode,
      failureMessage,
    };
  }
  return {
    state: 'REVIEW_REQUIRED',
    providerState,
    resultUrls: [],
    creditsConsumed,
    failureCode,
    failureMessage,
  };
}

function assertTrustedKieBaseUrl(baseUrl: string) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'api.kie.ai') {
    throw new Error('KIE_API_BASE_URL must be https://api.kie.ai.');
  }
  return parsed.toString().replace(/\/$/, '');
}

export class KieVideoProvider {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    baseUrl = 'https://api.kie.ai'
  ) {
    if (!apiKey) throw new Error('KIE_API_KEY is not configured.');
    this.baseUrl = assertTrustedKieBaseUrl(baseUrl);
  }

  async createTask(input: KieCreateTaskInput) {
    const response = await fetch(`${this.baseUrl}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildKieCreateTaskPayload(input)),
    });
    const payload = (await response.json().catch(() => null)) as {
      code?: number;
      data?: { taskId?: unknown };
    } | null;
    const taskId = payload?.data?.taskId;
    if (
      !response.ok ||
      payload?.code !== 200 ||
      typeof taskId !== 'string' ||
      !taskId
    ) {
      throw new Error('Kie createTask did not return a task ID.');
    }
    return { taskId };
  }

  async getTaskRecord(taskId: string) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) throw new Error('Kie task lookup failed.');
    return parseKieTaskRecord(payload);
  }
}

export class MockVideoProvider {
  async createTask() {
    return { taskId: `mock_${crypto.randomUUID()}` };
  }

  async getTaskRecord(): Promise<KieTaskRecord> {
    return {
      state: 'REVIEW_REQUIRED',
      providerState: null,
      resultUrls: [],
      creditsConsumed: null,
      failureCode: null,
      failureMessage: null,
    };
  }
}

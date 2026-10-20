import { serverEnv } from '@/env/server';

const FAL_QUEUE_BASE = 'https://queue.fal.run';
const FAL_MODEL_TEXT = 'fal-ai/nano-banana-pro';
const FAL_MODEL_EDIT = 'fal-ai/nano-banana-pro/edit';
const FAL_ASPECT_RATIOS = new Set([
  'auto',
  '21:9',
  '16:9',
  '3:2',
  '4:3',
  '5:4',
  '1:1',
  '4:5',
  '3:4',
  '2:3',
  '9:16',
]);

export type FalImageInput = {
  prompt: string;
  mode: '1K_SD' | '2K_HD';
  ratio: string;
  count: number;
  referenceImageUrl?: string;
};

export type FalSubmittedRequest = {
  requestId: string;
  statusUrl: string;
  responseUrl: string;
};

export type FalQueueStatus = {
  state: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'UNKNOWN';
  queuePosition?: number;
};

export type FalImageOutput = {
  url: string;
  contentType: string;
  width?: number;
  height?: number;
};

type FalQueueResponse = {
  request_id?: string;
  status_url?: string;
  response_url?: string;
  queue_position?: number;
};

function requireFalKey(): string {
  const key = serverEnv.FAL_KEY;
  if (!key) throw new Error('FAL_KEY is not configured.');
  return key;
}

function buildInput(input: FalImageInput) {
  const aspectRatio = FAL_ASPECT_RATIOS.has(input.ratio) ? input.ratio : 'auto';
  return {
    prompt: input.prompt,
    num_images: Math.max(1, Math.min(input.count, 4)),
    aspect_ratio: aspectRatio,
    output_format: 'png',
    safety_tolerance: '4',
    resolution: input.mode === '2K_HD' ? '2K' : '1K',
    limit_generations: true,
    ...(input.referenceImageUrl
      ? { image_urls: [input.referenceImageUrl] }
      : {}),
  };
}

export function buildFalImageInput(input: FalImageInput) {
  return buildInput(input);
}

export async function submitFalImageRequest(
  input: FalImageInput
): Promise<FalSubmittedRequest> {
  const model = input.referenceImageUrl ? FAL_MODEL_EDIT : FAL_MODEL_TEXT;
  const response = await fetch(`${FAL_QUEUE_BASE}/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${requireFalKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildInput(input)),
  });
  if (!response.ok) {
    throw new Error(`fal queue submission failed (${response.status}).`);
  }
  const payload = (await response.json()) as FalQueueResponse;
  if (!payload.request_id || !payload.status_url || !payload.response_url) {
    throw new Error('fal queue response is missing URLs.');
  }
  return {
    requestId: payload.request_id,
    statusUrl: payload.status_url,
    responseUrl: payload.response_url,
  };
}

export async function getFalQueueStatus(
  statusUrl: string
): Promise<FalQueueStatus> {
  const response = await fetch(statusUrl, {
    headers: { Authorization: `Key ${requireFalKey()}` },
  });
  if (!response.ok) {
    throw new Error(`fal status failed (${response.status}).`);
  }
  const payload = (await response.json()) as {
    status?: string;
    queue_position?: number;
  };
  const state =
    payload.status === 'IN_QUEUE' ||
    payload.status === 'IN_PROGRESS' ||
    payload.status === 'COMPLETED'
      ? payload.status
      : 'UNKNOWN';
  return { state, queuePosition: payload.queue_position };
}

export async function getFalImageResult(
  responseUrl: string
): Promise<FalImageOutput[]> {
  const response = await fetch(responseUrl, {
    headers: { Authorization: `Key ${requireFalKey()}` },
  });
  if (!response.ok) {
    throw new Error(`fal result failed (${response.status}).`);
  }
  const payload = (await response.json()) as {
    images?: Array<{
      url?: string;
      content_type?: string;
      width?: number;
      height?: number;
    }>;
    error?: string;
  };
  if (payload.error) throw new Error('fal image generation failed.');
  return (payload.images ?? [])
    .filter(
      (image): image is typeof image & { url: string } =>
        typeof image.url === 'string' && image.url.startsWith('https://')
    )
    .map((image) => ({
      url: image.url,
      contentType: image.content_type ?? 'image/png',
      width: image.width,
      height: image.height,
    }));
}

export function getFalModelForInput(input: FalImageInput): string {
  return input.referenceImageUrl ? FAL_MODEL_EDIT : FAL_MODEL_TEXT;
}

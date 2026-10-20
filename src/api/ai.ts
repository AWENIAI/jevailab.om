import { webSearchInputSchema, webSearchResultSchema } from '@/lib/web-search';
import { generateImage } from '@tanstack/ai';
import { falImage } from '@tanstack/ai-fal';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  CF_IMAGE_MODELS,
  CLEF_MODELS,
  DEFAULT_CF_IMAGE_MODEL,
  DEFAULT_FAL_IMAGE_MODEL,
  FAL_IMAGE_EDIT_MODEL,
  FAL_IMAGE_MODELS,
  OPENAI_IMAGE_MODEL,
  WORKERS_AI_MODELS,
  TTS_SPEAKERS,
} from '@/config/ai-models';
import { serverEnv } from '@/env/server';
import { authApiMiddleware } from '@/middlewares/auth-middleware';
import {
  getAvailableKieImageAspectRatios,
  getKieImageCreditCost,
  KIE_IMAGE_ASPECT_RATIOS,
  KIE_IMAGE_BACKGROUNDS,
  KIE_IMAGE_RESOLUTIONS,
  toKieImageInput,
} from '@/lib/kie-image';
import {
  chatText,
  base64ImageUrl,
  type WorkersAiChatResult,
} from '@/lib/workers-ai';
import { CLEF_TICKET_QUESTIONS, clefTicketResultSchema } from '@/lib/clef';
import {
  assertPromptApproved,
  getRuntimeModerationProvider,
} from '@/lib/image-creator/moderation.server';

/**
 * AI demo server functions.
 *
 * - Text summarization: Cloudflare Workers AI (`WORKERS_AI_MODELS.summarization`)
 *   via the plain Workers AI REST API (no extra adapter needed).
 *   Endpoint: https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{model}
 *
 * - Translation: Cloudflare Workers AI (`WORKERS_AI_MODELS.translation`).
 *
 * - Tagline generation (Chat): Cloudflare Workers AI
 *   (`WORKERS_AI_MODELS.tagline`) — system + user messages.
 *
 * - Image generation (fal): fal.ai via the `@tanstack/ai-fal` adapter.
 *   Supports switching between models declared in `FAL_IMAGE_MODELS`.
 *
 * - Image editing / image-to-image (fal): `FAL_IMAGE_EDIT_MODEL`.
 *   Takes a base64 portrait + prompt and returns a stylized version (e.g.
 *   bobblehead caricature). Identity preservation is excellent on this model.
 *
 * - Image generation (Cloudflare): Workers AI text-to-image models such as
 *   `CF_IMAGE_MODELS`. These return the image either as base64 inside a JSON
 *   envelope or as a raw binary body — we detect via `Content-Type` and return
 *   a data URL either way.
 *
 * - Text-to-Speech: Cloudflare Workers AI (`WORKERS_AI_MODELS.textToSpeech`) — returns
 *   the MP3 audio inline as a base64 data URL.
 *
 * - Image captioning (Image-to-Text): Cloudflare Workers AI
 *   (`WORKERS_AI_MODELS.imageCaption`) — accepts a base64 image plus a prompt,
 *   returns a caption / answer about the image.
 *
 * Required env (Worker secrets):
 * - CLOUDFLARE_ACCOUNT_ID  (for Workers AI calls)
 * - CLOUDFLARE_API_TOKEN   Workers AI API token (for Workers AI calls)
 * - FAL_KEY                fal.ai API key (for image generation)
 */

const SUPPORTED_LANGUAGES = [
  'english',
  'chinese',
  'french',
  'german',
  'spanish',
  'japanese',
  'korean',
  'russian',
  'portuguese',
  'arabic',
] as const;
const languageEnum = z.enum(SUPPORTED_LANGUAGES);

const summarizationSchema = z.object({
  text: z
    .string()
    .min(50, 'Please provide at least 50 characters to summarize.')
    .max(500, 'Text is too long, please keep it under 500 characters.'),
});

const translationSchema = z
  .object({
    text: z
      .string()
      .min(1, 'Please provide some text to translate.')
      .max(1000, 'Text is too long, please keep it under 1000 characters.'),
    sourceLang: languageEnum,
    targetLang: languageEnum,
  })
  .refine((value) => value.sourceLang !== value.targetLang, {
    message: 'Source and target languages must be different.',
    path: ['targetLang'],
  });

const taglineSchema = z.object({
  product: z
    .string()
    .min(10, 'Please describe your product in at least 10 characters.')
    .max(400, 'Description is too long, please keep it under 400 characters.'),
});

const imageGenerationSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Prompt is too short.')
    .max(500, 'Prompt is too long, please keep it under 500 characters.'),
  model: z.enum(FAL_IMAGE_MODELS).default(DEFAULT_FAL_IMAGE_MODEL),
});

const cfImageGenerationSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Prompt is too short.')
    .max(500, 'Prompt is too long, please keep it under 500 characters.'),
  model: z.enum(CF_IMAGE_MODELS).default(DEFAULT_CF_IMAGE_MODEL),
});

const ttsSchema = z.object({
  text: z
    .string()
    .min(1, 'Please provide some text to synthesize.')
    .max(1000, 'Text is too long, please keep it under 1000 characters.'),
  speaker: z.enum(TTS_SPEAKERS),
});

const imageEditSchema = z.object({
  /** Base64-encoded source image (with or without `data:` prefix). */
  imageBase64: z
    .string()
    .min(100, 'Image data is too small.')
    .max(1_400_000, 'Image is too large (please use one under ~1 MB).'),
  prompt: z
    .string()
    .min(5, 'Please provide a longer prompt.')
    .max(500, 'Prompt is too long, please keep it under 500 characters.'),
});

const kieImageGenerationSchema = z
  .object({
    prompt: z.string().trim().min(1).max(20_000),
    resolution: z.enum(KIE_IMAGE_RESOLUTIONS),
    aspectRatio: z.enum(KIE_IMAGE_ASPECT_RATIOS),
    background: z.enum(KIE_IMAGE_BACKGROUNDS),
    count: z.number().int().min(1).max(9),
  })
  .refine(
    (data) =>
      getAvailableKieImageAspectRatios(data.resolution).includes(
        data.aspectRatio
      ),
    {
      message: 'The selected aspect ratio is not available at this resolution.',
    }
  );

const kieImageStatusSchema = z.object({
  ticket: z.string().min(20).max(4_000),
});

const captionSchema = z.object({
  /**
   * Image as base64-encoded bytes (no `data:` prefix). The client strips the
   * data URL prefix before sending. We cap the encoded length so the JSON
   * payload to the server function stays under ~1.4 MB.
   */
  imageBase64: z
    .string()
    .min(100, 'Image data is too small.')
    .max(1_400_000, 'Image is too large (please use one under ~1 MB).'),
  prompt: z
    .string()
    .min(1, 'Please provide a prompt.')
    .max(300, 'Prompt is too long, please keep it under 300 characters.'),
});

/**
 * Helper: invoke the Cloudflare Workers AI REST endpoint for a given model.
 * Returns the parsed `result` object on success, throws on any error.
 */
async function runWorkersAi<TResult>(
  model: string,
  body: Record<string, unknown>
): Promise<TResult> {
  const accountId = serverEnv.CLOUDFLARE_ACCOUNT_ID;
  const apiKey = serverEnv.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiKey) {
    throw new Error(
      'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN env.'
    );
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(
      `Workers AI request failed (${response.status}): ${errBody.slice(0, 200)}`
    );
  }

  const payload = (await response.json()) as {
    success?: boolean;
    result?: TResult;
    errors?: Array<{ message?: string }>;
  };

  if (!payload.success || !payload.result) {
    const message =
      payload.errors?.[0]?.message ?? 'Empty response from Workers AI.';
    throw new Error(`Workers AI error: ${message}`);
  }

  return payload.result;
}

/**
 * Summarize a long piece of text using Cloudflare Workers AI
 * `WORKERS_AI_MODELS.summarization` via the Workers AI REST API.
 */
export const summarizeText = createServerFn({ method: 'POST' })
  .validator(summarizationSchema)
  .handler(async ({ data }) => {
    const result = await runWorkersAi<WorkersAiChatResult>(
      WORKERS_AI_MODELS.summarization,
      {
        messages: [
          {
            role: 'system',
            content:
              'You summarize text clearly and concisely. Return only the summary, without an introduction, labels, markdown, or bullet points.',
          },
          {
            role: 'user',
            content: `Summarize this text in 1-2 sentences:\n\n${data.text}`,
          },
        ],
        chat_template_kwargs: { enable_thinking: false },
        max_tokens: 180,
        temperature: 0.2,
      }
    );

    if (!chatText(result)) {
      throw new Error('Summarization returned an empty response.');
    }

    return { summary: chatText(result).trim() };
  });

/**
 * Translate text between languages using Cloudflare Workers AI
 * `WORKERS_AI_MODELS.translation` (Many-to-Many multilingual translation).
 */
export const translateText = createServerFn({ method: 'POST' })
  .validator(translationSchema)
  .handler(async ({ data }) => {
    const result = await runWorkersAi<{ translated_text?: string }>(
      WORKERS_AI_MODELS.translation,
      {
        text: data.text,
        source_lang: data.sourceLang,
        target_lang: data.targetLang,
      }
    );

    if (!result.translated_text) {
      throw new Error('Translation returned an empty response.');
    }

    return { translatedText: result.translated_text };
  });

/**
 * Generate 5 SaaS taglines from a short product description using
 * Cloudflare Workers AI `WORKERS_AI_MODELS.tagline` (chat model).
 *
 * Demonstrates a single-shot chat call with a system prompt that constrains
 * the output to a numbered list — no follow-up turns are kept.
 */
export const generateTaglines = createServerFn({ method: 'POST' })
  .validator(taglineSchema)
  .handler(async ({ data }) => {
    const result = await runWorkersAi<WorkersAiChatResult>(
      WORKERS_AI_MODELS.tagline,
      {
        messages: [
          {
            role: 'system',
            content:
              'You are a creative copywriter for SaaS products. Write exactly 5 short, punchy taglines (max 8 words each) for the product the user describes. Return them as a numbered list (1. ... 2. ...). Do not add any introduction, explanation, or trailing notes — only the 5 lines.',
          },
          {
            role: 'user',
            content: `Product description: ${data.product}`,
          },
        ],
        chat_template_kwargs: { enable_thinking: false },
        max_tokens: 300,
        temperature: 0.85,
      }
    );

    if (!chatText(result)) {
      throw new Error('Tagline generation returned an empty response.');
    }

    const taglines = parseTaglines(chatText(result));
    if (taglines.length === 0) {
      throw new Error('Could not parse taglines from model response.');
    }

    return { taglines };
  });

/**
 * Extract numbered taglines from a model's free-form response.
 * Tolerates "1.", "1)", "- ", and "* " bullets, plus surrounding markdown.
 */
function parseTaglines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(\d+[.)]|[-*])\s*/, '').trim())
    .map((line) => line.replace(/^["“'']|["”'']$/g, '').trim())
    .filter((line) => line.length > 0 && line.length <= 120)
    .slice(0, 5);
}

/**
 * Generate an image from a text prompt using fal.ai. Caller picks the model
 * (Flux Schnell, Nano Banana, or GPT Image 2).
 * Returns the hosted image URL produced by fal.
 */
export const generateAiImage = createServerFn({ method: 'POST' })
  .validator(imageGenerationSchema)
  .handler(async ({ data }) => {
    await assertPromptApproved(data.prompt);
    const apiKey = serverEnv.FAL_KEY;
    if (!apiKey) {
      throw new Error(
        'Missing FAL_KEY env. Set it as a Worker secret to use fal.ai.'
      );
    }

    const adapter = falImage(data.model, { apiKey });

    // GPT Image 2 defaults to high quality which can take 60–75s and may
    // exhaust the Cloudflare Worker subrequest budget while polling fal's
    // queue. Force the cheaper / faster `low` quality + jpeg encoding so it
    // completes in ~30s for the demo.
    const modelOptions =
      data.model === OPENAI_IMAGE_MODEL
        ? { quality: 'low' as const, output_format: 'jpeg' as const }
        : undefined;

    const result = await generateImage({
      adapter,
      prompt: data.prompt,
      ...(modelOptions ? { modelOptions } : {}),
    });

    const image = result.images?.[0];
    const imageUrl = image?.url;
    if (!imageUrl) {
      throw new Error('Image generation failed: empty response.');
    }

    return { imageUrl, model: data.model };
  });

/**
 * Image-to-image edit using fal.ai Nano Banana (`/edit` endpoint).
 * Sends the user's base64 image as a data URI in `image_urls` and returns a
 * stylized version. Great at preserving the subject's identity, so it works
 * well for portrait → caricature / cartoon / anime transformations.
 */
export const editAiImage = createServerFn({ method: 'POST' })
  .validator(imageEditSchema)
  .handler(async ({ data }) => {
    await assertPromptApproved(data.prompt);
    const apiKey = serverEnv.FAL_KEY;
    if (!apiKey) {
      throw new Error(
        'Missing FAL_KEY env. Set it as a Worker secret to use fal.ai.'
      );
    }

    const dataUrl = data.imageBase64.startsWith('data:')
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    const adapter = falImage(FAL_IMAGE_EDIT_MODEL, { apiKey });

    const result = await generateImage({
      adapter,
      prompt: data.prompt,
      modelOptions: { image_urls: [dataUrl] },
    });

    const image = result.images?.[0];
    const imageUrl = image?.url;
    if (!imageUrl) {
      throw new Error('Image edit failed: empty response.');
    }

    return { imageUrl };
  });

const KIE_API_BASE_URL = 'https://api.kie.ai';
const KIE_IMAGE_MODEL = 'gpt-image-2-text-to-image';
const KIE_TICKET_TTL_MS = 20 * 60 * 1_000;

type KieApiResponse<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

type KieTaskRecord = {
  taskId?: string;
  state?: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
  resultJson?: string | null;
  failMsg?: string | null;
  progress?: number | null;
};

type KieTicketPayload = {
  exp: number;
  taskIds: string[];
  userId: string;
};

function getKieApiKey(): string {
  const apiKey = serverEnv.KIE_API_KEY?.trim();
  if (!apiKey) throw new Error('KIE_API_KEY is not configured.');
  return apiKey;
}

async function kieRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${KIE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getKieApiKey()}`,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const payload = (await response
    .json()
    .catch(() => null)) as KieApiResponse<T> | null;
  if (!response.ok || !payload || payload.code !== 200 || !payload.data) {
    throw new Error(payload?.msg?.trim() || 'Kie image request failed.');
  }
  return payload.data;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

async function createKieTicket(payload: KieTicketPayload): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getKieApiKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(body))
  );
  return `${body}.${toBase64Url(signature)}`;
}

async function readKieTicket(
  ticket: string,
  userId: string
): Promise<KieTicketPayload> {
  const [body, signature] = ticket.split('.');
  if (!body || !signature) throw new Error('Invalid generation ticket.');
  const signingKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getKieApiKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify(
    'HMAC',
    signingKey,
    toArrayBuffer(fromBase64Url(signature)),
    new TextEncoder().encode(body)
  );
  if (!valid) throw new Error('Invalid generation ticket.');
  const payload = JSON.parse(
    new TextDecoder().decode(fromBase64Url(body))
  ) as KieTicketPayload;
  if (
    payload.userId !== userId ||
    payload.exp <= Date.now() ||
    !Array.isArray(payload.taskIds) ||
    payload.taskIds.length === 0
  ) {
    throw new Error('This generation ticket has expired.');
  }
  return payload;
}

function getKieResultUrls(resultJson: string | null | undefined): string[] {
  if (!resultJson) return [];
  try {
    const parsed = JSON.parse(resultJson) as { resultUrls?: unknown };
    return Array.isArray(parsed.resultUrls)
      ? parsed.resultUrls.filter(
          (url): url is string => typeof url === 'string'
        )
      : [];
  } catch {
    return [];
  }
}

/** Submit one to nine GPT Image 2 tasks. Kie bills one task per image. */
export const createKieImageGeneration = createServerFn({ method: 'POST' })
  .validator(kieImageGenerationSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data, context }) => {
    await assertPromptApproved(data.prompt);
    const input = toKieImageInput(data);
    const created = await Promise.allSettled(
      Array.from({ length: data.count }, async () => {
        const result = await kieRequest<{ taskId?: string }>(
          '/api/v1/jobs/createTask',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: KIE_IMAGE_MODEL, input }),
          }
        );
        if (!result.taskId) throw new Error('Kie did not return a task ID.');
        return result.taskId;
      })
    );
    const taskIds = created.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );
    if (taskIds.length === 0) {
      const firstFailure = created.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      );
      throw (
        firstFailure?.reason ?? new Error('Could not start image generation.')
      );
    }

    return {
      createdCount: taskIds.length,
      requestedCredits: getKieImageCreditCost(data.resolution, taskIds.length),
      ticket: await createKieTicket({
        userId: context.userId,
        taskIds,
        exp: Date.now() + KIE_TICKET_TTL_MS,
      }),
    };
  });

/** Query only task IDs bound to the authenticated user's short-lived ticket. */
export const getKieImageGenerationStatus = createServerFn({ method: 'POST' })
  .validator(kieImageStatusSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data, context }) => {
    const ticket = await readKieTicket(data.ticket, context.userId);
    const tasks = await Promise.all(
      ticket.taskIds.map(async (taskId) => {
        const task = await kieRequest<KieTaskRecord>(
          `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`
        );
        const resultUrls = getKieResultUrls(task.resultJson);
        const reviewedUrls = await Promise.all(
          resultUrls.map(async (sourceUrl, index) => {
            const moderation = await getRuntimeModerationProvider().review({
              kind: 'generated_image',
              jobId: taskId,
              outputId: `${taskId}:${index}`,
              sourceUrl,
            });
            return moderation.decision === 'approved'
              ? { sourceUrl }
              : { sourceUrl: undefined, moderation };
          })
        );
        const withheld = reviewedUrls.find(
          (item) => item.sourceUrl === undefined
        );
        return {
          taskId,
          state: task.state ?? 'waiting',
          progress: task.progress ?? undefined,
          resultUrls: reviewedUrls.flatMap((item) =>
            item.sourceUrl ? [item.sourceUrl] : []
          ),
          error:
            task.state === 'fail'
              ? task.failMsg || 'Generation failed.'
              : withheld
                ? 'Generated output is withheld pending content review.'
                : undefined,
        };
      })
    );
    return {
      tasks,
      complete: tasks.every(
        (task) => task.state === 'success' || task.state === 'fail'
      ),
    };
  });

/**
 * Synthesize speech from text using Cloudflare Workers AI Deepgram Aura
 * (`WORKERS_AI_MODELS.textToSpeech`). Unlike the JSON-based models above, this endpoint
 * returns raw MP3 bytes (`Content-Type: audio/mpeg`), so we base64-encode
 * them and return a data URL the browser can feed straight to `<audio>`.
 */
export const synthesizeSpeech = createServerFn({ method: 'POST' })
  .validator(ttsSchema)
  .handler(async ({ data }) => {
    const accountId = serverEnv.CLOUDFLARE_ACCOUNT_ID;
    const apiKey = serverEnv.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiKey) {
      throw new Error(
        'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN env.'
      );
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${WORKERS_AI_MODELS.textToSpeech}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: data.text,
          speaker: data.speaker,
          encoding: 'mp3',
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(
        `TTS request failed (${response.status}): ${errBody.slice(0, 200)}`
      );
    }

    const contentType = response.headers.get('content-type') ?? 'audio/mpeg';
    const buffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);

    return {
      audioUrl: `data:${contentType};base64,${base64}`,
      bytes: buffer.byteLength,
    };
  });

/**
 * Convert an ArrayBuffer to base64 in chunks. Avoids the ~64k argument
 * limit of `String.fromCharCode(...bytes)` on realistic audio payloads.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Generate an image from a text prompt using a Cloudflare Workers AI
 * text-to-image model. Different models return different shapes:
 *
 * - JSON `{ result: { image: <base64 jpeg> } }` (e.g. `flux-1-schnell`)
 * - Raw binary image body (e.g. `stable-diffusion-xl-lightning`)
 *
 * We branch on `Content-Type` and always return a `data:` URL the browser
 * can render directly.
 */
export const generateCfImage = createServerFn({ method: 'POST' })
  .validator(cfImageGenerationSchema)
  .handler(async ({ data }) => {
    await assertPromptApproved(data.prompt);
    const accountId = serverEnv.CLOUDFLARE_ACCOUNT_ID;
    const apiKey = serverEnv.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiKey) {
      throw new Error(
        'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN env.'
      );
    }

    const multipart = data.model.includes('/flux-2-');
    const form = new FormData();
    form.set('prompt', data.prompt);
    form.set('width', '1024');
    form.set('height', '1024');
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${data.model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(multipart ? {} : { 'Content-Type': 'application/json' }),
        },
        body: multipart ? form : JSON.stringify({ prompt: data.prompt }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(
        `Workers AI request failed (${response.status}): ${errBody.slice(
          0,
          200
        )}`
      );
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as {
        success?: boolean;
        result?: { image?: string };
        errors?: Array<{ message?: string }>;
      };
      const base64 = payload.result?.image;
      if (!payload.success || !base64) {
        const message =
          payload.errors?.[0]?.message ?? 'Empty response from Workers AI.';
        throw new Error(`Workers AI error: ${message}`);
      }
      return {
        imageUrl: base64ImageUrl(base64),
        model: data.model,
      };
    }

    // Binary image body — content-type may be image/png, image/jpeg, etc.
    const buffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const mime = contentType.startsWith('image/') ? contentType : 'image/jpeg';
    return {
      imageUrl: `data:${mime};base64,${base64}`,
      model: data.model,
    };
  });

/**
 * Generate a caption (or answer a custom prompt) for an image using
 * Cloudflare Workers AI Gemma 4 (`WORKERS_AI_MODELS.imageCaption`).
 *
 * Send the uploaded PNG/JPEG/WebP as a data URL in multimodal messages.
 */
export const captionImage = createServerFn({ method: 'POST' })
  .validator(captionSchema)
  .handler(async ({ data }) => {
    const imageUrl = base64ImageUrl(data.imageBase64);
    const result = await runWorkersAi<WorkersAiChatResult>(
      WORKERS_AI_MODELS.imageCaption,
      {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: data.prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        chat_template_kwargs: { enable_thinking: false },
        max_tokens: 256,
      }
    );
    const description = chatText(result).trim();
    if (!description)
      throw new Error('Image captioning returned an empty response.');
    return { description };
  });

/** Evaluate a support ticket with Clef's three typed decision questions. */
export const evaluateTicket = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      model: z.enum(CLEF_MODELS),
      state: z.string().trim().min(10).max(4000),
    })
  )
  .handler(async ({ data }) => {
    const result = await runWorkersAi<unknown>(`@cf/cloudflare/${data.model}`, {
      model: data.model,
      state: data.state,
      questions: CLEF_TICKET_QUESTIONS,
    });
    return clefTicketResultSchema.parse(result);
  });

export const searchWeb = createServerFn({ method: 'POST' })
  .validator(webSearchInputSchema)
  .handler(async ({ data }) => {
    const accountId = serverEnv.CLOUDFLARE_ACCOUNT_ID;
    const token = serverEnv.CLOUDFLARE_API_TOKEN;
    if (!accountId || !token) {
      throw new Error('Missing Cloudflare credentials for web search.');
    }
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/websearch/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          limit: 5,
          options: { gateway: { id: 'default' } },
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (!response.ok) {
      throw new Error(
        response.status === 402
          ? 'Web search requires AI Gateway credits or a configured provider key.'
          : `Web search request failed (${response.status}). Please try again.`
      );
    }
    return webSearchResultSchema.parse(await response.json());
  });

import { createKieImageGeneration } from '@/api/ai';
import { getDb } from '@/db';
import { imageAssets } from '@/db/image-creator.schema';
import { getBaseUrl } from '@/lib/urls';
import { authApiMiddleware } from '@/middlewares/auth-middleware';
import { getRuntimeModerationProvider } from '@/lib/image-creator/moderation.server';
import { getImageCreatorQuote } from '@/lib/image-creator/pricing';
import {
  findImageTemplate,
  imageTemplateSeeds,
  toPublicImageTemplate,
} from '@/lib/image-creator/templates.server';
import {
  imageCreatorDraftSchema,
  validateImageCreatorDraft,
  validateReferenceImageMetadata,
} from '@/lib/image-creator/validation';
import { deleteFile, uploadFile } from '@/storage';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const quoteSchema = imageCreatorDraftSchema;
const startSchema = imageCreatorDraftSchema.extend({
  consentAccepted: z.literal(true),
  policyVersion: z.string().min(1).max(100),
});

const referenceUploadSchema = z
  .custom<FormData>((value): value is FormData => value instanceof FormData)
  .transform((formData) => {
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      throw new Error('Reference image is required.');
    }
    return { file };
  });

const RATIO_TO_KIE = {
  AUTO: 'auto',
  '9:16': '9:16',
  '2:3': '2:3',
  '3:4': '3:4',
  '1:1': '1:1',
  '4:3': '4:3',
  '3:2': '3:2',
  '16:9': '16:9',
  '21:9': '21:9',
} as const;

export const getImageCreatorTemplates = createServerFn({
  method: 'GET',
}).handler(async () => ({
  items: imageTemplateSeeds.map(toPublicImageTemplate),
  categories: Array.from(
    new Set(imageTemplateSeeds.map((item) => item.category))
  ),
}));

export const getImageCreatorCapabilities = createServerFn({
  method: 'GET',
}).handler(async () => ({
  modes: ['1K_SD', '2K_HD'] as const,
  ratios: [
    'AUTO',
    '9:16',
    '2:3',
    '3:4',
    '1:1',
    '4:3',
    '3:2',
    '16:9',
    '21:9',
  ] as const,
  maxCount: 9,
  referenceImage: {
    maxBytes: 10 * 1024 * 1024,
    mediaTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
}));

export const getImageCreatorPolicy = createServerFn({ method: 'GET' }).handler(
  async () => ({
    version: '2026-10-16',
    privacyUrl: '/privacy',
    termsUrl: '/terms',
  })
);

export const quoteImageCreatorDraft = createServerFn({ method: 'POST' })
  .validator(quoteSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data }) => {
    const template = data.templateId
      ? (findImageTemplate(data.templateId) ?? null)
      : null;
    const draft = validateImageCreatorDraft({ template, draft: data });
    const quote = getImageCreatorQuote(draft);
    return {
      ...quote,
      quoteId: crypto.randomUUID(),
      resolvedRatio: draft.ratio === 'AUTO' ? 'auto' : draft.ratio,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      // Wallet persistence is introduced with the D1 migration; never trust
      // the browser's balance in the meantime.
      walletAvailable: null,
      walletEstimatedAfter: null,
    };
  });

export const uploadImageCreatorReference = createServerFn({ method: 'POST' })
  .validator(referenceUploadSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data, context }) => {
    validateReferenceImageMetadata(data.file);
    const moderationProvider = getRuntimeModerationProvider();

    const result = await uploadFile(data.file, data.file.name, data.file.type, {
      folder: 'image-assets',
      userId: context.userId,
      requestOrigin: getBaseUrl(),
    });
    if (!result.metadata) {
      throw new Error('Reference image upload did not return metadata.');
    }

    const moderation = await moderationProvider.review({
      kind: 'reference_image',
      assetId: result.metadata.id,
      storageKey: result.key,
    });
    if (moderation.decision !== 'approved') {
      await deleteFile(result.key);
      throw new Error(
        moderation.decision === 'unavailable'
          ? 'The reference image could not be reviewed right now. Please try again later.'
          : 'The reference image could not pass content review.'
      );
    }

    const now = new Date();
    await getDb().insert(imageAssets).values({
      id: result.metadata.id,
      userId: context.userId,
      storageKey: result.key,
      sourceFilename: data.file.name,
      mediaType: data.file.type,
      byteSize: data.file.size,
      state: 'ready',
      moderationVersion: moderation.policyVersion,
      createdAt: now,
    });
    return { assetId: result.metadata.id, fileName: data.file.name };
  });

export const startImageCreatorGeneration = createServerFn({ method: 'POST' })
  .validator(startSchema)
  .middleware([authApiMiddleware])
  .handler(async ({ data }) => {
    const template = data.templateId
      ? (findImageTemplate(data.templateId) ?? null)
      : null;
    const draft = validateImageCreatorDraft({ template, draft: data });
    if (draft.referenceAssetId) {
      // The active Kie adapter is text-to-image only. Rejecting here avoids
      // accepting an image and silently generating without applying it.
      throw new Error(
        '当前图生图服务尚未接入。请移除参考图后使用文本生图，或等待图生图适配器启用。'
      );
    }
    const moderation = await getRuntimeModerationProvider().review({
      kind: 'prompt',
      text: draft.extraPrompt,
    });
    // SeeAPI's nsfw-filter is image-only. Keep this typed prompt boundary for
    // the text provider that will be introduced later, without falsely marking
    // prompts as reviewed by SeeAPI.
    if (
      moderation.decision !== 'approved' &&
      moderation.reasonCode !== 'SEEAPI_IMAGE_ONLY'
    ) {
      throw new Error(
        moderation.decision === 'unavailable'
          ? 'Content review is not configured, so image generation is temporarily unavailable.'
          : 'This request needs content review before it can be generated.'
      );
    }

    const privatePrompt = [template?.basePrompt, draft.extraPrompt]
      .filter(Boolean)
      .join('\n\n');
    const result = await createKieImageGeneration({
      data: {
        prompt: privatePrompt,
        resolution: draft.mode === '1K_SD' ? '1K' : '2K',
        aspectRatio: RATIO_TO_KIE[draft.ratio],
        background: 'auto',
        count: draft.count,
      },
    });

    return { ticket: result.ticket, createdCount: result.createdCount };
  });

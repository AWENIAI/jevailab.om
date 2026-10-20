import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db';
import { imageAssets } from '@/db/image-creator.schema';
import { getBaseUrl } from '@/lib/urls';
import { getRuntimeModerationProvider } from '@/lib/image-creator/moderation.server';
import { validateReferenceImageMetadata } from '@/lib/image-creator/validation';
import { deleteFile, uploadFile } from '@/storage';
import { createPrivateMiniProgramUserUrl } from './private-media-url.server';
import { MiniProgramApiError } from './responses.server';

export async function uploadReferenceImage(userId: string, file: File) {
  try {
    validateReferenceImageMetadata({
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    throw new MiniProgramApiError(
      'BAD_REQUEST',
      error instanceof Error ? error.message : '参考图不符合要求'
    );
  }
  const uploaded = await uploadFile(file, file.name, file.type, {
    folder: 'image-assets',
    userId,
    requestOrigin: getBaseUrl(),
  });
  if (!uploaded.metadata) {
    throw new MiniProgramApiError('INTERNAL_ERROR', '参考图上传失败');
  }
  const moderation = await getRuntimeModerationProvider().review({
    kind: 'reference_image',
    assetId: uploaded.metadata.id,
    storageKey: uploaded.key,
  });
  if (moderation.decision !== 'approved') {
    await deleteFile(uploaded.key);
    throw new MiniProgramApiError(
      moderation.decision === 'unavailable'
        ? 'MODERATION_UNAVAILABLE'
        : 'MODERATION_REJECTED'
    );
  }
  await getDb().insert(imageAssets).values({
    id: uploaded.metadata.id,
    userId,
    storageKey: uploaded.key,
    sourceFilename: file.name,
    mediaType: file.type,
    byteSize: file.size,
    state: 'ready',
    moderationVersion: moderation.policyVersion,
    createdAt: new Date(),
  });
  return {
    assetId: uploaded.metadata.id,
    fileName: file.name,
    previewUrl: await createPrivateMiniProgramUserUrl(uploaded.key),
  };
}

export async function deleteReferenceImage(userId: string, assetId: unknown) {
  if (typeof assetId !== 'string' || !assetId) {
    throw new MiniProgramApiError('BAD_REQUEST', '缺少参考图编号');
  }
  const db = getDb();
  const [asset] = await db
    .select({ storageKey: imageAssets.storageKey })
    .from(imageAssets)
    .where(
      and(
        eq(imageAssets.id, assetId),
        eq(imageAssets.userId, userId),
        isNull(imageAssets.deletedAt)
      )
    )
    .limit(1);
  if (!asset) return { deleted: false };
  await deleteFile(asset.storageKey);
  await db
    .update(imageAssets)
    .set({ state: 'deleted', deletedAt: new Date() })
    .where(
      and(
        eq(imageAssets.id, assetId),
        eq(imageAssets.userId, userId),
        isNull(imageAssets.deletedAt)
      )
    );
  return { deleted: true };
}

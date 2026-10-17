import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { videoTemplates } from '@/db/video-creator.schema';

export async function findEnabledVideoTemplate(templateId: string) {
  const [template] = await getDb()
    .select()
    .from(videoTemplates)
    .where(
      and(eq(videoTemplates.id, templateId), eq(videoTemplates.enabled, true))
    )
    .limit(1);
  return template ?? null;
}

export async function listEnabledVideoTemplates() {
  return getDb()
    .select({
      id: videoTemplates.id,
      name: videoTemplates.name,
      version: videoTemplates.version,
      previewUrl: videoTemplates.previewUrl,
      durationSeconds: videoTemplates.durationSeconds,
      aspectRatio: videoTemplates.aspectRatio,
    })
    .from(videoTemplates)
    .where(
      and(
        eq(videoTemplates.enabled, true),
        eq(videoTemplates.authorizationStatus, 'approved')
      )
    );
}

import { describe, expect, it } from 'vitest';
import {
  IMAGE_CREATOR_DRAFT_STORAGE_VERSION,
  parseStoredImageCreatorDraft,
} from '@/lib/image-creator/draft-storage';

describe('image creator draft storage', () => {
  it('restores the complete editor state after authentication', () => {
    const now = 1_700_000_001_000;
    const draft = parseStoredImageCreatorDraft(
      JSON.stringify({
        version: IMAGE_CREATOR_DRAFT_STORAGE_VERSION,
        templateId: 'image-template-1015',
        prompt: 'warm summer light',
        mode: '2K_HD',
        ratio: '16:9',
        count: 2,
        consentAccepted: true,
        query: 'summer',
        category: 'Image creation',
        pendingGenerate: true,
        updatedAt: 1_700_000_000_000,
      }),
      now
    );

    expect(draft).toEqual({
      version: IMAGE_CREATOR_DRAFT_STORAGE_VERSION,
      templateId: 'image-template-1015',
      prompt: 'warm summer light',
      mode: '2K_HD',
      ratio: '16:9',
      count: 2,
      consentAccepted: true,
      query: 'summer',
      category: 'Image creation',
      pendingGenerate: true,
      updatedAt: 1_700_000_000_000,
    });
  });

  it('ignores malformed or outdated drafts instead of breaking the editor', () => {
    expect(parseStoredImageCreatorDraft('{')).toBeNull();
    expect(
      parseStoredImageCreatorDraft(
        JSON.stringify({
          version: IMAGE_CREATOR_DRAFT_STORAGE_VERSION + 1,
          templateId: null,
          prompt: '',
          mode: '1K_SD',
          ratio: '3:4',
          count: 1,
          consentAccepted: false,
          query: '',
          category: 'All',
          pendingGenerate: false,
          updatedAt: 1,
        })
      )
    ).toBeNull();
  });
});

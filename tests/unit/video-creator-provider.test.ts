import { describe, expect, test } from 'vitest';

import {
  buildKieCreateTaskPayload,
  parseKieCallbackHint,
  parseKieTaskRecord,
} from '@/lib/video-creator/provider';

describe('Kie video provider payloads', () => {
  test('serializes Wan with trusted server asset URLs and a forced NSFW check', () => {
    expect(
      buildKieCreateTaskPayload({
        callbackUrl: 'https://example.com/api/webhooks/kie',
        model: 'wan/2-2-animate-replace',
        resolution: '480p',
        templateUrl: 'https://example.com/trusted-template.mp4',
        imageUrl: 'https://example.com/owned-image.png',
        aspectRatio: '9:16',
        durationSeconds: 8,
        seedancePrompt: 'must not be used',
      })
    ).toEqual({
      model: 'wan/2-2-animate-replace',
      callBackUrl: 'https://example.com/api/webhooks/kie',
      input: {
        video_url: 'https://example.com/trusted-template.mp4',
        image_url: 'https://example.com/owned-image.png',
        resolution: '480p',
        nsfw_checker: true,
      },
    });
  });

  test('serializes Seedance without audio, search, or browser-supplied prompt', () => {
    const payload = buildKieCreateTaskPayload({
      callbackUrl: 'https://example.com/api/webhooks/kie',
      model: 'bytedance/seedance-2-mini',
      resolution: '720p',
      templateUrl: 'https://example.com/trusted-template.mp4',
      imageUrl: 'https://example.com/owned-image.png',
      aspectRatio: '9:16',
      durationSeconds: 12,
      seedancePrompt: 'Controlled server prompt.',
    });
    expect(payload).toEqual({
      model: 'bytedance/seedance-2-mini',
      callBackUrl: 'https://example.com/api/webhooks/kie',
      input: {
        reference_image_urls: ['https://example.com/owned-image.png'],
        reference_video_urls: ['https://example.com/trusted-template.mp4'],
        prompt: 'Controlled server prompt.',
        resolution: '720p',
        aspect_ratio: '9:16',
        duration: 12,
        generate_audio: false,
        web_search: false,
        nsfw_checker: true,
      },
    });
  });

  test('does not treat result URLs as success when provider state is unknown', () => {
    expect(
      parseKieTaskRecord({
        code: 200,
        data: {
          state: 'waiting',
          resultJson: JSON.stringify({
            resultUrls: ['https://example.com/a.mp4'],
          }),
        },
      })
    ).toMatchObject({
      state: 'PROCESSING',
      providerState: 'waiting',
      resultUrls: [],
      creditsConsumed: null,
    });
  });

  test('keeps the documented queued states and provider metadata for audit', () => {
    expect(
      parseKieTaskRecord({
        code: 200,
        data: {
          state: 'generating',
          creditsConsumed: 12,
        },
      })
    ).toMatchObject({
      state: 'PROCESSING',
      providerState: 'generating',
      creditsConsumed: 12,
    });
  });

  test('treats Kie failure callbacks as a non-billable failure hint', () => {
    expect(
      parseKieCallbackHint({
        code: 501,
        data: {
          taskId: 'task_failed',
          state: 'fail',
          failCode: 'CONTENT_POLICY',
          failMsg: 'Rejected by upstream moderation',
        },
      })
    ).toEqual({
      taskId: 'task_failed',
      providerCode: 501,
      providerState: 'fail',
      failureCode: 'CONTENT_POLICY',
      failureMessage: 'Rejected by upstream moderation',
    });
  });

  test('does not trust a callback with an unrecognized terminal state', () => {
    expect(
      parseKieCallbackHint({
        code: 200,
        data: { taskId: 'task_unknown', state: 'complete-ish' },
      })
    ).toBeNull();
  });
});

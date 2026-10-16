import { describe, expect, it, vi } from 'vitest';
import { SeeApiImageModerationProvider } from '@/lib/image-creator/moderation.server';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('SeeAPI image moderation provider', () => {
  it('submits the private reference image through a supplied review URL and approves a clean result', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ id: 'task_123', status: 'queued' }, 202)
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'task_123',
          status: 'succeeded',
          result: {
            data: {
              flagged: false,
              categories: { nsfw: [], special_care: [] },
            },
          },
        })
      );
    const provider = new SeeApiImageModerationProvider({
      apiKey: 'test-key',
      fetchFn,
      pollDelayMs: 0,
      maxPollAttempts: 1,
      getReviewUrl: (storageKey) =>
        `https://jevailab.com/api/storage/file?key=${encodeURIComponent(storageKey)}&review=token`,
    });

    await expect(
      provider.review({
        kind: 'reference_image',
        assetId: 'asset_123',
        storageKey: 'image-assets/user/photo.png',
      })
    ).resolves.toMatchObject({
      decision: 'approved',
      policyVersion: 'seeapi-nsfw-filter-v1',
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[0][0]).toBe(
      'https://api.seeapi.com/v1/inferences'
    );
    expect(fetchFn.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-key',
        'Idempotency-Key': expect.any(String),
      }),
    });
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toMatchObject({
      model: 'nsfw-filter',
      endpoint: 'image-moderation',
      provider: 'seeapi',
      input: {
        image_url:
          'https://jevailab.com/api/storage/file?key=image-assets%2Fuser%2Fphoto.png&review=token',
        threshold_offset: 0.02,
        strict_special_care: true,
      },
    });
  });

  it('fails closed for detected adult content and routes special-care matches to manual review', async () => {
    const flaggedFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 'task_flagged' }, 202))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'succeeded',
          result: {
            data: {
              flagged: true,
              categories: { nsfw: ['nudity'], special_care: [] },
            },
          },
        })
      );
    const specialCareFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 'task_special' }, 202))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'succeeded',
          result: {
            data: {
              flagged: false,
              categories: { nsfw: [], special_care: ['minor'] },
            },
          },
        })
      );

    const subject = {
      kind: 'generated_image' as const,
      jobId: 'job_123',
      outputId: 'output_123',
      sourceUrl: 'https://provider.example/image.png',
    };
    const baseOptions = {
      apiKey: 'test-key',
      pollDelayMs: 0,
      maxPollAttempts: 1,
      getReviewUrl: () => 'https://jevailab.com/review-image',
    };

    await expect(
      new SeeApiImageModerationProvider({
        ...baseOptions,
        fetchFn: flaggedFetch,
      }).review(subject)
    ).resolves.toMatchObject({
      decision: 'rejected',
      reasonCode: 'SEEAPI_NSFW_DETECTED',
    });
    await expect(
      new SeeApiImageModerationProvider({
        ...baseOptions,
        fetchFn: specialCareFetch,
      }).review(subject)
    ).resolves.toMatchObject({
      decision: 'manual_review',
      reasonCode: 'SEEAPI_SPECIAL_CARE',
    });
  });

  it('does not pretend that an image-only provider can moderate text prompts', async () => {
    const provider = new SeeApiImageModerationProvider({
      apiKey: 'test-key',
      fetchFn: vi.fn(),
      getReviewUrl: () => 'https://jevailab.com/review-image',
    });

    await expect(
      provider.review({ kind: 'prompt', text: 'A studio portrait.' })
    ).resolves.toMatchObject({
      decision: 'unavailable',
      reasonCode: 'SEEAPI_IMAGE_ONLY',
    });
  });
});

import { describe, expect, test } from 'vitest';

import { nextVideoJobStatus } from '@/lib/video-creator/job-state';

describe('video job state transitions', () => {
  test('requires manual review after an uncertain provider send', () => {
    expect(nextVideoJobStatus('DISPATCHING', 'unknown_dispatch')).toBe(
      'REVIEW_REQUIRED'
    );
  });

  test('does not reopen a settled successful job for a delayed provider failure', () => {
    expect(nextVideoJobStatus('SUCCEEDED', 'provider_failed')).toBe(
      'SUCCEEDED'
    );
  });
});

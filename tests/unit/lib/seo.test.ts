import { describe, expect, it } from 'vitest';
import { metadata } from '@/lib/seo';

describe('metadata', () => {
  it('emits a noindex,follow directive for deliberately excluded pages', () => {
    const tags = metadata({
      title: 'Template detail',
      robots: 'noindex,follow',
    });

    expect(tags).toContainEqual({
      name: 'robots',
      content: 'noindex,follow',
    });
  });
});

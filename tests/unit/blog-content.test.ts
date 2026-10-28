import { describe, expect, it } from 'vitest';
import allBlogs from '../../.content-collections/generated/allBlogs.js';

describe('curated blog content', () => {
  it('loads the selected article in both English and Chinese', () => {
    const locales = allBlogs
      .filter((post) => post.slug === 'best-ai-poster-makers-2026')
      .map((post) => post.locale)
      .sort();

    expect(locales).toEqual(['en', 'zh']);
  });
});

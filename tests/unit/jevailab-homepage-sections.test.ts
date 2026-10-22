import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JevailabHomepageSections } from '@/components/blocks/jevailab-homepage-sections';
import { getJevailabHomepageContent } from '@/content/jevailab-homepage';

describe('Jevailab homepage sections', () => {
  it('renders real image-creation sections, FAQ disclosure, and mapped examples', () => {
    const markup = renderToStaticMarkup(
      createElement(JevailabHomepageSections, {
        content: getJevailabHomepageContent('en'),
      })
    );

    expect(markup).toContain('What is jevailab?');
    expect(markup).toContain('Create an AI image in three steps');
    expect(markup).toContain('FAQ');
    expect(markup).toContain('Private by default');
    expect(markup).toContain('AI image creation');
    expect(markup).toContain('Create now');
    expect(markup).not.toMatch(/video|视频/i);
    expect(markup).toContain('<summary');
    expect(markup).toContain('data-template-id="image-template-1015"');
    expect(markup).toContain('Summer Sky Editorial Portrait');
    expect(markup).toContain('href="/create"');
    expect(markup).not.toContain('href="/#create"');
    expect(markup).not.toContain('The latest image creation template.');
  });

  it('renders localized FAQ and privacy labels on Chinese pages', () => {
    const markup = renderToStaticMarkup(
      createElement(JevailabHomepageSections, {
        content: getJevailabHomepageContent('zh'),
      })
    );

    expect(markup).toContain('常见问题');
    expect(markup).toContain('默认私密');
    expect(markup).not.toContain('Private by default');
  });
});

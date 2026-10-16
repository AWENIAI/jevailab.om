import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PicviloHomepageSections } from '@/components/blocks/picvilo-homepage-sections';
import { getPicviloHomepageContent } from '@/content/picvilo-homepage';

describe('PicVilo homepage sections', () => {
  it('renders real sections, an active video entry, FAQ disclosure, and mapped examples', () => {
    const markup = renderToStaticMarkup(
      createElement(PicviloHomepageSections, {
        content: getPicviloHomepageContent('en'),
        onSelectTemplate: vi.fn(),
      })
    );

    expect(markup).toContain('What is PicVilo AI?');
    expect(markup).toContain('Create an AI image in three steps');
    expect(markup).toContain('AI video creation');
    expect(markup).toContain('Create video');
    expect(markup).toContain('href="#video"');
    expect(markup).toContain('<summary');
    expect(markup).toContain('data-template-id="image-template-1015"');
  });
});

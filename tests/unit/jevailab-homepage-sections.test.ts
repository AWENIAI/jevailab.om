import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { JevailabHomepageSections } from '@/components/blocks/jevailab-homepage-sections';
import { getJevailabHomepageContent } from '@/content/jevailab-homepage';

describe('Jevailab homepage sections', () => {
  it('renders real sections, an active video entry, FAQ disclosure, and mapped examples', () => {
    const markup = renderToStaticMarkup(
      createElement(JevailabHomepageSections, {
        content: getJevailabHomepageContent('en'),
        onSelectTemplate: vi.fn(),
      })
    );

    expect(markup).toContain('What is jevailab?');
    expect(markup).toContain('Create an AI image in three steps');
    expect(markup).toContain('AI video creation');
    expect(markup).toContain('Create video');
    expect(markup).toContain('href="#video"');
    expect(markup).toContain('<summary');
    expect(markup).toContain('data-template-id="image-template-1015"');
    expect(markup).toContain('Summer Sky Editorial Portrait');
    expect(markup).not.toContain('The latest image creation template.');
  });
});


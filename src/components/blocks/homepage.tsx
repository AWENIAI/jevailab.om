'use client';

import HeroSection from '@/components/blocks/hero';
import { JevailabHomepageSections } from '@/components/blocks/jevailab-homepage-sections';
import {
  getJevailabHomepageContent,
  type PublishedImageTemplateId,
} from '@/content/jevailab-homepage';
import { JEVAILAB_TEMPLATE_SELECTION_EVENT } from '@/lib/image-creator/ui-state';
import { getLocale } from '@/lib/locale';
import { useEffect } from 'react';

export function HomePage() {
  const locale = getLocale() === 'zh' ? 'zh' : 'en';
  const content = getJevailabHomepageContent(locale);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('create') !== '1') {
      return;
    }
    requestAnimationFrame(() => {
      document
        .getElementById('create')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  function selectTemplate(templateId: PublishedImageTemplateId) {
    requestAnimationFrame(() => {
      window.dispatchEvent(
        new CustomEvent(JEVAILAB_TEMPLATE_SELECTION_EVENT, {
          detail: { templateId },
        })
      );
      document
        .getElementById('create')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className="flex flex-col">
      <HeroSection />
      <JevailabHomepageSections
        content={content}
        onSelectTemplate={selectTemplate}
      />
    </div>
  );
}

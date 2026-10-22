'use client';

import HeroSection from '@/components/blocks/hero';
import { JevailabHomepageSections } from '@/components/blocks/jevailab-homepage-sections';
import {
  getJevailabHomepageContent,
  type PublishedImageTemplateId,
} from '@/content/jevailab-homepage';
import { getLocale } from '@/lib/locale';
import { useEffect } from 'react';

export function HomePage() {
  const locale = getLocale();
  const content = getJevailabHomepageContent(locale);

  function selectTemplate(templateId: PublishedImageTemplateId) {
    window.location.assign(
      `/create?template=${encodeURIComponent(templateId)}`
    );
  }

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

  return (
    <div className="flex flex-col">
      <HeroSection onSelectTemplate={selectTemplate} />
      <JevailabHomepageSections content={content} />
    </div>
  );
}

'use client';

import { Bulin47VideoCreator } from '@/components/blocks/bulin47-video-creator';
import HeroSection from '@/components/blocks/hero';
import { PicviloHomepageSections } from '@/components/blocks/picvilo-homepage-sections';
import {
  getPicviloHomepageContent,
  type PublishedImageTemplateId,
} from '@/content/picvilo-homepage';
import { PICVILO_TEMPLATE_SELECTION_EVENT } from '@/lib/image-creator/ui-state';
import { getLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { IconPhoto, IconVideo } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

type HomeMode = 'video' | 'image';

function getModeFromHash() {
  if (typeof window === 'undefined') return 'video' as const;
  return window.location.hash === '#image' || window.location.hash === '#create'
    ? ('image' as const)
    : ('video' as const);
}

export function HomePage() {
  const locale = getLocale() === 'zh' ? 'zh' : 'en';
  const content = getPicviloHomepageContent(locale);
  const [mode, setMode] = useState<HomeMode>('video');

  useEffect(() => {
    const syncMode = () => setMode(getModeFromHash());
    syncMode();
    window.addEventListener('hashchange', syncMode);
    return () => window.removeEventListener('hashchange', syncMode);
  }, []);

  function selectMode(nextMode: HomeMode) {
    setMode(nextMode);
    window.history.replaceState(
      null,
      '',
      nextMode === 'video' ? '#video' : '#image'
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectTemplate(templateId: PublishedImageTemplateId) {
    setMode('image');
    requestAnimationFrame(() => {
      window.dispatchEvent(
        new CustomEvent(PICVILO_TEMPLATE_SELECTION_EVENT, {
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
      <nav
        aria-label="Creation mode"
        className="sticky top-[4.25rem] z-30 border-b border-border/70 bg-background/90 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => selectMode('video')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
              mode === 'video'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <IconVideo className="size-4" />{' '}
            {locale === 'zh' ? 'AI 视频创作' : 'AI Video Creator'}
          </button>
          <button
            type="button"
            onClick={() => selectMode('image')}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
              mode === 'image'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <IconPhoto className="size-4" />{' '}
            {locale === 'zh' ? 'PicVilo AI 图片' : 'PicVilo AI Images'}
          </button>
        </div>
      </nav>
      {mode === 'video' ? (
        <Bulin47VideoCreator />
      ) : (
        <>
          <HeroSection />
          <PicviloHomepageSections
            content={content}
            onSelectTemplate={selectTemplate}
          />
        </>
      )}
    </div>
  );
}

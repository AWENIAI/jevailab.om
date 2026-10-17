'use client';

import { Bulin47VideoCreator } from '@/components/blocks/bulin47-video-creator';
import HeroSection from '@/components/blocks/hero';
import { PicviloHomepageSections } from '@/components/blocks/picvilo-homepage-sections';
import {
  getPicviloHomepageContent,
  type PublishedImageTemplateId,
} from '@/content/picvilo-homepage';
import {
  getCreatorTabHash,
  getCreatorTabState,
  type CreatorTabState,
  type CreatorSurface,
  type VideoCreatorTab,
} from '@/lib/home-creator-tabs';
import { PICVILO_TEMPLATE_SELECTION_EVENT } from '@/lib/image-creator/ui-state';
import { getLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { IconMicrophone, IconVideo } from '@tabler/icons-react';
import { useLocation } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export function HomePage() {
  const locale = getLocale() === 'zh' ? 'zh' : 'en';
  const content = getPicviloHomepageContent(locale);
  const location = useLocation();
  const [creatorTab, setCreatorTab] = useState<CreatorTabState>({
    surface: 'video' as const,
    videoTab: 'bulin47' as const,
  });

  useEffect(() => {
    const syncCreatorTab = () =>
      setCreatorTab(getCreatorTabState(window.location.hash));
    syncCreatorTab();
    window.addEventListener('hashchange', syncCreatorTab);
    return () => window.removeEventListener('hashchange', syncCreatorTab);
  }, []);

  useEffect(() => {
    setCreatorTab(getCreatorTabState(location.hash));
  }, [location.hash]);

  function selectCreatorTab(
    surface: CreatorSurface,
    videoTab: VideoCreatorTab = 'bulin47'
  ) {
    const nextTab = { surface, videoTab };
    setCreatorTab(nextTab);
    window.history.replaceState(null, '', getCreatorTabHash(nextTab));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectTemplate(templateId: PublishedImageTemplateId) {
    selectCreatorTab('image');
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
      {creatorTab.surface === 'video' && (
        <nav
          aria-label={locale === 'zh' ? 'AI 视频类型' : 'AI video types'}
          className="sticky top-[4.25rem] z-30 border-b border-border/70 bg-background/90 backdrop-blur"
        >
          <div className="mx-auto flex max-w-7xl gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => selectCreatorTab('video', 'bulin47')}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                creatorTab.videoTab === 'bulin47'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <IconVideo className="size-4" /> Bulin 47 rap AI
            </button>
            <button
              type="button"
              onClick={() => selectCreatorTab('video', 'duet')}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                creatorTab.videoTab === 'duet'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <IconMicrophone className="size-4" /> AI Rap Duet
            </button>
          </div>
        </nav>
      )}
      {creatorTab.surface === 'video' ? (
        <div data-video-workspace={creatorTab.videoTab}>
          <Bulin47VideoCreator />
        </div>
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

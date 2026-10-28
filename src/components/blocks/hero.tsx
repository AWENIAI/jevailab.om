import { m } from '@/locale/paraglide/messages';
import Container from '@/components/layout/container';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import FloatingGallery from '@/components/blocks/floating-gallery';
import {
  getJevailabHomepageContent,
  type PublishedImageTemplateId,
} from '@/content/jevailab-homepage';
import { getLocale } from '@/lib/locale';
import { IconArrowRight, IconPhoto } from '@tabler/icons-react';

type HeroSectionProps = {
  onSelectTemplate?: (templateId: PublishedImageTemplateId) => void;
};

export default function HeroSection({ onSelectTemplate }: HeroSectionProps) {
  const content = getJevailabHomepageContent(getLocale());

  return (
    <section
      id="hero"
      className="relative -mt-[4.25rem] overflow-hidden pt-[4.25rem]"
    >
      <FloatingGallery />
      {/* background, warm-tinted light blobs on top of the hero section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
      >
        <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,oklch(0.85_0.04_55/.12)_0,oklch(0.7_0.02_45/.04)_50%,transparent_80%)]" />
        <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,oklch(0.88_0.05_38/.1)_0,oklch(0.6_0.02_38/.03)_80%,transparent_100%)] [translate:5%_-50%]" />
        <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,oklch(0.9_0.03_65/.08)_0,oklch(0.65_0.015_50/.03)_80%,transparent_100%)]" />
      </div>

      <div
        className="pointer-events-none relative z-10 pt-12"
        style={{ zIndex: 10 }}
      >
        <Container className="px-6">
          <div className="pointer-events-auto text-center sm:mx-auto lg:ms-auto lg:mt-0">
            {/* title */}
            <h1 className="animate-fade-up delay-1 mt-8 text-balance text-3xl font-bold sm:text-4xl md:text-5xl lg:mt-16 xl:text-[4rem]">
              {m.home_hero_title()}
            </h1>

            {/* description */}
            <p className="animate-fade-up delay-2 mx-auto mt-6 max-w-5xl text-balance text-base text-muted-foreground sm:mt-8 sm:text-lg">
              {m.home_hero_description()}
            </p>

            {/* action buttons */}
            <div className="animate-fade-up delay-3 mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-12 sm:gap-4">
              <div className="bg-foreground/10 rounded-xl">
                <Link
                  to="/ai-poster-maker"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-10.5 rounded-xl px-5 text-base'
                  )}
                >
                  <span className="text-nowrap">{m.home_hero_primary()}</span>
                </Link>
              </div>
              <Link
                to="/create"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'h-10.5 rounded-xl px-5'
                )}
              >
                <span className="text-nowrap">{m.home_hero_secondary()}</span>
              </Link>
            </div>
          </div>

          <div className="pointer-events-auto animate-fade-up delay-4 mt-10 sm:mt-14">
            <section
              id="create"
              className="mx-auto max-w-7xl scroll-mt-16 rounded-[2rem] border border-primary/20 bg-card/90 p-5 shadow-xl backdrop-blur-xl sm:p-8"
              aria-labelledby="home-create-title"
            >
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <IconPhoto className="size-6" aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                    {content.tools.imageLabel}
                  </p>
                  <h2
                    id="home-create-title"
                    className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
                  >
                    {content.tools.title}
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                    {content.tools.description}
                  </p>
                  <Link
                    to="/create"
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      'mt-7 h-11 rounded-xl px-5'
                    )}
                  >
                    {content.hero.primaryAction}
                    <IconArrowRight
                      className="size-4 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {content.galleryExamples.slice(0, 3).map((example) => (
                    <button
                      key={example.templateId}
                      type="button"
                      data-template-id={example.templateId}
                      onClick={() => onSelectTemplate?.(example.templateId)}
                      className="group overflow-hidden rounded-2xl border border-border bg-background text-start shadow-sm transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-primary/35"
                    >
                      <img
                        src={example.imageUrl}
                        alt={example.title}
                        width={768}
                        height={1024}
                        loading="lazy"
                        className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="block truncate px-3 py-2 text-xs font-semibold">
                        {example.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </Container>
      </div>
    </section>
  );
}

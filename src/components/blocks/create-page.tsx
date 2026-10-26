'use client';

import AiImageCreatorSection from '@/components/blocks/ai-image-creator';
import { getCreatePageContent } from '@/content/create-page';
import type { PublicImageTemplate } from '@/lib/image-creator/types';
import { getLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import {
  IconArrowRight,
  IconCheck,
  IconDownload,
  IconLock,
  IconPhoto,
  IconSparkles,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

const sectionClassName = 'mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16';
const surfaceClassName =
  'rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-8';

export function CreatePage({
  initialTemplates,
  initialCategories,
}: {
  initialTemplates: PublicImageTemplate[];
  initialCategories: string[];
}) {
  const locale = getLocale();
  const content = getCreatePageContent(locale);

  return (
    <div className="overflow-x-clip">
      <section className="relative px-4 pt-10 pb-6 sm:px-6 sm:pt-14 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] overflow-hidden"
        >
          <div className="absolute -top-48 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/[0.09] blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            {content.hero.eyebrow}
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div>
              <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                {content.hero.h1}
              </h1>
              <p className="mt-5 max-w-3xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                {content.hero.description}
              </p>
            </div>
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <IconSparkles className="size-4" aria-hidden="true" />
                {content.hero.workspaceLabel}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {content.workflow.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <AiImageCreatorSection
          initialTemplates={initialTemplates}
          initialCategories={initialCategories}
        />
      </div>

      <section
        className={sectionClassName}
        aria-labelledby="create-workflow-title"
      >
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-wide text-primary">
            01 — 05
          </p>
          <h2
            id="create-workflow-title"
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {content.workflow.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {content.workflow.description}
          </p>
        </div>
        <ol className="mt-8 grid gap-4 lg:grid-cols-5">
          {content.workflow.steps.map((step, index) => (
            <li key={step.title} className={surfaceClassName}>
              <span className="text-sm font-semibold text-primary">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className={sectionClassName}
        aria-labelledby="create-ratios-title"
      >
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconPhoto className="size-6" aria-hidden="true" />
            </span>
            <h2
              id="create-ratios-title"
              className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {content.ratios.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              {content.ratios.description}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.ratios.items.map((item) => (
              <article key={item.ratio} className={surfaceClassName}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{item.label}</h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {item.ratio}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className={sectionClassName}
        aria-labelledby="create-credits-title"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <article className={cn(surfaceClassName, 'bg-muted/30')}>
            <IconSparkles className="size-5 text-primary" aria-hidden="true" />
            <h2
              id="create-credits-title"
              className="mt-5 text-2xl font-semibold tracking-tight"
            >
              {content.credits.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {content.credits.description}
            </p>
            <div className="mt-5 space-y-3">
              {content.credits.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-6 text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </article>

          <article className={surfaceClassName}>
            <IconLock className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">
              {content.safety.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {content.safety.description}
            </p>
            <ul className="mt-5 space-y-3">
              {content.safety.points.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-6">
                  <IconCheck
                    className="mt-1 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className={sectionClassName}>
        <div className="grid gap-6 rounded-3xl bg-foreground px-5 py-10 text-background sm:px-10 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-background/70">
              <IconDownload className="size-4" aria-hidden="true" />
              {content.download.title}
            </div>
            <p className="mt-4 max-w-3xl text-base leading-7 text-background/75">
              {content.download.description}
            </p>
          </div>
          <Link
            to="/"
            hash="gallery"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-background/85"
          >
            {locale === 'zh' ? '浏览模板示例' : 'Explore templates'}
            <IconArrowRight
              className="size-4 rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
    </div>
  );
}

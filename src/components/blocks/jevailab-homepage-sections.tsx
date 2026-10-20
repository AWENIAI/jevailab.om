'use client';

import {
  IconArrowRight,
  IconBulb,
  IconCheck,
  IconLock,
  IconPhoto,
  IconSparkles,
  IconVideo,
  IconWand,
} from '@tabler/icons-react';
import type {
  JevailabHomepageContent,
  PublishedImageTemplateId,
} from '@/content/jevailab-homepage';
import { JEVAILAB_ANCHORS } from '@/content/jevailab-homepage';
import { Routes } from '@/lib/routes';

type JevailabHomepageSectionsProps = {
  content: JevailabHomepageContent;
  onSelectTemplate: (templateId: PublishedImageTemplateId) => void;
};

const sectionClassName = 'scroll-mt-16 py-14 sm:py-20';
const surfaceClassName =
  'rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm sm:p-8';

export function JevailabHomepageSections({
  content,
  onSelectTemplate,
}: JevailabHomepageSectionsProps) {
  const imageFeature = content.features.find(
    (feature) => feature.kind === 'image'
  );
  const videoFeature = content.features.find(
    (feature) => feature.kind === 'video'
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <section
        id="about"
        className={sectionClassName}
        aria-labelledby="about-title"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary">
              jevailab
            </p>
            <h2
              id="about-title"
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {content.about.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {content.about.description}
            </p>
          </div>
          <ul
            className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1"
            aria-label={content.about.title}
          >
            {content.about.points.map((point) => (
              <li
                key={point}
                className={`${surfaceClassName} flex items-start gap-3 p-4`}
              >
                <IconCheck
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium leading-6">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="gallery"
        className={sectionClassName}
        aria-labelledby="gallery-title"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary">
              {content.gallery.label}
            </p>
            <h2
              id="gallery-title"
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {content.gallery.title}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            {content.gallery.description}
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {content.galleryExamples.map((example) => (
            <button
              key={example.templateId}
              type="button"
              data-template-id={example.templateId}
              onClick={() => onSelectTemplate(example.templateId)}
              className="group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm outline-none transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-primary/35"
            >
              <img
                src={example.imageUrl}
                alt={example.title}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/55 to-transparent px-3 pt-12 pb-3 text-white">
                <p className="text-sm font-semibold">{example.title}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section
        id="features"
        className={sectionClassName}
        aria-labelledby="features-title"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-primary">
            jevailab
          </p>
          <h2
            id="features-title"
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {content.tools.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {content.tools.description}
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {imageFeature ? (
            <a
              href={JEVAILAB_ANCHORS.create}
              className={`${surfaceClassName} group block transition hover:border-primary/55 hover:shadow-lg`}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconPhoto className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-xl font-semibold">
                {imageFeature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {imageFeature.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                {imageFeature.actionLabel}
                <IconArrowRight
                  className="size-4 transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </a>
          ) : null}
          {videoFeature ? (
            <a
              href="#video"
              className={`${surfaceClassName} group relative block overflow-hidden transition hover:border-primary/55 hover:shadow-lg`}
              aria-label={videoFeature.title}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <IconVideo className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-xl font-semibold">
                {videoFeature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {videoFeature.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                {videoFeature.actionLabel ?? content.tools.videoNote}
                <IconArrowRight
                  className="size-4 transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </a>
          ) : null}
        </div>
      </section>

      <section
        id="how-it-works"
        className={sectionClassName}
        aria-labelledby="how-title"
      >
        <div className={`${surfaceClassName} bg-muted/35`}>
          <div className="max-w-xl">
            <p className="text-sm font-semibold tracking-wide text-primary">
              01 · 02 · 03
            </p>
            <h2
              id="how-title"
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {content.howItWorks.title}
            </h2>
          </div>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {content.howItWorks.steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-border/70 bg-background p-5"
              >
                <span className="text-sm font-semibold text-primary">
                  0{index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="use-cases"
        className={sectionClassName}
        aria-labelledby="use-cases-title"
      >
        <h2
          id="use-cases-title"
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {content.useCases.title}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {content.useCases.items.map((item) => (
            <article key={item.title} className={`${surfaceClassName} p-5`}>
              <IconSparkles
                className="size-5 text-primary"
                aria-hidden="true"
              />
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="photo-tips"
        className={sectionClassName}
        aria-labelledby="photo-tips-title"
      >
        <div className="grid gap-6 rounded-3xl border border-border/70 bg-card p-5 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconBulb className="size-6" aria-hidden="true" />
            </span>
            <h2
              id="photo-tips-title"
              className="mt-5 text-2xl font-semibold tracking-tight"
            >
              {content.photoTips.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {content.photoTips.description}
            </p>
          </div>
          <ul className="grid gap-3 self-center">
            {content.photoTips.tips.map((tip) => (
              <li
                key={tip}
                className="flex gap-3 rounded-xl bg-muted/60 p-4 text-sm leading-6"
              >
                <IconCheck
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="tools"
        className={sectionClassName}
        aria-labelledby="tools-title"
      >
        <div className="flex flex-col gap-5 rounded-3xl border border-border/70 bg-muted/35 p-5 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary">
              {content.tools.imageLabel}
            </p>
            <h2
              id="tools-title"
              className="mt-2 text-2xl font-semibold tracking-tight"
            >
              {content.tools.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {content.tools.description}
            </p>
          </div>
          <a
            href={JEVAILAB_ANCHORS.create}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
          >
            {content.hero.primaryAction}
            <IconArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section
        id="pricing"
        className={sectionClassName}
        aria-labelledby="pricing-title"
      >
        <div
          className={`${surfaceClassName} grid gap-6 md:grid-cols-[1fr_auto] md:items-center`}
        >
          <div>
            <div className="flex items-center gap-2 text-primary">
              <IconWand className="size-5" aria-hidden="true" />
              <span className="text-sm font-semibold">jevailab</span>
            </div>
            <h2
              id="pricing-title"
              className="mt-3 text-2xl font-semibold tracking-tight"
            >
              {content.pricing.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {content.pricing.description}
            </p>
          </div>
          <a
            href={Routes.Pricing}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-primary/40 px-4 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            {content.pricing.actionLabel}
          </a>
        </div>
      </section>

      <section
        id="faq"
        className={sectionClassName}
        aria-labelledby="faq-title"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="faq-title"
            className="text-center text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            FAQ
          </h2>
          <div className="mt-8 divide-y divide-border rounded-3xl border border-border/70 bg-card px-5 sm:px-7">
            {content.faq.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-primary/35">
                  {item.question}
                  <IconArrowRight
                    className="size-4 shrink-0 transition group-open:rotate-90"
                    aria-hidden="true"
                  />
                </summary>
                <p className="pt-3 pr-8 text-sm leading-6 text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="start-now"
        className="scroll-mt-16 py-14 sm:py-20"
        aria-labelledby="start-now-title"
      >
        <div className="relative overflow-hidden rounded-3xl bg-primary px-5 py-12 text-primary-foreground sm:px-10 sm:py-16">
          <IconSparkles
            className="absolute -top-5 -right-5 size-28 text-primary-foreground/15"
            aria-hidden="true"
          />
          <div className="relative max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-foreground/80">
              <IconLock className="size-4" aria-hidden="true" />
              Private by default
            </div>
            <h2
              id="start-now-title"
              className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {content.finalCta.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-primary-foreground/80">
              {content.finalCta.description}
            </p>
            <a
              href={JEVAILAB_ANCHORS.create}
              className="mt-7 inline-flex h-10 items-center gap-2 rounded-lg bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-background/85"
            >
              {content.finalCta.actionLabel}
              <IconArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

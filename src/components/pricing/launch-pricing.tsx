import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type {
  LaunchPricingContent,
  LaunchPricingPlan,
} from '@/content/launch-pricing';
import { cn } from '@/lib/utils';
import { IconArrowRight, IconCheck, IconInfoCircle } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

type LaunchPricingProps = {
  content: LaunchPricingContent;
};

const surfaceClassName =
  'rounded-[2rem] border border-border/70 bg-card/80 shadow-sm';

function PlanCard({ plan }: { plan: LaunchPricingPlan }) {
  const featured = plan.id === 'annual';
  return (
    <article
      className={cn(
        'relative flex h-full flex-col overflow-x-clip p-5 sm:p-6 xl:p-7',
        surfaceClassName,
        featured &&
          'border-primary/55 bg-foreground text-background shadow-2xl shadow-primary/15'
      )}
    >
      {featured ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-primary/25 blur-3xl"
        />
      ) : null}
      <div className="relative flex items-start justify-between gap-3">
        <p
          className={cn(
            'text-[0.68rem] font-semibold tracking-[0.18em] text-primary',
            featured && 'text-primary'
          )}
        >
          {plan.eyebrow}
        </p>
        {plan.badge ? (
          <Badge
            variant={featured ? 'default' : 'outline'}
            className={cn(
              'h-6 rounded-full px-2.5 text-[0.68rem]',
              featured && 'border-primary bg-primary text-primary-foreground'
            )}
          >
            {plan.badge}
          </Badge>
        ) : null}
      </div>

      <h3 className="relative mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
        {plan.name}
      </h3>
      <p
        className={cn(
          'relative mt-2 min-h-10 text-sm leading-5 text-muted-foreground sm:min-h-12 sm:leading-6',
          featured && 'text-background/65'
        )}
      >
        {plan.description}
      </p>

      <div className="relative mt-5 flex items-end gap-2">
        {plan.regularPrice ? (
          <span
            className={cn(
              'pb-1.5 text-base font-medium text-muted-foreground line-through decoration-primary/70 decoration-2',
              featured && 'text-background/45'
            )}
          >
            {plan.regularPrice}
          </span>
        ) : null}
        <span className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
          {plan.price}
        </span>
        {plan.priceSuffix ? (
          <span
            className={cn(
              'pb-1.5 text-sm text-muted-foreground',
              featured && 'text-background/60'
            )}
          >
            {plan.priceSuffix}
          </span>
        ) : null}
      </div>
      <div className="relative mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={cn(
            'text-sm font-medium text-foreground',
            featured && 'text-background'
          )}
        >
          {plan.priceNote}
        </span>
        {plan.secondaryPrice ? (
          <span
            className={cn(
              'text-sm text-muted-foreground',
              featured && 'text-background/60'
            )}
          >
            {plan.secondaryPrice}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          'relative my-5 h-px bg-border',
          featured && 'bg-background/15'
        )}
      />

      <ul className="relative space-y-2.5 text-sm leading-5 sm:space-y-3 sm:leading-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <IconCheck
              className={cn(
                'mt-1 size-4 shrink-0 text-primary',
                featured && 'text-primary'
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'text-foreground/85',
                featured && 'text-background/80'
              )}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div className="relative mt-auto pt-6">
        <Link
          to="/pricing"
          className={cn(
            buttonVariants({ size: 'lg' }),
            'h-10 w-full rounded-xl sm:h-11',
            featured &&
              'border-background bg-background text-foreground hover:bg-background/85'
          )}
        >
          {plan.actionLabel}
          <IconArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <p
          className={cn(
            'mt-3 min-h-8 text-xs leading-5 text-muted-foreground sm:min-h-10',
            featured && 'text-background/55'
          )}
        >
          {plan.footnote}
        </p>
      </div>
    </article>
  );
}

export function LaunchPricing({ content }: LaunchPricingProps) {
  return (
    <div className="overflow-x-clip">
      <section className="relative px-4 pt-8 pb-14 sm:px-6 sm:pt-10 sm:pb-20 lg:px-8 xl:pt-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] overflow-hidden"
        >
          <div className="absolute -top-48 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.86_0.07_48/.24),transparent_67%)] blur-2xl dark:bg-[radial-gradient(ellipse_at_center,oklch(0.5_0.1_38/.17),transparent_67%)]" />
          <div className="absolute top-16 -left-40 size-[24rem] rounded-full border border-primary/10 bg-primary/[0.025] blur-3xl" />
          <div className="absolute top-24 -right-44 size-[28rem] rounded-full border border-border/60 bg-card/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.12] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="animate-fade-up delay-1 mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {content.plans.eyebrow}
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-5xl">
              {content.plans.title}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
              {content.plans.description}
            </p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {content.plans.highlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-1.5">
                  <IconCheck
                    className="size-3.5 text-primary"
                    aria-hidden="true"
                  />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>

          <div
            id="plans"
            className="mt-8 grid scroll-mt-24 items-stretch gap-4 sm:mt-10 md:grid-cols-2 lg:grid-cols-3 xl:gap-5"
          >
            {content.plans.items.map((plan, index) => (
              <div
                key={plan.id}
                className={cn(
                  'animate-fade-up h-full',
                  plan.id === 'annual' &&
                    'md:col-span-2 md:mx-auto md:w-full md:max-w-[calc(50%-0.5rem)] lg:col-span-1 lg:mx-0 lg:max-w-none'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <PlanCard plan={plan} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-muted/45 p-5 sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="absolute top-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_20%,var(--primary),transparent_55%)] opacity-[0.08]"
            />
            <div className="relative grid gap-6 md:gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                  {content.comparison.eyebrow}
                </p>
                <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:mt-4 sm:text-3xl lg:text-4xl">
                  {content.comparison.title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:mt-4">
                  {content.comparison.description}
                </p>
              </div>
              <div className="grid gap-3 min-[480px]:grid-cols-2">
                {[content.comparison.left, content.comparison.right].map(
                  (item, index) => (
                    <div
                      key={item.label}
                      className={cn(
                        'rounded-2xl border p-4 sm:p-5',
                        index === 1
                          ? 'border-primary/30 bg-primary text-primary-foreground'
                          : 'border-border/70 bg-background/80'
                      )}
                    >
                      <p
                        className={cn(
                          'text-xs font-semibold tracking-wide uppercase',
                          index === 1
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight sm:mt-4 sm:text-3xl">
                        {item.price}
                      </p>
                      <p
                        className={cn(
                          'mt-2 text-sm leading-6',
                          index === 1
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground'
                        )}
                      >
                        {item.detail}
                      </p>
                    </div>
                  )
                )}
                <Link
                  to="/pricing"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'h-11 rounded-xl min-[480px]:col-span-2'
                  )}
                >
                  {content.comparison.actionLabel}
                  <IconArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8"
        aria-labelledby="launch-faq-title"
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {content.faq.eyebrow}
            </p>
            <h2
              id="launch-faq-title"
              className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:mt-4 sm:text-3xl lg:text-4xl"
            >
              {content.faq.title}
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {content.faq.description}
            </p>
          </div>
          <div className="mt-9">
            <Accordion
              className={cn(
                surfaceClassName,
                'px-5 ring-4 ring-primary/[0.045] sm:px-8'
              )}
            >
              {content.faq.items.map((item, index) => (
                <AccordionItem
                  key={item.question}
                  value={`launch-faq-${index + 1}`}
                  className="border-dashed"
                >
                  <AccordionTrigger className="py-4 text-base hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 rounded-[2rem] border border-primary/20 bg-primary/[0.055] p-5 sm:gap-6 sm:p-7 md:grid-cols-[auto_1fr] md:items-start lg:grid-cols-[auto_1fr_auto] lg:items-center lg:p-9">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconInfoCircle className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {content.notice.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {content.notice.description}
              </p>
              <ul className="mt-4 grid gap-2 text-xs leading-5 text-muted-foreground md:grid-cols-3">
                {content.notice.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <IconCheck
                      className="mt-0.5 size-3.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/pricing"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'h-10 rounded-xl whitespace-nowrap md:col-start-2 md:justify-self-start lg:col-start-3'
              )}
            >
              {content.notice.actionLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-primary px-5 py-10 text-primary-foreground sm:rounded-[2.5rem] sm:px-10 sm:py-16 lg:px-12 lg:py-20">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-16 size-72 rounded-full border-[48px] border-primary-foreground/10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-28 -left-20 size-80 rounded-full bg-primary-foreground/10 blur-3xl"
          />
          <div className="relative max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary-foreground/65 uppercase">
              {content.finalCta.eyebrow}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:mt-4 sm:text-5xl lg:text-6xl">
              {content.finalCta.title}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-primary-foreground/75">
              {content.finalCta.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/"
                hash="create"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-11 rounded-xl bg-background px-5 text-foreground hover:bg-background/85'
                )}
              >
                {content.finalCta.primaryAction}
                <IconArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                to="/pricing"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-11 rounded-xl border-primary-foreground/30 bg-transparent px-5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'
                )}
              >
                {content.finalCta.secondaryAction}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

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
  LaunchPricingPlanId,
  LaunchPricingPlan,
} from '@/content/launch-pricing';
import { getPricePlans } from '@/lib/price-plan';
import type { Locale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { IconArrowRight, IconCheck, IconClock } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { getPathWithLocale } from '@/lib/urls';
import { Routes } from '@/lib/routes';
import { trackAnalyticsEvent } from '@/lib/analytics/events';
import { CheckoutAuthButton } from './checkout-auth-button';

type LaunchPricingProps = {
  content: LaunchPricingContent;
};

const surfaceClassName =
  'rounded-[2rem] border border-border/70 bg-card/80 shadow-sm';

type CheckoutTarget = {
  planId: string;
  priceId: string;
};

type CountdownValue = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  expired: boolean;
};

const countdownUnits = [
  {
    key: 'days',
    zh: '天',
    en: 'D',
    hi: 'दिन',
    es: 'D',
    ar: 'ي',
    fr: 'J',
    de: 'T',
    ja: '日',
    ko: '일',
  },
  {
    key: 'hours',
    zh: '时',
    en: 'H',
    hi: 'घं',
    es: 'H',
    ar: 'س',
    fr: 'H',
    de: 'Std',
    ja: '時',
    ko: '시간',
  },
  {
    key: 'minutes',
    zh: '分',
    en: 'M',
    hi: 'मि',
    es: 'M',
    ar: 'د',
    fr: 'Min',
    de: 'Min',
    ja: '分',
    ko: '분',
  },
  {
    key: 'seconds',
    zh: '秒',
    en: 'S',
    hi: 'से',
    es: 'S',
    ar: 'ث',
    fr: 'S',
    de: 'Sek',
    ja: '秒',
    ko: '초',
  },
] as const;

function getCountdownValue(endsAt: string, now: number): CountdownValue {
  const remaining = Math.max(0, new Date(endsAt).getTime() - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    expired: remaining === 0,
  };
}

function useCountdown(endsAt: string, enabled: boolean) {
  const [countdown, setCountdown] = useState<CountdownValue | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const update = () => setCountdown(getCountdownValue(endsAt, Date.now()));
    update();
    const timer = window.setInterval(update, 1_000);

    return () => window.clearInterval(timer);
  }, [enabled, endsAt]);

  return countdown;
}

function LaunchCountdown({
  endsAt,
  expiredLabel,
  label,
  locale,
}: {
  endsAt: string;
  expiredLabel: string;
  label: string;
  locale: Locale;
}) {
  const countdown = useCountdown(endsAt, true);

  return (
    <div
      className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-3"
      data-testid="launch-countdown"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <IconClock className="size-3.5" aria-hidden="true" />
          {countdown?.expired ? expiredLabel : label}
        </span>
        {countdown ? (
          <div className="flex items-center gap-1.5" role="timer">
            {countdownUnits.map((unit) => (
              <div key={unit.key} className="text-center">
                <span
                  className="flex min-w-8 items-center justify-center rounded-lg bg-background px-1.5 py-1 text-sm font-semibold tabular-nums text-foreground shadow-sm"
                  data-testid={`launch-countdown-${unit.key}`}
                >
                  {countdown[unit.key]}
                </span>
                <span className="mt-1 block text-[0.6rem] text-muted-foreground">
                  {unit[locale]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">--</span>
        )}
      </div>
    </div>
  );
}

const checkoutPlanByLaunchPlan: Record<
  LaunchPricingPlanId,
  { planId: 'pro' | 'lifetime'; interval?: 'month' | 'year' }
> = {
  starter: { planId: 'lifetime' },
  monthly: { planId: 'pro', interval: 'month' },
  annual: { planId: 'pro', interval: 'year' },
};

function getCheckoutTarget(launchPlanId: LaunchPricingPlanId) {
  const mapping = checkoutPlanByLaunchPlan[launchPlanId];
  const plan = getPricePlans()[mapping.planId];
  if (!plan || plan.disabled) return null;

  const price = plan.prices.find(
    (candidate) =>
      !candidate.disabled &&
      candidate.priceId.trim() &&
      (mapping.interval
        ? candidate.type === 'subscription' &&
          candidate.interval === mapping.interval
        : candidate.type === 'one_time')
  );

  return price ? { planId: plan.id, priceId: price.priceId } : null;
}

function LaunchPricingCta({
  children,
  className,
  checkoutTarget,
  dataTestId,
  featured = false,
  variant = 'default',
}: {
  children: ReactNode;
  className?: string;
  checkoutTarget: CheckoutTarget | null;
  dataTestId?: string;
  featured?: boolean;
  variant?: 'default' | 'outline';
}) {
  const ctaClassName = cn(
    buttonVariants({ variant, size: 'lg' }),
    'h-10 rounded-xl sm:h-11',
    featured &&
      'border-background bg-background text-foreground hover:bg-background/85',
    className
  );

  return (
    <CheckoutAuthButton
      planId={checkoutTarget?.planId ?? null}
      priceId={checkoutTarget?.priceId ?? null}
      callbackUrl={getPathWithLocale(Routes.LaunchPricing)}
      variant={variant}
      size="lg"
      className={ctaClassName}
      dataTestId={dataTestId}
    >
      {children}
    </CheckoutAuthButton>
  );
}

function PlanCard({
  locale,
  plan,
}: {
  locale: Locale;
  plan: LaunchPricingPlan;
}) {
  const featured = plan.id === 'annual';
  const promoted = !!plan.discountLabel;
  const checkoutTarget = getCheckoutTarget(plan.id);
  return (
    <article
      data-testid={`launch-plan-${plan.id}`}
      className={cn(
        'relative flex h-full flex-col overflow-x-clip p-5 sm:p-6 xl:p-7',
        surfaceClassName,
        promoted && 'border-primary/45 shadow-lg shadow-primary/10',
        featured &&
          'border-primary/55 bg-foreground text-background shadow-2xl shadow-primary/15'
      )}
    >
      {featured || promoted ? (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -top-24 -right-20 size-64 rounded-full blur-3xl',
            featured ? 'bg-primary/25' : 'bg-primary/15'
          )}
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
        {plan.discountLabel ? (
          <span
            className="inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-[0.68rem] font-bold tracking-wide text-primary-foreground shadow-sm"
            data-testid="launch-starter-discount"
          >
            {plan.discountLabel}
          </span>
        ) : plan.badge ? (
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

      <div className="relative mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
        {plan.regularPrice ? (
          <span
            className={cn(
              'pb-1.5 text-base font-medium text-muted-foreground line-through decoration-primary/70 decoration-2',
              featured && 'text-background/45'
            )}
            data-testid="launch-starter-regular-price"
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
      {plan.regularPrice && plan.discountLabel ? (
        <p className="relative mt-1 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">
            {plan.discountLabel}
          </span>
          {plan.discountNote ? <span> · {plan.discountNote}</span> : null}
        </p>
      ) : null}
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
      {plan.countdownEndsAt ? (
        <div className="relative mt-4">
          <LaunchCountdown
            endsAt={plan.countdownEndsAt}
            expiredLabel={plan.countdownExpiredLabel ?? ''}
            label={plan.countdownLabel ?? ''}
            locale={locale}
          />
        </div>
      ) : null}

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
        <LaunchPricingCta
          checkoutTarget={checkoutTarget}
          dataTestId={`launch-cta-${plan.id}`}
          featured={featured}
          className="w-full"
        >
          {plan.actionLabel}
          <IconArrowRight
            className="size-4 rtl:rotate-180"
            aria-hidden="true"
          />
        </LaunchPricingCta>
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

export function LaunchPricing({
  content,
  locale,
}: LaunchPricingProps & {
  locale: Locale;
}) {
  const annualCheckoutTarget = getCheckoutTarget('annual');

  useEffect(() => {
    trackAnalyticsEvent('pricing_viewed', { locale });
  }, [locale]);

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
                <PlanCard locale={locale} plan={plan} />
              </div>
            ))}
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
                to="/create"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-11 rounded-xl bg-background px-5 text-foreground hover:bg-background/85'
                )}
              >
                {content.finalCta.primaryAction}
                <IconArrowRight
                  className="size-4 rtl:rotate-180"
                  aria-hidden="true"
                />
              </Link>
              <LaunchPricingCta
                variant="outline"
                checkoutTarget={annualCheckoutTarget}
                dataTestId="launch-cta-final"
                className="h-11 border-primary-foreground/30 bg-transparent px-5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                {content.finalCta.secondaryAction}
              </LaunchPricingCta>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

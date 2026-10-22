import { LaunchPricing } from '@/components/pricing/launch-pricing';
import { websiteConfig } from '@/config/website';
import { getLaunchPricingContent } from '@/content/launch-pricing';
import { getLocale } from '@/lib/locale';
import { seo } from '@/lib/seo';
import { faqPageStructuredData } from '@/lib/structured-data';
import { getCanonicalUrlForLocale } from '@/lib/urls';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/launch-pricing')({
  head: () => {
    const locale = getLocale();
    const content = getLaunchPricingContent(locale);
    const metadata = seo('/launch-pricing', {
      title: `${content.meta.title} | ${websiteConfig.metadata?.name}`,
      description: content.meta.description,
    });
    const url = getCanonicalUrlForLocale('/launch-pricing', locale);
    return {
      ...metadata,
      scripts: [
        ...metadata.scripts,
        faqPageStructuredData({
          url,
          items: content.faq.items,
        }),
      ],
    };
  },
  component: LaunchPricingPage,
});

function LaunchPricingPage() {
  const locale = getLocale();
  return (
    <LaunchPricing content={getLaunchPricingContent(locale)} locale={locale} />
  );
}

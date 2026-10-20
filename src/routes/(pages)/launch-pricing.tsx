import { LaunchPricing } from '@/components/pricing/launch-pricing';
import { websiteConfig } from '@/config/website';
import { getLaunchPricingContent } from '@/content/launch-pricing';
import { getLocale } from '@/lib/locale';
import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/launch-pricing')({
  head: () => {
    const content = getLaunchPricingContent(getLocale() === 'zh' ? 'zh' : 'en');
    return seo('/launch-pricing', {
      title: `${content.meta.title} | ${websiteConfig.metadata?.name}`,
      description: content.meta.description,
    });
  },
  component: LaunchPricingPage,
});

function LaunchPricingPage() {
  const locale = getLocale() === 'zh' ? 'zh' : 'en';
  return <LaunchPricing content={getLaunchPricingContent(locale)} />;
}

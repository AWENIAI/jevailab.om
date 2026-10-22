import { CreatePage } from '@/components/blocks/create-page';
import { websiteConfig } from '@/config/website';
import { getCreatePageContent } from '@/content/create-page';
import { getLocale } from '@/lib/locale';
import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/create')({
  head: () => {
    const content = getCreatePageContent(getLocale());
    return seo('/create', {
      title: `${content.meta.title} | ${websiteConfig.metadata?.name}`,
      description: content.meta.description,
    });
  },
  component: CreatePage,
});

import { HomePage } from '@/components/blocks/homepage';
import { websiteConfig } from '@/config/website';
import { getLocale } from '@/lib/locale';
import { seo } from '@/lib/seo';
import { homepageFaqStructuredData } from '@/lib/structured-data';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  head: () => {
    const title = websiteConfig.metadata?.title ?? '';
    const description = websiteConfig.metadata?.description ?? '';
    const metadata = seo('/', { title, description });
    return {
      ...metadata,
      scripts: [...metadata.scripts, homepageFaqStructuredData(getLocale())],
    };
  },
  component: HomePage,
});

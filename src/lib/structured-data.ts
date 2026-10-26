import { websiteConfig } from '@/config/website';
import { getAiPosterMakerContent } from '@/content/ai-poster-maker';
import {
  getJevailabHomepageContent,
  type JevailabLocale,
} from '@/content/jevailab-homepage';
import { getCanonicalUrlForLocale, getImageUrl } from '@/lib/urls';
import { localeConfig, type Locale } from '@/lib/locale';

export function jsonLdScript(data: unknown) {
  return {
    type: 'application/ld+json',
    // Prevent content containing HTML from terminating the script element.
    children: JSON.stringify(data).replace(/</g, '\\u003c'),
  };
}

export function organizationStructuredData(locale: Locale) {
  const url = getCanonicalUrlForLocale('/', locale);
  const logo = websiteConfig.metadata?.images?.logoLight;
  const sameAs = Object.values(websiteConfig.social ?? {}).filter(
    (value): value is string => typeof value === 'string' && !!value
  );
  return {
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name: websiteConfig.metadata?.name ?? '',
    url,
    ...(logo && { logo: getImageUrl(logo) }),
    ...(sameAs.length > 0 && { sameAs }),
  };
}

const PUBLIC_PAGE_TYPES: Record<string, string> = {
  '/': 'WebPage',
  '/about': 'AboutPage',
  '/contact': 'ContactPage',
  '/blog': 'CollectionPage',
  '/changelog': 'CollectionPage',
  '/roadmap': 'WebPage',
  '/waitlist': 'WebPage',
  '/launch-pricing': 'WebPage',
  '/ai-poster-maker': 'WebPage',
  '/pricing': 'WebPage',
  '/privacy': 'WebPage',
  '/terms': 'WebPage',
  '/cookie': 'WebPage',
};

export function pageStructuredData(
  path: string,
  options: {
    url: string;
    title: string;
    description?: string;
    locale: Locale;
  }
) {
  const type =
    PUBLIC_PAGE_TYPES[path] ??
    (path.startsWith('/blog/') ? 'WebPage' : undefined);
  if (!type) return [];
  const home = getCanonicalUrlForLocale('/', options.locale);
  const organization = organizationStructuredData(options.locale);
  const website = {
    '@type': 'WebSite',
    '@id': `${home}#website`,
    url: home,
    name: websiteConfig.metadata?.name ?? '',
    description: websiteConfig.metadata?.description ?? '',
    inLanguage: localeConfig[options.locale].hreflang,
    publisher: { '@id': organization['@id'] },
  };
  return [
    jsonLdScript({
      '@context': 'https://schema.org',
      '@graph': [
        organization,
        website,
        {
          '@type': type,
          '@id': `${options.url}#webpage`,
          url: options.url,
          name: options.title,
          ...(options.description && { description: options.description }),
          inLanguage: localeConfig[options.locale].hreflang,
          isPartOf: { '@id': website['@id'] },
          ...(path === '/about' && { about: { '@id': organization['@id'] } }),
        },
      ],
    }),
  ];
}

export function faqPageStructuredData(options: {
  url: string;
  items: readonly { question: string; answer: string }[];
}) {
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${options.url}#faq`,
    url: options.url,
    mainEntity: options.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  });
}

export function homepageFaqStructuredData(locale: JevailabLocale) {
  return faqPageStructuredData({
    url: getCanonicalUrlForLocale('/', locale),
    items: getJevailabHomepageContent(locale).faq,
  });
}

export function aiPosterMakerStructuredData(options: {
  url: string;
  locale: JevailabLocale;
}) {
  const content = getJevailabHomepageContent(options.locale);
  const posterFaq = getAiPosterMakerContent(options.locale).faq;
  const home = getCanonicalUrlForLocale('/', options.locale);
  const scripts = [
    jsonLdScript({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      '@id': `${options.url}#application`,
      name: 'jevailab AI Poster Maker',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Web',
      url: options.url,
      description: getAiPosterMakerContent(options.locale).meta.description,
      offers: [
        { '@type': 'Offer', name: 'Starter Pack', price: '9.90', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Pro Monthly', price: '19.90', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Pro Annual', price: '149', priceCurrency: 'USD' },
      ],
    }),
    faqPageStructuredData({ url: `${options.url}#faq`, items: posterFaq }),
    jsonLdScript({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: content.hero.eyebrow, item: home },
        { '@type': 'ListItem', position: 2, name: 'AI Poster Maker', item: options.url },
      ],
    }),
  ];
  return scripts;
}

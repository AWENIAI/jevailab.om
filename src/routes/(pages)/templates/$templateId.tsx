import { getImageCreatorTemplates } from '@/api/image-creator';
import { websiteConfig } from '@/config/website';
import { getLocale } from '@/lib/locale';
import { getLocalizedImageTemplate } from '@/lib/image-creator/ui-state';
import {
  getCanonicalUrlForLocale,
  getImageUrl,
  getPathWithLocale,
} from '@/lib/urls';
import { jsonLdScript } from '@/lib/structured-data';
import { seo } from '@/lib/seo';
import { createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/templates/$templateId')({
  loader: async ({ params }) => {
    const result = await getImageCreatorTemplates();
    const template = result.items.find((item) => item.id === params.templateId);
    if (!template) throw notFound();
    return template;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const locale = getLocale();
    const template = getLocalizedImageTemplate(loaderData, locale);
    const path = `/templates/${params.templateId}`;
    const title = `${template.name} AI Poster Template | ${websiteConfig.metadata?.name}`;
    const description = `${template.description} Use this ready-to-use AI poster template in jevailab.`;
    const url = getCanonicalUrlForLocale(path, locale);
    const metadata = seo(path, {
      title,
      description,
      robots: 'noindex,follow',
      keywords: [
        'AI poster template',
        'AI art poster generator',
        'AI image template',
        ...template.tags,
      ].join(', '),
    });

    return {
      ...metadata,
      scripts: [
        ...metadata.scripts,
        jsonLdScript({
          '@context': 'https://schema.org',
          '@type': 'ImageObject',
          name: template.name,
          description,
          contentUrl: getImageUrl(template.exampleUrl),
          thumbnailUrl: getImageUrl(template.coverUrl),
          url,
          representativeOfPage: true,
        }),
        jsonLdScript({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'AI Poster Maker',
              item: getPathWithLocale('/ai-poster-maker', locale),
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: template.name,
              item: url,
            },
          ],
        }),
      ],
    };
  },
  component: ImageTemplatePage,
});

function ImageTemplatePage() {
  const template = Route.useLoaderData();
  const locale = getLocale();
  const localizedTemplate = getLocalizedImageTemplate(template, locale);
  const createHref = `${getPathWithLocale('/create', locale)}?template=${encodeURIComponent(template.id)}`;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 lg:py-20">
      <article className="grid gap-10 lg:grid-cols-[minmax(0,28rem)_1fr] lg:items-start">
        <img
          src={template.exampleUrl}
          alt={localizedTemplate.name}
          className="aspect-[3/4] w-full rounded-3xl object-cover shadow-xl"
          width={900}
          height={1200}
        />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {localizedTemplate.category}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {localizedTemplate.name}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {localizedTemplate.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-8 max-w-xl leading-7 text-muted-foreground">
            {locale === 'zh'
              ? '选择这个已发布风格，补充你的画面描述，再生成一张专属 AI 图片。'
              : 'Start with this published visual direction, add your own description, and create a private AI image.'}
          </p>
          <a
            href={createHref}
            className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85"
          >
            {locale === 'zh' ? '使用此模板创作' : 'Use this template'}
          </a>
        </div>
      </article>
    </main>
  );
}

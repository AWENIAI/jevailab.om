import { websiteConfig } from '@/config/website';
import {
  getAiPosterMakerContent,
  type PosterMakerContent,
} from '@/content/ai-poster-maker';
import { getLocale } from '@/lib/locale';
import { seo } from '@/lib/seo';
import { aiPosterMakerStructuredData } from '@/lib/structured-data';
import { getCanonicalUrlForLocale } from '@/lib/urls';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/ai-poster-maker')({
  head: () => {
    const locale = getLocale();
    const content = getAiPosterMakerContent(locale);
    const metadata = seo('/ai-poster-maker', {
      title: `${content.meta.title} | ${websiteConfig.metadata?.name}`,
      description: content.meta.description,
    });
    return {
      ...metadata,
      scripts: [
        ...metadata.scripts,
        ...aiPosterMakerStructuredData({
          url: getCanonicalUrlForLocale('/ai-poster-maker', locale),
          locale,
        }),
      ],
    };
  },
  component: AiPosterMakerPage,
});

function AiPosterMakerPage() {
  const content = getAiPosterMakerContent(getLocale());
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 lg:py-20">
      <section className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">
          {content.hero.eyebrow}
        </p>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-stone-900 sm:text-6xl">
          {content.hero.h1}
        </h1>
        <p className="mt-7 text-lg leading-8 text-stone-600">
          {content.hero.intro}
        </p>
        <p className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-left text-base leading-7 text-stone-800">
          <strong>{content.hero.answer}</strong>
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a className="rounded-xl bg-orange-700 px-6 py-3 font-semibold text-white" href="/create">
            {content.cta.create}
          </a>
          <a className="rounded-xl border border-stone-300 px-6 py-3 font-semibold text-stone-800" href="/launch-pricing">
            {content.cta.pricing}
          </a>
        </div>
      </section>

      <section className="mt-20" aria-labelledby="poster-examples">
        <h2 id="poster-examples" className="text-3xl font-bold text-stone-900">{content.templatesTitle}</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.templates.map((template) => (
            <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm" key={template.imageUrl}>
              <img className="aspect-[3/4] w-full object-cover" src={template.imageUrl} alt={template.alt} loading="lazy" />
              <div className="p-5">
                <h3 className="text-xl font-semibold text-stone-900">{template.name}</h3>
                <p className="mt-3 leading-7 text-stone-600">{template.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ContentSections content={content} />
    </main>
  );
}

function ContentSections({ content }: { content: PosterMakerContent }) {
  return (
    <>
      <section className="mt-20" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-3xl font-bold text-stone-900">{content.howItWorks.title}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {content.howItWorks.steps.map((step) => (
            <article className="rounded-2xl border border-stone-200 p-6" key={step.title}>
              <h3 className="text-xl font-semibold text-stone-900">{step.title}</h3>
              <p className="mt-3 leading-7 text-stone-600">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-20" aria-labelledby="sizes">
        <h2 id="sizes" className="text-3xl font-bold text-stone-900">{content.sizes.title}</h2>
        <p className="mt-4 max-w-3xl leading-7 text-stone-600">{content.sizes.intro}</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-stone-100 text-stone-900"><tr><th className="p-4">Format</th><th className="p-4">Ratio</th><th className="p-4">Best for</th></tr></thead>
            <tbody>{content.sizes.rows.map((row) => <tr className="border-t border-stone-200" key={row.format}><td className="p-4 font-semibold">{row.format}</td><td className="p-4">{row.ratio}</td><td className="p-4">{row.use}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="mt-20" aria-labelledby="occasions">
        <h2 id="occasions" className="text-3xl font-bold text-stone-900">{content.occasions.title}</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.occasions.items.map((item) => <article className="rounded-2xl bg-stone-100 p-6" key={item.title}><h3 className="text-xl font-semibold text-stone-900">{item.title}</h3><p className="mt-3 leading-7 text-stone-600">{item.text}</p></article>)}
        </div>
      </section>

      <section className="mt-20" aria-labelledby="pricing">
        <h2 id="pricing" className="text-3xl font-bold text-stone-900">{content.pricing.title}</h2>
        <p className="mt-4 max-w-3xl leading-7 text-stone-600">{content.pricing.text}</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">{content.pricing.items.map((item) => <li className="rounded-xl border border-stone-200 p-5 leading-7 text-stone-700" key={item}>{item}</li>)}</ul>
      </section>

      <section className="mt-20" aria-labelledby="comparison">
        <h2 id="comparison" className="text-3xl font-bold text-stone-900">{content.comparison.title}</h2>
        <p className="mt-4 max-w-3xl leading-7 text-stone-600">{content.comparison.intro}</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-stone-100"><tr><th className="p-4">Tool</th><th className="p-4">Strength</th><th className="p-4">Tradeoff</th></tr></thead><tbody>{content.comparison.rows.map((row) => <tr className="border-t border-stone-200" key={row.tool}><td className="p-4 font-semibold">{row.tool}</td><td className="p-4">{row.strength}</td><td className="p-4">{row.tradeoff}</td></tr>)}</tbody></table></div>
      </section>

      <section className="mt-20" id="faq" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-3xl font-bold text-stone-900">{content.faqTitle}</h2>
        <div className="mt-6 divide-y divide-stone-200 rounded-2xl border border-stone-200">{content.faq.map((item) => <details className="group p-5" key={item.question}><summary className="cursor-pointer font-semibold text-stone-900">{item.question}</summary><p className="mt-3 max-w-4xl leading-7 text-stone-600">{item.answer}</p></details>)}</div>
      </section>

      <section className="mt-20 rounded-3xl bg-stone-900 p-8 text-white sm:p-12">
        <h2 className="text-3xl font-bold">{content.cta.title}</h2>
        <p className="mt-4 max-w-2xl leading-7 text-stone-300">{content.cta.text}</p>
        <div className="mt-8 flex flex-wrap gap-4"><a className="rounded-xl bg-orange-600 px-6 py-3 font-semibold" href="/create">{content.cta.create}</a><a className="rounded-xl border border-stone-600 px-6 py-3 font-semibold" href="/launch-pricing">{content.cta.pricing}</a></div>
      </section>
    </>
  );
}

import { m } from '@/locale/paraglide/messages';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
const logos = [
  {
    src: 'https://cdn.simpleicons.org/nvidia',
    alt: 'Nvidia Logo',
    h: 'h-5',
  },
  {
    src: 'https://cdn.simpleicons.org/column',
    alt: 'Column Logo',
    h: 'h-4',
  },
  {
    src: 'https://cdn.simpleicons.org/github',
    alt: 'GitHub Logo',
    h: 'h-4',
  },
  { src: 'https://cdn.simpleicons.org/nike', alt: 'Nike Logo', h: 'h-5' },
  {
    src: 'https://cdn.simpleicons.org/laravel',
    alt: 'Laravel Logo',
    h: 'h-4',
  },
  { src: 'https://cdn.simpleicons.org/lilly', alt: 'Lilly Logo', h: 'h-7' },
  {
    src: 'https://cdn.simpleicons.org/lemonsqueezy',
    alt: 'Lemon Squeezy Logo',
    h: 'h-5',
  },
  {
    src: 'https://cdn.simpleicons.org/openai',
    alt: 'OpenAI Logo',
    h: 'h-6',
  },
  {
    src: 'https://cdn.simpleicons.org/tailwindcss',
    alt: 'Tailwind CSS Logo',
    h: 'h-4',
  },
  {
    src: 'https://cdn.simpleicons.org/vercel',
    alt: 'Vercel Logo',
    h: 'h-5',
  },
  {
    src: 'https://cdn.simpleicons.org/zapier',
    alt: 'Zapier Logo',
    h: 'h-5',
  },
];
export default function LogoCloudSection() {
  return (
    <section
      id="logo-cloud"
      className="relative overflow-hidden px-4 py-16 md:py-24"
    >
      <div className="absolute inset-0 bg-linear-to-b from-muted/60 to-transparent" />
      <div className="relative mx-auto max-w-5xl px-6">
        <ScrollReveal>
          <h2 className="text-center text-xl font-medium">
            {m.home_logo_cloud_title()}
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={150}>
          <div className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16 sm:gap-y-12">
            {logos.map((logo) => (
              <img
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                className={`${logo.h} w-fit dark:invert`}
                loading="lazy"
                height={24}
              />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

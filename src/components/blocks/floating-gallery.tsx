import { cn } from '@/lib/utils';
import { m } from '@/locale/paraglide/messages';
import { useState } from 'react';

const GALLERY_IMAGES = [
  '/images/hero-gallery/1.png',
  '/images/hero-gallery/2.png',
  '/images/hero-gallery/3.png',
  '/images/hero-gallery/4.png',
  '/images/hero-gallery/5.png',
  '/images/hero-gallery/6.png',
] as const;

const SLOTS = [
  { left: '-3%', top: '6%', width: 'clamp(7rem, 12vw, 11rem)' },
  {
    left: '7%',
    top: '52%',
    width: 'clamp(8rem, 13vw, 12rem)',
  },
  { left: '17%', top: '2%', width: 'clamp(7rem, 11vw, 10rem)' },
  {
    left: '72%',
    top: '48%',
    width: 'clamp(8rem, 13vw, 12rem)',
  },
  {
    left: '82%',
    top: '10%',
    width: 'clamp(7rem, 12vw, 11rem)',
  },
  {
    left: '94%',
    top: '57%',
    width: 'clamp(6rem, 10vw, 9rem)',
  },
] as const;

/** Decorative, interactive hero background using the user's gallery images. */
export default function FloatingGallery() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 top-0 z-0 h-[32rem] overflow-hidden lg:h-[34rem]"
      onClick={() => setSelected(null)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--background)/0.92)_0%,hsl(var(--background)/0.7)_48%,transparent_82%)]" />
      {GALLERY_IMAGES.map((src, index) => {
        const slot = SLOTS[index];
        const isSelected = selected === index;

        return (
          <button
            key={src}
            type="button"
            aria-label={m.common_zoom_image()}
            onClick={(event) => {
              event.stopPropagation();
              setSelected(isSelected ? null : index);
            }}
            className={cn(
              'absolute overflow-hidden rounded-2xl border border-white/20 bg-muted shadow-2xl transition-[width,height,left,top,transform,filter] duration-500 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary',
              !isSelected && 'hero-gallery-float opacity-35 hover:opacity-70'
            )}
            style={
              isSelected
                ? {
                    left: '50%',
                    top: '50%',
                    width: 'min(42rem, 76vw)',
                    aspectRatio: '3 / 4',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20,
                  }
                : {
                    left: slot.left,
                    top: slot.top,
                    width: slot.width,
                    aspectRatio: '3 / 4',
                    animationDelay: `${index * -3.2}s`,
                    zIndex: index + 1,
                  }
            }
          >
            <img
              src={src}
              alt={m.common_generated_image_example()}
              className="size-full object-cover"
              draggable={false}
              loading={index < 2 ? 'eager' : 'lazy'}
            />
          </button>
        );
      })}
    </div>
  );
}

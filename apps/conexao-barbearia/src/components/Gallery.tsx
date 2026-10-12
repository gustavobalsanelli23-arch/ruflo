import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { gallery } from '../data/site';
import { Lightbox } from './Lightbox';
import { Picture } from './ui/Picture';
import { Reveal } from './ui/Reveal';
import { SectionHeader } from './ui/SectionHeader';

const ratioClass = {
  square: 'aspect-square',
  portrait: 'aspect-[4/5]',
  tall: 'aspect-[2/3]',
} as const;

export function Gallery() {
  const [index, setIndex] = useState<number | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  const close = () => {
    const last = index;
    setIndex(null);
    if (last !== null) requestAnimationFrame(() => triggers.current[last]?.focus());
  };

  return (
    <section id="galeria" aria-labelledby="galeria-title" className="relative bg-graphite py-24 md:py-32 lg:py-40">
      <div className="container-x">
        <SectionHeader
          id="galeria-title"
          index="03"
          label="Galeria"
          title={
            <>
              Estilo que <span className="font-normal italic text-gold">fala por si.</span>
            </>
          }
          intro="Trabalhos reais, feitos pelos nossos barbeiros em clientes da Conexão. Toque em uma foto para ampliar."
        />

        <ul className="mt-16 columns-2 gap-3 sm:gap-4 md:mt-20 md:columns-3 lg:columns-4 lg:gap-5">
          {gallery.map((item, i) => (
            <li key={item.name} className="mb-3 break-inside-avoid sm:mb-4 lg:mb-5">
              <Reveal delay={(i % 4) * 0.06} y={36}>
                <button
                  ref={(el) => {
                    triggers.current[i] = el;
                  }}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Ampliar foto: ${item.caption}`}
                  className={`group relative block w-full cursor-zoom-in overflow-hidden bg-ink ${ratioClass[item.ratio]}`}
                >
                  <Picture
                    image={item}
                    sizes="(min-width: 1024px) 22vw, (min-width: 768px) 31vw, 48vw"
                    className="photo-mono h-full w-full object-cover group-hover:scale-[1.05]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-ink/80 via-ink/0 to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <span className="font-display text-lg italic leading-tight text-bone">{item.caption}</span>
                    <span className="flex size-9 shrink-0 items-center justify-center border border-bone/40 text-bone">
                      <Plus className="size-4" strokeWidth={1.5} />
                    </span>
                  </span>
                </button>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>

      <Lightbox items={gallery} index={index} onClose={close} onIndexChange={setIndex} />
    </section>
  );
}

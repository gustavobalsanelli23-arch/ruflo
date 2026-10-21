import { useState } from 'react';
import { business, gallery, links } from '../data/site';
import { Lightbox } from './Lightbox';
import { ArrowUpRight, PlusIcon } from './ui/Icons';
import { Picture } from './ui/Picture';
import { Reveal, RevealImage, RevealLines } from './ui/Reveal';
import { SectionLabel } from './ui/SectionLabel';

/** Distribui as fotos em colunas desencontradas (determinístico: igual no servidor e no cliente). */
function columns<T>(items: T[], count: number) {
  const cols: { item: T; index: number }[][] = Array.from({ length: count }, () => []);
  items.forEach((item, index) => cols[index % count].push({ item, index }));
  return cols;
}

const desktopOffsets = ['', 'lg:mt-28', 'lg:mt-12'];
const tilts = ['-rotate-[0.8deg]', 'rotate-[0.6deg]', '-rotate-[0.4deg]', 'rotate-[1deg]'];

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);

  const tile = (item: (typeof gallery)[number], index: number) => (
    <RevealImage key={item.name} delay={(index % 3) * 0.08}>
      <figure className={`${tilts[index % tilts.length]} transition-transform duration-500 hover:rotate-0`}>
        <button
          type="button"
          onClick={() => setOpen(index)}
          className="group grain relative block w-full overflow-hidden border-[5px] border-chalk bg-chalk text-left"
          aria-label={`Ampliar foto: ${item.alt}`}
        >
          <Picture
            image={item}
            sizes="(min-width: 1024px) 30vw, 50vw"
            className="photo-bw h-auto w-full object-cover group-hover:scale-[1.05]"
          />
          <span className="absolute right-3 top-3 grid size-11 place-items-center bg-chalk text-ink opacity-0 transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            <PlusIcon className="size-5" />
          </span>
        </button>
        <figcaption className="tag mt-3 flex items-center gap-3 text-smoke">
          <span className="text-chalk">{String(index + 1).padStart(2, '0')}</span>
          {item.caption ?? 'Corte'}
        </figcaption>
      </figure>
    </RevealImage>
  );

  return (
    <section id="cortes" aria-labelledby="cortes-title" className="relative overflow-hidden bg-ink py-20 md:py-32">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <SectionLabel index="03">Galeria</SectionLabel>
            <h2 id="cortes-title" className="poster mt-6 text-[clamp(4rem,12vw,11rem)] text-chalk">
              <RevealLines lines={['Cortes', <span className="poster-outline">assinados.</span>]} />
            </h2>
          </div>
          <Reveal delay={0.1} className="lg:col-span-4 lg:pb-4">
            <p className="max-w-sm text-pretty text-smoke">
              Trabalhos reais do {business.barber}, publicados no Instagram da {business.name}. Toque em uma foto para ampliar.
            </p>
          </Reveal>
        </div>

        {/* Mobile/tablet: duas colunas desencontradas */}
        <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-0 sm:gap-x-6 lg:hidden">
          {columns(gallery, 2).map((col, c) => (
            <div key={c} className={`flex flex-col gap-8 ${c === 1 ? 'mt-14' : ''}`}>
              {col.map(({ item, index }) => tile(item, index))}
            </div>
          ))}
        </div>

        {/* Desktop: três colunas com alturas desencontradas */}
        <div className="mt-20 hidden grid-cols-3 gap-10 lg:grid xl:gap-14">
          {columns(gallery, 3).map((col, c) => (
            <div key={c} className={`flex flex-col gap-14 ${desktopOffsets[c]}`}>
              {col.map(({ item, index }) => tile(item, index))}
            </div>
          ))}
        </div>

        <Reveal className="mt-16 flex justify-center">
          <a href={links.instagram} target="_blank" rel="noopener" className="btn btn-line">
            Ver mais no Instagram
            <ArrowUpRight className="btn-arrow size-4" />
          </a>
        </Reveal>
      </div>

      <Lightbox items={gallery} index={open} onClose={() => setOpen(null)} onIndexChange={setOpen} />
    </section>
  );
}

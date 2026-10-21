import { useRef, useState, type ReactNode } from 'react';
import { gallery, links, messages, whatsappLink, type GalleryItem } from '../data/site';
import { BeforeAfter } from './BeforeAfter';
import { Lightbox } from './Lightbox';
import { ArrowIcon, ArrowUpRightIcon, InstagramIcon } from './ui/Icons';
import { Picture } from './ui/Picture';
import { Reveal } from './ui/Reveal';
import { SectionHeading } from './ui/SectionHeading';

const shapeClass: Record<GalleryItem['shape'], string> = {
  tall: 'aspect-[3/4.4]',
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
};

/** Distribui os itens em colunas mantendo a ordem de leitura linha a linha. */
function columns<T>(items: T[], count: number) {
  return Array.from({ length: count }, (_, c) =>
    items.map((item, i) => ({ item, i })).filter(({ i }) => i % count === c),
  );
}

function Tile({
  item,
  index,
  onOpen,
}: {
  item: GalleryItem;
  index: number;
  onOpen: (i: number, el: HTMLElement) => void;
}) {
  return (
    <Reveal y={36} delay={(index % 3) * 0.1}>
      <button
        type="button"
        onClick={(e) => onOpen(index, e.currentTarget)}
        className="group relative block w-full overflow-hidden bg-cafe text-left"
        aria-label={`Ampliar foto: ${item.caption}, ${item.date}`}
      >
        <div className={`${shapeClass[item.shape]} overflow-hidden`}>
          <Picture image={item} sizes="(min-width: 1024px) 30vw, 50vw" className="photo-zoom size-full object-cover" />
        </div>
        {/* Moldura interna e legenda que surgem no hover */}
        <span
          className="pointer-events-none absolute inset-3 border border-ivory/0 transition-colors duration-700 group-hover:border-ivory/45 group-focus-visible:border-ivory/45"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent p-4 pt-16 transition-all duration-700 ease-[var(--ease-editorial)] md:translate-y-3 md:p-6 md:pt-20 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100"
          aria-hidden="true"
        >
          <span className="font-display text-lg italic leading-tight text-ivory md:text-[1.375rem]">
            {item.caption}
          </span>
          <span className="hidden shrink-0 text-[0.5625rem] font-medium uppercase tracking-[0.3em] text-ivory/75 sm:block">
            {item.date}
          </span>
        </span>
      </button>
    </Reveal>
  );
}

export function Results() {
  const [index, setIndex] = useState<number | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const open = (i: number, el: HTMLElement) => {
    trigger.current = el;
    setIndex(i);
  };
  const close = () => {
    setIndex(null);
    // Devolve o foco à miniatura que abriu o lightbox.
    requestAnimationFrame(() => trigger.current?.focus());
  };

  const grid = (count: number, offsets: string[], closing?: ReactNode) => {
    const cols = columns(gallery, count);
    // A coluna mais curta recebe o bloco de fechamento, equilibrando a grade.
    const shortest = cols.reduce((min, col, c) => (col.length < cols[min].length ? c : min), cols.length - 1);
    return (
      <div className="flex gap-3 md:gap-5">
        {cols.map((col, c) => (
          <div key={c} className={`flex flex-1 flex-col gap-3 md:gap-5 ${offsets[c] ?? ''}`}>
            {col.map(({ item, i }) => (
              <Tile key={`${item.name}-${i}`} item={item} index={i} onOpen={open} />
            ))}
            {c === shortest && closing}
          </div>
        ))}
      </div>
    );
  };

  const instagramTile = (
    <Reveal y={36} delay={0.2}>
      <a
        href={links.instagram}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex aspect-square flex-col justify-between border border-ivory/15 p-7 transition-colors duration-700 hover:border-gold/60 hover:bg-ivory/[0.03]"
      >
        <InstagramIcon className="size-6 text-gold" />
        <span>
          <span className="block font-display text-[2rem] leading-[1.05] text-ivory">
            Mais resultados <em className="italic text-gold">no Instagram</em>
          </span>
          <span className="link-line mt-5 text-[0.625rem] font-medium uppercase tracking-[0.28em] text-ivory/70 transition-colors group-hover:text-ivory">
            {links.instagramHandle}
            <ArrowUpRightIcon className="size-2.5" />
          </span>
        </span>
      </a>
    </Reveal>
  );

  return (
    <section
      id="resultados"
      aria-labelledby="resultados-titulo"
      className="relative bg-espresso py-24 text-ivory md:py-36"
    >
      <div className="container-x">
        <SectionHeading
          id="resultados-titulo"
          index="03"
          label="Resultados reais"
          tone="dark"
          lines={[
            'O brilho que',
            <>
              se vê <em className="italic text-gold">no espelho.</em>
            </>,
          ]}
          intro="Trabalhos realizados no estúdio e publicados no nosso Instagram. Toque em uma foto para ampliar."
        />

        <div className="mt-16 md:mt-24">
          {/* Duas colunas no celular, três a partir do lg — com deslocamento editorial entre colunas. */}
          <div className="lg:hidden">{grid(2, ['', 'mt-14'])}</div>
          <div className="hidden lg:block">{grid(3, ['', 'mt-28', 'mt-12'], instagramTile)}</div>
        </div>

        <Reveal className="mt-14 flex flex-col items-start gap-6 border-t border-ivory/12 pt-10 md:flex-row md:items-center md:justify-between">
          <p className="max-w-md font-display text-[1.75rem] leading-[1.15] text-ivory">
            Quer um resultado assim? <em className="italic text-gold">Vamos conversar.</em>
          </p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
            <a
              href={whatsappLink(messages.results)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-light"
            >
              Agende sua experiência
              <ArrowIcon className="btn-arrow h-3 w-7" />
            </a>
            <a
              href={links.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="link-line self-start text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-ivory sm:self-auto"
            >
              <InstagramIcon className="size-4" />
              Ver mais no Instagram
            </a>
          </div>
        </Reveal>

        <div className="mt-28 border-t border-ivory/12 pt-20 md:mt-36 md:pt-28">
          <BeforeAfter />
        </div>
      </div>

      <Lightbox items={gallery} index={index} onClose={close} onIndexChange={setIndex} />
    </section>
  );
}

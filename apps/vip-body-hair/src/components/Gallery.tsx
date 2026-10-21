import { useCallback, useState } from 'react';
import { gallery, links, type GalleryItem } from '../data/site';
import { Lightbox } from './Lightbox';
import { ArrowUpRight, Instagram, Plus } from './ui/Icons';
import { Picture } from './ui/Picture';
import { Reveal } from './ui/Reveal';
import { SectionHeader } from './ui/SectionHeader';

const aspect = { tall: 'aspect-[9/16]', portrait: 'aspect-[4/5]', square: 'aspect-square' } as const;
const ratio = { tall: 16 / 9, portrait: 5 / 4, square: 1 } as const;

/**
 * Reparte as fotos em `n` colunas (mantendo a ordem dentro de cada coluna) com a
 * menor diferença possível de altura. Busca exaustiva com poda: a galeria é curta.
 */
function balance(items: GalleryItem[], n: number) {
  const h = items.map((it) => ratio[it.shape]);
  let best: number[] = [];
  let bestSpread = Infinity;
  const sums = new Array<number>(n).fill(0);
  const pick: number[] = [];
  const walk = (i: number) => {
    if (i === items.length) {
      const spread = Math.max(...sums) - Math.min(...sums);
      if (spread < bestSpread) {
        bestSpread = spread;
        best = [...pick];
      }
      return;
    }
    for (let c = 0; c < n; c++) {
      // Colunas vazias são equivalentes: basta testar a primeira delas.
      if (sums[c] === 0 && c > 0 && sums[c - 1] === 0) break;
      sums[c] += h[i];
      if (Math.max(...sums) - Math.min(...sums) < bestSpread + 2) {
        pick.push(c);
        walk(i + 1);
        pick.pop();
      }
      sums[c] -= h[i];
    }
  };
  walk(0);
  const cols = Array.from({ length: n }, () => [] as { item: GalleryItem; index: number }[]);
  best.forEach((c, index) => cols[c].push({ item: items[index], index }));
  return cols;
}

/** Layouts por largura de tela; só um fica visível (os demais ficam com display: none). */
const layouts = [
  { n: 2, className: 'grid grid-cols-2 gap-3 md:hidden' },
  { n: 3, className: 'hidden grid-cols-3 gap-5 md:grid lg:hidden' },
  { n: 4, className: 'hidden grid-cols-4 gap-5 lg:grid' },
].map((l) => ({ ...l, columns: balance(gallery, l.n) }));

export function Gallery() {
  const [index, setIndex] = useState<number | null>(null);
  const close = useCallback(() => setIndex(null), []);

  return (
    <section id="galeria" aria-labelledby="galeria-titulo" className="grain relative bg-ink py-24 text-bone md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <SectionHeader
          id="galeria-titulo"
          index="05"
          eyebrow="Galeria"
          tone="dark"
          title={[
            'Por dentro',
            <>
              do <em>VIP.</em>
            </>,
          ]}
          intro={<p>Resultados, bastidores e o dia a dia do salão — imagens publicadas pelo próprio VIP body &amp; hair.</p>}
        />

        <div className="mt-16 md:mt-24">
          {layouts.map(({ n, className, columns }) => (
            <div key={n} className={className}>
              {columns.map((col, c) => (
                <ul key={c} className="flex flex-col gap-3 md:gap-5">
                  {col.map(({ item: g, index: i }, k) => (
                    <Reveal as="li" key={g.image.name} delay={c * 0.06} className={k === col.length - 1 ? 'flex flex-1 flex-col' : undefined}>
                      <button
                        type="button"
                        onClick={() => setIndex(i)}
                        className="group relative block w-full flex-1 overflow-hidden text-left"
                        aria-label={`Ampliar foto: ${g.caption}`}
                      >
                        <span className={`zoom-img block ${k === col.length - 1 ? 'h-full [&>picture]:block [&>picture]:h-full' : ''}`}>
                          <Picture
                            image={g.image}
                            sizes={`${Math.round(96 / n)}vw`}
                            className={`${aspect[g.shape]} w-full object-cover ${k === col.length - 1 ? 'h-full' : ''}`}
                          />
                        </span>
                        <span className="absolute inset-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ink/75 via-transparent to-transparent p-3 opacity-100 transition-opacity duration-500 md:p-4 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
                          <span className="eyebrow text-[0.5rem] leading-relaxed md:text-[0.55rem]">{g.caption}</span>
                          <Plus width={16} height={16} className="shrink-0" />
                        </span>
                      </button>
                    </Reveal>
                  ))}
                </ul>
              ))}
            </div>
          ))}
        </div>

        <Reveal className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-bone/15 pt-10 sm:flex-row sm:items-center">
          <p className="display text-2xl md:text-3xl">
            Novidades toda semana no <em>{links.instagramHandle}</em>
          </p>
          <a href={links.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-outline-light">
            <Instagram width={18} height={18} />
            Seguir no Instagram
            <ArrowUpRight width={14} height={14} className="btn-arrow" />
          </a>
        </Reveal>
      </div>

      <Lightbox items={gallery} index={index} onClose={close} onIndex={setIndex} />
    </section>
  );
}

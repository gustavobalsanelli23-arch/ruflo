'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product, Team } from '@/types/catalog';
import { teams } from '@/data/teams';
import { cn } from '@/lib/format';
import { SectionHeading } from '@/components/ui/Feedback';
import { ShelfLink } from './ShelfLink';

/** Quantos times entram na fileira; o resto fica a um clique, em /times. */
const MAX_TEAMS = 18;

const plural = (n: number) => `${n} ${n === 1 ? 'modelo' : 'modelos'}`;

/** Origem curta na plaquinha: seleção, país do clube ou nada quando o fornecedor não informa. */
function origin(team: Team): string | null {
  if (team.kind === 'selecao') return 'Seleção';
  return team.country === 'Outros' ? null : team.country;
}

/**
 * Liga/desliga as setas olhando as pontas da fileira com IntersectionObserver
 * (nada roda a cada quadro de rolagem).
 */
function useRailEnds(rail: React.RefObject<HTMLUListElement | null>, count: number) {
  const [ends, setEnds] = useState({ start: true, end: false });
  useEffect(() => {
    const el = rail.current;
    const first = el?.firstElementChild;
    const last = el?.lastElementChild;
    if (!el || !first || !last || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = entry.target === first ? 'start' : 'end';
          setEnds((prev) => ({ ...prev, [key]: entry.intersectionRatio > 0.9 }));
        }
      },
      { root: el, threshold: [0, 0.9, 1] },
    );
    io.observe(first);
    io.observe(last);
    return () => io.disconnect();
  }, [rail, count]);
  return ends;
}

/**
 * Parede de plaquinhas: os times do catálogo em estêncil, numa fileira que
 * continua a parede de armários do hero. Ordenados pelo número de camisas.
 */
export function TeamsRail({ products, className }: { products: Product[]; className?: string }) {
  const rail = useRef<HTMLUListElement>(null);

  const list = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of products) count.set(p.teamId, (count.get(p.teamId) ?? 0) + 1);
    return teams
      .map((team) => ({ team, count: count.get(team.id) ?? 0 }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count || a.team.name.localeCompare(b.team.name, 'pt-BR'))
      .slice(0, MAX_TEAMS);
  }, [products]);

  const ends = useRailEnds(rail, list.length);

  const scroll = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  };

  if (list.length === 0) return null;

  const arrow =
    'grid size-10 place-items-center rounded-[var(--radius-button)] border border-line-strong text-fg-2 transition-[color,border-color,opacity,transform] duration-150 hover:border-fg-2 hover:text-fg active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35';

  return (
    <section className={cn('container-fz', className)}>
      <SectionHeading
        title="Encontre seu time"
        action={
          <div className="flex items-center gap-3">
            <div className="hidden gap-1.5 lg:flex">
              <button type="button" onClick={() => scroll(-1)} disabled={ends.start} aria-label="Times anteriores" className={arrow}>
                <ChevronLeft className="size-4" strokeWidth={1.75} />
              </button>
              <button type="button" onClick={() => scroll(1)} disabled={ends.end} aria-label="Próximos times" className={arrow}>
                <ChevronRight className="size-4" strokeWidth={1.75} />
              </button>
            </div>
            <ShelfLink href="/times" label="Ver todos os times" />
          </div>
        }
      />
      <ul
        ref={rail}
        aria-label="Times"
        className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0 lg:gap-2.5"
      >
        {list.map(({ team, count }) => {
          const from = origin(team);
          return (
            <li key={team.id} className="w-[46%] shrink-0 snap-start sm:w-[28%] md:w-[22%] lg:w-[calc((100%-4*0.625rem)/5)] xl:w-[calc((100%-5*0.625rem)/6)]">
              <Link
                href={`/camisas/${team.slug}`}
                className="locker group relative flex h-28 flex-col justify-between rounded-[var(--radius-card)] p-3.5 transition-[border-color,background-color] duration-200 hover:border-line-strong active:bg-steel-3 sm:h-32 sm:p-4"
              >
                {/* Luz da plaquinha: acende ao apontar, como os armários */}
                <span aria-hidden className="absolute inset-x-[18%] -top-px h-[2px] bg-light opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
                <span className="plate line-clamp-2 text-[1.15rem] leading-[1.02] text-fg [overflow-wrap:anywhere] xl:text-[1.3rem]">{team.name}</span>
                <span className="flex items-end justify-between gap-2 text-xs">
                  <span className="truncate text-muted">{from}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-fg-2">{plural(count)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

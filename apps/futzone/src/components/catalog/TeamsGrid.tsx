'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Team, TeamKind } from '@/types/catalog';
import { teams } from '@/data/teams';
import { usePublicProducts } from '@/context/StoreDataContext';
import { cn } from '@/lib/format';

const GROUPS: Array<{ kind: TeamKind; title: string; noun: [string, string] }> = [
  { kind: 'clube', title: 'Clubes', noun: ['clube', 'clubes'] },
  { kind: 'selecao', title: 'Seleções', noun: ['seleção', 'seleções'] },
];

/**
 * Parede de placas: um armário sem foto por time, com o nome em estêncil,
 * o país e quantas camisas publicadas ele tem. A luz acende no armário em
 * foco ou sob o mouse.
 */
export function TeamsGrid() {
  const products = usePublicProducts();
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => map.set(p.teamId, (map.get(p.teamId) ?? 0) + 1));
    return map;
  }, [products]);

  return (
    <div className="space-y-14 sm:space-y-20">
      {GROUPS.map((g) => {
        const list = teams.filter((t) => t.kind === g.kind);
        if (list.length === 0) return null;
        const headingId = `times-${g.kind}`;
        return (
          <section key={g.kind} aria-labelledby={headingId}>
            <div className="shelf-line mb-4 flex items-end justify-between gap-6 pb-3 sm:mb-6 sm:pb-4">
              <h2 id={headingId} className="heading-display text-[2rem] text-fg sm:text-[2.5rem]">
                {g.title}
              </h2>
              <p className="pb-1 text-sm tabular-nums text-muted">
                {list.length} {list.length === 1 ? g.noun[0] : g.noun[1]}
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((t) => (
                <li key={t.id}>
                  <TeamPlate team={t} count={counts.get(t.id) ?? 0} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function TeamPlate({ team, count }: { team: Team; count: number }) {
  // "Outros" é um agrupamento do fornecedor, não um país: não vai para a placa.
  const country = team.country && team.country !== 'Outros' ? team.country : null;
  const empty = count === 0;

  return (
    <Link
      href={`/camisas/${team.slug}`}
      className={cn(
        'locker group relative isolate flex h-full min-h-[7.5rem] flex-col overflow-hidden rounded-[var(--radius-card)] transition-[border-color,transform] duration-200 ease-[var(--ease-out-fz)] active:scale-[0.98] sm:min-h-[8.5rem]',
        'hover:border-brand-600 focus-visible:border-brand-600 focus-visible:outline-none',
      )}
    >
      {/* Luz do teto: acende no armário sob o mouse ou em foco */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[14%] top-0 h-[2px] bg-light opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_50%_0%,rgb(219_230_255/0.1),transparent_75%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      />

      <span className="flex flex-1 items-end px-3 pb-3 pt-6 sm:px-4 sm:pt-8">
        <span
          className={cn(
            'heading-stencil text-[1.35rem] transition-colors duration-200 [overflow-wrap:anywhere] group-hover:text-fg group-focus-visible:text-fg sm:text-[1.6rem]',
            empty ? 'text-muted' : 'text-fg-2',
          )}
        >
          {team.name}
        </span>
      </span>

      <span className="flex items-center justify-between gap-3 border-t border-line px-3 py-2 text-xs sm:px-4">
        <span className="min-w-0 truncate text-muted">{country}</span>
        <span className={cn('shrink-0 font-semibold tabular-nums', empty ? 'text-subtle' : 'text-fg-2')}>
          {count} {count === 1 ? 'camisa' : 'camisas'}
        </span>
      </span>
    </Link>
  );
}

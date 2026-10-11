'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Team, TeamKind } from '@/types/catalog';
import { teams } from '@/data/teams';
import { usePublicProducts } from '@/context/StoreDataContext';
import { leadByTeam } from '@/lib/catalog';
import { TeamLocker } from './TeamLocker';

const GROUPS: Array<{ kind: TeamKind; title: string; noun: [string, string] }> = [
  { kind: 'clube', title: 'Clubes', noun: ['clube', 'clubes'] },
  { kind: 'selecao', title: 'Seleções', noun: ['seleção', 'seleções'] },
];

/**
 * Parede de armários de time: cada um guarda a camisa do time (foto real), com o
 * nome na plaquinha, o país e quantas camisas publicadas ele tem.
 */
export function TeamsGrid() {
  const products = usePublicProducts();
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => map.set(p.teamId, (map.get(p.teamId) ?? 0) + 1));
    return map;
  }, [products]);
  const leads = useMemo(() => leadByTeam(products), [products]);

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
            <ul className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((t) => (
                <li key={t.id}>
                  <TeamLocker
                    team={t}
                    shirt={leads.get(t.id)}
                    origin={countryOf(t)}
                    meta={`${counts.get(t.id) ?? 0} ${(counts.get(t.id) ?? 0) === 1 ? 'camisa' : 'camisas'}`}
                    dim={(counts.get(t.id) ?? 0) === 0}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** "Outros" é um agrupamento do fornecedor, não um país: não vai para a placa. */
const countryOf = (team: Team) => (team.country && team.country !== 'Outros' ? team.country : null);

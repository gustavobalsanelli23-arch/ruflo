'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { TeamKind } from '@/types/catalog';
import { teams } from '@/data/teams';
import { usePublicProducts } from '@/context/StoreDataContext';

const GROUPS: Array<{ kind: TeamKind; title: string }> = [
  { kind: 'clube', title: 'Clubes' },
  { kind: 'selecao', title: 'Seleções' },
];

/** Lista de times com contagem de produtos publicados. */
export function TeamsGrid() {
  const products = usePublicProducts();
  const count = (id: string) => products.filter((p) => p.teamId === id).length;

  return (
    <div className="space-y-14">
      {GROUPS.map((g) => (
        <section key={g.kind}>
          <h2 className="heading-display mb-5 text-3xl">{g.title}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {teams
              .filter((t) => t.kind === g.kind)
              .map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/camisas/${t.slug}`}
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-all hover:-translate-y-0.5 hover:border-brand-500/60 sm:p-4"
                  >
                    <span
                      className="relative size-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10"
                      style={{ background: `linear-gradient(135deg, ${t.colors.primary} 0 55%, ${t.colors.secondary} 55% 100%)` }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold group-hover:text-brand-300">{t.name}</span>
                      <span className="block text-xs text-muted">
                        {count(t.id)} {count(t.id) === 1 ? 'camisa' : 'camisas'} · {t.country}
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-subtle transition-colors group-hover:text-brand-400" />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

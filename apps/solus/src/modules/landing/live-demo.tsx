'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Period, TrendPoint } from '@/lib/data/types';
import { RevenueProfitChart } from '@/modules/overview/revenue-profit-chart';

/**
 * "Veja funcionando": the real revenue and gross profit chart of the
 * demonstration, the same component as the app. It is mounted when the
 * section scrolls into view, so its bars grow in front of the visitor
 * instead of off screen.
 */

export interface LiveDemoFact {
  label: string;
  value: string;
  note: string;
}

export function LiveDemo({ period, trend, facts }: { period: Period; trend: TrendPoint[]; facts: LiveDemoFact[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -20% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mt-12">
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="border-t border-foreground/80 pt-4">
            <dt className="text-sm text-muted-foreground">{fact.label}</dt>
            <dd className="mt-1 text-3xl font-bold tracking-[-0.04em] text-foreground tabular">{fact.value}</dd>
            <dd className="mt-1 text-sm text-muted-foreground">{fact.note}</dd>
          </div>
        ))}
      </dl>

      <figure className="mt-10 border border-border p-4 sm:p-6">
        <figcaption className="mb-4">
          <span className="block text-base font-bold tracking-[-0.02em] text-foreground">Receita e lucro bruto, {period.label.toLowerCase()}</span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Cada barra é a receita de um dia: a parte de baixo é o lucro bruto, a de cima é o custo das mercadorias.
          </span>
        </figcaption>
        <div ref={holder} className="min-h-[18rem]">
          {shown && <RevenueProfitChart period={period} trend={trend} />}
        </div>
      </figure>

      <p className="mt-4 text-sm text-muted-foreground">
        Empresa fictícia da demonstração, com os mesmos gráficos e cálculos do app.{' '}
        <Link href="/demo/visao-geral" className="font-semibold text-foreground underline underline-offset-4">
          Abrir a demonstração
        </Link>
      </p>
    </div>
  );
}

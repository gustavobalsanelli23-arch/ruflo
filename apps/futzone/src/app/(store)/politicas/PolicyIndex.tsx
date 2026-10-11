'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/format';

interface IndexItem {
  id: string;
  title: string;
}

/**
 * Índice da página (desktop). A seção que está sendo lida acende no trilho:
 * IntersectionObserver, nada roda a cada quadro de rolagem.
 */
export function PolicyIndex({ items }: { items: IndexItem[] }) {
  const [current, setCurrent] = useState(items[0]?.id);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = items.find((i) => visible.get(i.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: '-96px 0px -55% 0px' },
    );
    for (const i of items) {
      const el = document.getElementById(i.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label="Nesta página">
      <p className="plate mb-3 text-[0.82rem] text-muted">Nesta página</p>
      <ol className="border-l border-line">
        {items.map((i) => {
          const active = current === i.id;
          return (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  '-ml-px block border-l py-2 pl-4 text-sm transition-[color,border-color] duration-150 focus-visible:outline-offset-[-2px]',
                  active ? 'border-light font-semibold text-fg' : 'border-transparent text-muted hover:text-fg',
                )}
              >
                {i.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

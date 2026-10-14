'use client';

import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/format';
import { TEXT_BUTTON } from './styles';

interface StepCardProps {
  n: number;
  title: string;
  active: boolean;
  done: boolean;
  /** Resumo exibido quando a etapa está concluída e fechada. */
  summary?: React.ReactNode;
  onEdit?(): void;
  /** Aviso fixo sob o título enquanto a estação ainda não abriu (ex.: o último passo). */
  note?: React.ReactNode;
  children: React.ReactNode;
}

const plateNumber = (n: number) => String(n).padStart(2, '0');

/** Altura do Header rolado (58px = h-14 + 2 bordas, components/layout/Header.tsx). */
const HEADER_SCROLLED = 58;
/** Respiro entre o Header e a estação que acabou de abrir. */
const GAP = 20;

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Leva a estação que acabou de abrir para logo abaixo do Header, a menos que
 * ela já esteja à vista no alto da tela. No topo da página o Header ainda está
 * alto (h-16) e encolhe para 58px ao rolar, puxando o
 * conteúdo para cima: o destino já desconta essa diferença.
 */
function bringIntoView(el: HTMLElement) {
  const header = document.querySelector<HTMLElement>('header.sticky');
  const headerBottom = header?.getBoundingClientRect().bottom ?? HEADER_SCROLLED;
  const top = el.getBoundingClientRect().top;
  if (top >= headerBottom && top <= window.innerHeight * 0.4) return;
  const shrink = header ? Math.max(0, header.offsetHeight - HEADER_SCROLLED) : 0;
  window.scrollTo({ top: Math.max(0, window.scrollY + top - shrink - HEADER_SCROLLED - GAP), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/**
 * Estação do checkout. Cada etapa tem lugar fixo na sequência, marcado por uma
 * placa numerada sobre a linha da prateleira. Ativa: a luz acende sobre a placa
 * e o conteúdo abre. Concluída: resumo e "Alterar". Futura: placa apagada.
 */
export function StepCard({ n, title, active, done, summary, onEdit, note, children }: StepCardProps) {
  const ref = useRef<HTMLElement>(null);
  const wasActive = useRef(active);

  // Rola só quando a estação ACABA de abrir (não ao montar, nem no efeito duplo do StrictMode).
  useEffect(() => {
    const opened = active && !wasActive.current;
    wasActive.current = active;
    if (opened && ref.current) bringIntoView(ref.current);
  }, [active]);

  const closedDone = done && !active;

  return (
    <section
      ref={ref}
      aria-labelledby={`step-${n}`}
      aria-current={active ? 'step' : undefined}
      // Para navegação por âncora/foco: a estação para logo abaixo do Header rolado (HEADER_SCROLLED + GAP).
      className="scroll-mt-[calc(58px+1.25rem)] border-t border-line-strong"
    >
      <header className="flex items-start gap-4 py-4 sm:py-5">
        <span
          aria-hidden
          className={cn(
            'plate relative grid size-10 shrink-0 place-items-center rounded-[var(--radius-button)] border text-[0.95rem] leading-[1.25] tabular-nums transition-[background-color,border-color,color] duration-200',
            active ? 'border-line-strong bg-steel-3 text-fg' : closedDone ? 'border-line-strong bg-steel-2 text-fg-2' : 'border-line text-muted',
          )}
        >
          {/* Luz da estação ativa */}
          {active && <span className="animate-fade absolute inset-x-1.5 -top-px h-[2px] bg-light" />}
          {closedDone ? <Check className="size-4" strokeWidth={1.75} /> : plateNumber(n)}
        </span>

        <div className="min-w-0 flex-1 pt-1.5">
          <h2 id={`step-${n}`} className={cn('heading-display text-[1.6rem] sm:text-[1.85rem]', active ? 'text-fg' : closedDone ? 'text-fg-2' : 'text-muted')}>
            {title}
          </h2>
          {closedDone && summary && <div className="mt-2 text-sm leading-relaxed text-fg-2 [overflow-wrap:anywhere]">{summary}</div>}
          {!active && !done && note && <p className="mt-2 text-sm text-muted">{note}</p>}
        </div>

        {closedDone && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={cn(TEXT_BUTTON, '-mr-1 mt-1')}
          >
            Alterar
          </button>
        )}
      </header>

      {active && <div className="animate-page pb-8 sm:pl-14">{children}</div>}
    </section>
  );
}

/**
 * Mapa das estações (topo do checkout): as cinco etapas em lugar fixo, a atual
 * acesa e a última marcada como o ponto sem volta. O texto "Etapa X de 5"
 * é anunciado a cada troca.
 */
export function CheckoutProgress({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="mb-6 sm:mb-8">
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }} aria-hidden>
        {labels.map((label, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'active' : 'pending';
          const last = n === labels.length;
          return (
            <li key={label} className="relative min-w-0">
              <span
                className={cn(
                  'block h-[2px] transition-colors duration-200',
                  state === 'active' ? 'bg-light' : state === 'done' ? 'bg-light/35' : 'bg-line-strong',
                )}
              />
              {/* Fim da linha: depois do pagamento não há outra estação */}
              {last && <span className="absolute -top-1 right-0 h-2.5 w-px bg-fg-2" />}
              <span className={cn('plate mt-2 block text-[0.8rem] leading-[1.25] tabular-nums', state === 'pending' ? 'text-muted' : 'text-fg')}>{plateNumber(n)}</span>
              <span className={cn('mt-0.5 hidden truncate text-xs sm:block', state === 'active' ? 'font-semibold text-fg' : 'text-muted')}>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted sm:sr-only" aria-live="polite">
        Etapa {step} de {labels.length}: <span className="font-semibold text-fg">{labels[step - 1]}</span>
      </p>
    </div>
  );
}

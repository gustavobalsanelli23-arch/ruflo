import type { ReactNode } from 'react';
import { Reveal, RevealLines } from './Reveal';

type Props = {
  /** id do <h2>, para aria-labelledby da seção. */
  id: string;
  index: string;
  label: string;
  lines: ReactNode[];
  intro?: ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
};

/** Cabeçalho de seção: rótulo numerado, título em linhas e introdução opcional. */
export function SectionHeading({ id, index, label, lines, intro, tone = 'light', className = '' }: Props) {
  const dark = tone === 'dark';
  return (
    <header className={`grid gap-8 lg:grid-cols-12 lg:items-end ${className}`}>
      <div className="lg:col-span-7">
        <Reveal>
          <p className={`eyebrow eyebrow-rule ${dark ? 'text-gold' : 'text-bronze'}`}>
            {index} — {label}
          </p>
        </Reveal>
        <RevealLines
          as="h2"
          id={id}
          lines={lines}
          className={`display mt-6 text-[clamp(2.75rem,7vw,5.75rem)] text-balance ${dark ? 'text-ivory' : 'text-espresso'}`}
        />
      </div>
      {intro && (
        <Reveal delay={0.15} className="lg:col-span-4 lg:col-start-9 lg:pb-3">
          <p
            className={`max-w-md text-[0.9375rem] leading-relaxed text-pretty md:text-base ${dark ? 'text-linen' : 'text-cafe'}`}
          >
            {intro}
          </p>
        </Reveal>
      )}
    </header>
  );
}

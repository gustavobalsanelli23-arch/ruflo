import type { ReactNode } from 'react';
import { MaskedLines, Reveal } from './Reveal';

type Props = {
  index: string;
  eyebrow: string;
  title: ReactNode[];
  intro?: ReactNode;
  tone?: 'light' | 'dark';
  id?: string;
  className?: string;
};

/** Cabeçalho editorial de seção: numeração, rótulo, título em Bodoni e introdução. */
export function SectionHeader({ index, eyebrow, title, intro, tone = 'light', id, className = '' }: Props) {
  const muted = tone === 'dark' ? 'text-mist' : 'text-stone';
  return (
    <header className={`grid gap-8 lg:grid-cols-12 lg:gap-10 ${className}`}>
      <Reveal className="lg:col-span-3">
        <p className={`eyebrow flex items-center gap-4 ${muted}`}>
          <span className="font-display text-sm tracking-normal text-honey italic normal-case">{index}</span>
          <span className="h-px w-8 bg-current opacity-40" aria-hidden />
          {eyebrow}
        </p>
      </Reveal>
      <div className="lg:col-span-9">
        <h2 id={id} className="display text-balance text-[2.6rem] xs:text-5xl md:text-6xl lg:text-[4.5rem]">
          <MaskedLines lines={title} />
        </h2>
        {intro && (
          <Reveal delay={0.15}>
            <div className={`mt-7 max-w-xl text-pretty text-base md:text-lg ${muted}`}>{intro}</div>
          </Reveal>
        )}
      </div>
    </header>
  );
}

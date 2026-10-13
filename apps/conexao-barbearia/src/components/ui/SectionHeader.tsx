import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

type Props = {
  index: string;
  label: string;
  title: ReactNode;
  intro?: ReactNode;
  tone?: 'dark' | 'light';
  align?: 'left' | 'split';
  id?: string;
};

/** Cabeçalho de seção: índice editorial, filete dourado e título em Cormorant. */
export function SectionHeader({ index, label, title, intro, tone = 'dark', align = 'split', id }: Props) {
  const light = tone === 'light';
  return (
    <header className={align === 'split' ? 'grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12' : 'grid gap-8'}>
      <div className={align === 'split' ? 'lg:col-span-7' : ''}>
        <Reveal>
          <p className={`eyebrow ${light ? 'text-accent-deep' : 'text-accent'}`}>
            <span className="tabular-nums">{index}</span>
            <span aria-hidden="true" className={`h-px w-10 ${light ? 'bg-accent-deep/60' : 'bg-accent/60'}`} />
            <span>{label}</span>
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2
            id={id}
            className={`display text-balance mt-6 text-[2.6rem] xs:text-5xl md:text-6xl xl:text-7xl ${light ? 'text-ink' : 'text-bone'}`}
          >
            {title}
          </h2>
        </Reveal>
      </div>
      {intro && (
        <Reveal delay={0.16} className={align === 'split' ? 'lg:col-span-5 lg:pb-2' : 'max-w-xl'}>
          <p
            className={`text-pretty text-base leading-relaxed md:text-[1.0625rem] ${light ? 'text-stone-deep' : 'text-bone/65'}`}
          >
            {intro}
          </p>
        </Reveal>
      )}
    </header>
  );
}

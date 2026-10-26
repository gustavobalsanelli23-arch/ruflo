import type { PointerEvent } from 'react';
import { BlurText } from '../components/BlurText';
import { CompassIcon, LinesIcon, ShieldIcon } from '../components/Icons';
import { Parallax } from '../components/Parallax';
import { Picture } from '../components/Picture';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import { investments } from '../data/content';
import { photos } from '../data/media';

const icons = { compass: CompassIcon, lines: LinesIcon, shield: ShieldIcon } as const;

/** Leva a posição do ponteiro para o brilho do card (.spotlight, em CSS). */
function followPointer(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

export function InvestmentsSection() {
  return (
    <section id="investimentos" aria-labelledby="investimentos-titulo" className="relative isolate overflow-hidden bg-night">
      <Parallax className="-z-10" range={10}>
        <Picture slot={photos.torreNoite} alt="" sizes="100vw" className="block size-full" imgClassName="size-full object-cover" position="70% 50%" />
      </Parallax>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#0b0b0b_0%,rgb(5_5_5/0.7)_22%,rgb(5_5_5/0.6)_50%,rgb(5_5_5/0.82)_80%,#050505_100%)]" />

      <div className="container-x section-y">
        <div className="grid gap-8 lg:grid-cols-12">
          <BlurText as="h2" id="investimentos-titulo" lines={investments.title} className="display display-lg lg:col-span-10" breakOnMobile={false} />
          <Reveal as="p" className="lede lg:col-span-5 lg:col-start-8" delay={0.2}>
            {investments.text}
          </Reveal>
        </div>

        <RevealGroup as="ol" step={0.14} className="mt-16 grid gap-4 md:mt-24 lg:grid-cols-3 lg:gap-5">
          {investments.pillars.map((pillar, i) => {
            const Icon = icons[pillar.icon];
            return (
              <RevealItem
                as="li"
                key={pillar.title}
                className="spotlight liquid-glass-strong group flex min-h-[15rem] flex-col rounded-[14px] p-7 transition-colors duration-500 hover:bg-white/[0.03] sm:p-8 lg:min-h-[19rem]"
                onPointerMove={followPointer}
              >
                <div className="flex items-start justify-between">
                  <span className="display text-[2.75rem] leading-none text-champagne/90" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Icon size={40} className="text-linen/80 transition-transform duration-700 ease-out group-hover:-translate-y-1" />
                </div>
                <div className="mt-auto pt-12">
                  <h3 className="text-[1.25rem] font-medium text-linen">{pillar.title}</h3>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-linen/70">{pillar.text}</p>
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>

        <Reveal as="p" className="mt-10 max-w-2xl text-[0.8125rem] leading-relaxed text-mineral">
          {investments.note}
        </Reveal>
      </div>
    </section>
  );
}

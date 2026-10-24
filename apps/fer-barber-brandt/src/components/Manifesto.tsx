import { Fragment, useRef } from 'react';
import { copy } from '../data/content';
import { useGsap } from '../hooks/useGsap';
import { useReveal } from '../hooks/useReveal';
import { SplitText, gsap, whenIdle } from '../lib/motion';
import { Scale, SectionLabel, SectionLink } from './ui';

/** "texto *ênfase* texto" → nós com o itálico da casa nas palavras marcadas. */
export function emphasize(text: string) {
  return text.split('*').map((part, i) =>
    i % 2 ? (
      <em key={i} className="serif">
        {part}
      </em>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/**
 * A apresentação da casa: uma frase grande que se acende palavra por palavra
 * conforme a rolagem avança (sem rolagem presa: o texto acompanha a página).
 */
export function Manifesto() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  useGsap(
    (ctx) =>
      whenIdle(() =>
        ctx.add(() => {
          const mm = gsap.matchMedia();
          mm.add('(prefers-reduced-motion: no-preference)', () => {
            const el = root.current!.querySelector<HTMLElement>('[data-words]')!;
            const split = SplitText.create(el, { type: 'words', aria: 'none' });
            gsap.fromTo(
              split.words,
              { opacity: 0.14 },
              {
                opacity: 1,
                stagger: 0.12,
                ease: 'none',
                scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 52%', scrub: 0.6 },
              },
            );
            return () => split.revert();
          });
          return () => mm.revert();
        }),
      ),
    root,
  );

  return (
    <section ref={root} id="manifesto" aria-labelledby="manifesto-titulo" className="relative pt-[var(--section)] pb-[calc(var(--section)*0.4)]">
      <div className="container-x">
        <h2 id="manifesto-titulo" className="sr-only">
          A casa
        </h2>
        <SectionLabel n="01" className="text-fumo">
          A casa
        </SectionLabel>
        <p data-words className="text-statement mt-10 max-w-[22ch] lg:mt-14 lg:ml-[8.333%]">
          {emphasize(copy.manifesto)}
        </p>
        <div className="mt-14 flex flex-col gap-8 lg:mt-20 lg:ml-[8.333%] lg:flex-row lg:items-center lg:gap-12">
          <Scale ticks={48} className="w-full max-w-[24rem] text-osso/60" />
          <SectionLink href="#sobre" className="link-line label self-start text-[0.7rem] lg:self-auto">
            Conheça a barbearia
          </SectionLink>
        </div>
      </div>
    </section>
  );
}

import { useRef } from 'react';
import { booking } from '../config/site';
import { bookingSteps } from '../data/content';
import { useGsap } from '../hooks/useGsap';
import { useReveal } from '../hooks/useReveal';
import { gsap } from '../lib/motion';
import { BookingLink } from './ui';

/** Folha de hera (a parede de folhagens do salão), desenhada em traço. */
const LEAF = 'M0 0C-7-3-12-11-7-17C-4-21 0-18 0-15C0-18 4-21 7-17C12-11 7-3 0 0Z';
const LEAVES: [x: number, y: number, rotate: number, scale: number][] = [
  [318, 52, 200, 1.5],
  [282, 128, 130, 1.3],
  [330, 196, 230, 1.7],
  [262, 262, 110, 1.2],
  [300, 338, 215, 1.6],
  [244, 420, 120, 1.4],
  [284, 500, 230, 1.3],
  [226, 572, 100, 1.6],
];

function Vine() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 640"
      fill="none"
      className="pointer-events-none absolute top-0 right-[-4rem] hidden h-full w-auto text-champanhe/30 md:block lg:right-[-4rem] max-lg:right-[-9rem]"
    >
      <path
        data-vine
        d="M352 -10C300 60 360 140 300 210C246 272 330 330 270 420C230 480 290 540 230 650"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {LEAVES.map(([x, y, r, s]) => (
        <path
          key={`${x}-${y}`}
          data-leaf
          d={LEAF}
          transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
          stroke="currentColor"
          strokeWidth={1.2 / s}
        />
      ))}
    </svg>
  );
}

export function Booking() {
  const root = useRef<HTMLElement>(null);
  const channel = booking();
  useReveal(root);

  // A hera cresce uma vez, quando a seção entra na tela.
  useGsap(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
      tl.from('[data-vine]', { drawSVG: '0%', duration: 2.6, ease: 'power2.inOut' }).from(
        '[data-leaf]',
        { scale: 0, autoAlpha: 0, transformOrigin: '50% 100%', duration: 1, stagger: 0.12, ease: 'back.out(1.6)' },
        0.5,
      );
    });
    return () => mm.revert();
  }, root);

  return (
    <section
      ref={root}
      id="agendar"
      aria-labelledby="agendar-titulo"
      className="section-y relative isolate overflow-clip bg-verde text-papel"
    >
      <Vine />
      <div className="container-x relative">
        <h2 id="agendar-titulo" data-reveal="lines" className="text-display max-w-[11ch] lg:max-w-[15ch] lg:text-[clamp(3rem,1rem+5vw,6.75rem)]">
          Seu próximo visual começa aqui.
        </h2>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5 lg:mt-14">
          <div data-reveal="fade">
            <BookingLink className="btn btn-rose min-h-16 px-9 text-[1.0625rem] max-sm:w-full" iconSize={21} />
          </div>
          <p data-reveal="fade" data-delay="0.1" className="max-w-[26rem] text-champanhe">
            {channel.channel === 'whatsapp'
              ? 'A conversa abre no WhatsApp com uma mensagem pronta. É só enviar.'
              : 'O agendamento é feito pelo Direct do Instagram do salão.'}
          </p>
        </div>

        <ol className="mt-20 grid gap-10 border-t border-[var(--line-light)] pt-12 md:grid-cols-3 md:gap-8 lg:mt-28 lg:max-w-[70rem]">
          {bookingSteps.map((step, i) => (
            <li key={step.title} data-reveal="fade" data-delay={i * 0.1} className="flex gap-5 md:block">
              <span aria-hidden="true" className="font-serif text-[2.75rem] leading-none font-light italic text-rosa">
                {i + 1}
              </span>
              <div className="md:mt-5">
                <h3 className="font-serif text-[1.5rem] leading-tight font-normal">{step.title}</h3>
                <p className="mt-2 max-w-[22rem] text-champanhe">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

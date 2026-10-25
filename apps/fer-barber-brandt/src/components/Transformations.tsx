import { useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, ChevronsLeftRight } from 'lucide-react';
import { business } from '../config/site';
import { type Transformation, copy, monthYear, transformations } from '../data/content';
import { useGsap } from '../hooks/useGsap';
import { useReveal } from '../hooks/useReveal';
import { EASE, PLAY_ONCE, gsap, whenIdle } from '../lib/motion';
import { Frame, Picture } from './Picture';
import { SectionLabel } from './ui';

/**
 * Antes e depois: os pares que a própria barbearia publica em carrossel
 * ("arraste ao lado para ver o antes"). Um comparador por par, com um
 * <input type="range"> de verdade por baixo: teclado, toque e leitor de tela.
 */
export function Transformations() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  const [first, second] = copy.transformations.title;

  return (
    <section ref={root} id="antes-depois" aria-labelledby="antes-depois-titulo" className="section-y relative">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-x-6">
          <div className="lg:col-span-7">
            <SectionLabel n="04" className="text-tabaco">
              Antes e depois
            </SectionLabel>
            <h2 id="antes-depois-titulo" className="text-display mt-8 lg:mt-10">
              <span data-reveal="lines" className="block">
                {first}
              </span>
              <span data-reveal="lines" data-delay="0.1" className="serif block pl-[0.6em] text-[0.8em] leading-[0.95]">
                {second}
              </span>
            </h2>
          </div>
          <p data-reveal="fade" className="flex items-center gap-3 text-tabaco lg:col-[9/span_4] lg:justify-self-end">
            <ChevronsLeftRight size={18} strokeWidth={1.5} aria-hidden="true" className="text-latao" />
            {copy.transformations.hint}
          </p>
        </div>

        <ul className="mt-14 grid gap-14 md:grid-cols-2 md:gap-8 lg:mt-20 lg:gap-14">
          {transformations.map((t, i) => (
            <li key={t.id} className={i % 2 ? 'md:mt-24' : ''}>
              <Compare item={t} delay={i * 0.12} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Compare({ item, delay }: { item: Transformation; delay: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(50);
  const state = useRef({ value: 50 });

  // Ao entrar na tela, a divisória passeia uma vez para mostrar que dá para arrastar.
  useGsap(
    (ctx) =>
      whenIdle(() =>
        ctx.add(() => {
          const mm = gsap.matchMedia();
          mm.add('(prefers-reduced-motion: no-preference)', () => {
            const s = state.current;
            // Só a variável CSS muda a cada quadro (sem re-render do React).
            const apply = () => box.current?.style.setProperty('--pos', `${s.value}%`);
            gsap
              .timeline({ delay: 0.6 + delay, scrollTrigger: { trigger: box.current, start: 'top 70%', ...PLAY_ONCE } })
              .to(s, { value: 72, duration: 0.9, ease: EASE.inOut, onUpdate: apply })
              .to(s, { value: 50, duration: 1.1, ease: EASE.inOut, onUpdate: apply });
          });
          return () => mm.revert();
        }),
      ),
    box,
  );

  const onInput = (v: number) => {
    gsap.killTweensOf(state.current);
    state.current.value = v;
    box.current?.style.setProperty('--pos', `${v}%`);
    setValue(v);
  };

  const style = { '--pos': `${value}%` } as CSSProperties;

  return (
    <figure>
      <Frame delay={delay}>
        <div ref={box} className="group relative aspect-square select-none" style={style}>
          <Picture
            slot={item.after}
            sizes="(min-width: 768px) 46vw, 100vw"
            className="absolute inset-0 block h-full w-full"
            imgClassName="h-full w-full object-cover"
          />
          {/* O antes fica por cima, recortado até a divisória. */}
          <div className="absolute inset-0 [clip-path:inset(0_calc(100%-var(--pos))_0_0)]">
            <Picture
              slot={item.before}
              sizes="(min-width: 768px) 46vw, 100vw"
              className="block h-full w-full"
              imgClassName="h-full w-full object-cover"
            />
          </div>

          <span className="label pointer-events-none absolute top-3 left-3 bg-cafe/80 px-2.5 py-1.5 text-creme backdrop-blur-sm">Antes</span>
          <span className="label pointer-events-none absolute top-3 right-3 bg-latao px-2.5 py-1.5 text-cafe">Depois</span>

          {/* Divisória e puxador. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[var(--pos)] w-px -translate-x-1/2 bg-creme" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-[var(--pos)] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-creme text-cafe shadow-[0_10px_30px_-8px_rgb(0_0_0/0.6)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-has-[:focus-visible]:scale-110 group-hover:scale-110"
          >
            <ChevronsLeftRight size={20} strokeWidth={1.5} />
          </span>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e) => onInput(Number(e.target.value))}
            aria-label={`Comparar antes e depois: ${item.title}`}
            aria-valuetext={`${value}% do antes visível`}
            className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          />
        </div>
      </Frame>
      <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span>
          <span className="block text-[1.125rem] font-semibold uppercase font-stretch-[80%]">{item.title}</span>
          <span className="mt-1 block text-tabaco">
            “{item.caption}” <span className="whitespace-nowrap">— {monthYear(item.date)}</span>
          </span>
        </span>
        <a href={item.post} target="_blank" rel="noopener noreferrer" className="link-line label text-[0.7rem]">
          Ver o post
          <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">(@{business.instagram.handle}, abre em nova aba)</span>
        </a>
      </figcaption>
    </figure>
  );
}

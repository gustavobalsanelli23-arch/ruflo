import { useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { booking, business, serviceMessage } from '../config/site';
import { services } from '../data/content';
import { useGsap } from '../hooks/useGsap';
import { useReveal } from '../hooks/useReveal';
import { EASE, PLAY_ONCE, gsap, whenIdle } from '../lib/motion';
import { SectionLabel } from './ui';

const LIGHT = { bg: '#e9dbbd', fg: '#1b0f08', soft: '#6b5340', line: 'rgb(27 15 8 / 0.16)' };
const DARK = { bg: '#1b0f08', fg: '#efe3c9', soft: '#ad9478', line: 'rgb(239 227 201 / 0.15)' };

/**
 * Serviços: índice tipográfico numa seção clara. A passagem do escuro para o
 * claro acompanha a rolagem (as cores da seção são variáveis animadas), e
 * cada linha inteira leva ao agendamento daquele serviço.
 */
export function Services() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  const channel = booking();
  const hasPrices = services.some((s) => s.price);

  useGsap(
    (ctx) =>
      whenIdle(() =>
        ctx.add(() => {
          const mm = gsap.matchMedia();
          mm.add('(prefers-reduced-motion: no-preference)', () => {
            const el = root.current!;
            const vars = (c: typeof LIGHT) => ({ '--sec-bg': c.bg, '--sec-fg': c.fg, '--sec-soft': c.soft, '--sec-line': c.line });
            gsap.fromTo(el, vars(DARK), {
              ...vars(LIGHT),
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 38%', scrub: true },
            });
            gsap.from(el.querySelectorAll('[data-service]'), {
              y: 40,
              opacity: 0,
              duration: 1.1,
              stagger: 0.1,
              ease: EASE.out,
              scrollTrigger: { trigger: el.querySelector('[data-service-list]'), start: 'top 82%', ...PLAY_ONCE },
            });
          });
          return () => mm.revert();
        }),
      ),
    root,
  );

  return (
    <section
      ref={root}
      id="servicos"
      aria-labelledby="servicos-titulo"
      className="section-y relative bg-[var(--sec-bg)] text-[var(--sec-fg)] [--sec-bg:#e9dbbd] [--sec-fg:#1b0f08] [--sec-line:rgb(27_15_8/0.16)] [--sec-soft:#6b5340]"
      style={{ colorScheme: 'light' }}
    >
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-x-6">
          <div className="lg:col-span-7">
            <SectionLabel n="03" className="text-[var(--sec-soft)]">
              Serviços
            </SectionLabel>
            <h2 id="servicos-titulo" data-reveal="lines" className="text-display mt-8 lg:mt-10">
              Barba <span className="serif text-[0.8em]">e cabelo</span>
            </h2>
          </div>
          <p data-reveal="fade" className="max-w-[30rem] text-[var(--sec-soft)] lg:col-[9/span_4]">
            {hasPrices
              ? `Escolha o serviço e agende pelo ${channel.channelName}.`
              : `Para valores e horários, fale com o ${business.barber} pelo ${channel.channelName}.`}
          </p>
        </div>

        <ol data-service-list className="mt-16 border-b border-[var(--sec-line)] lg:mt-24">
          {services.map((s, i) => {
            const b = booking(serviceMessage(s.name));
            const meta = [s.duration, s.price].filter(Boolean);
            return (
              <li
                key={s.id}
                data-service={s.id}
                className="group relative grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 gap-y-3 border-t border-[var(--sec-line)] py-8 md:grid-cols-[3.5rem_1fr_auto] lg:grid-cols-12 lg:gap-x-6 lg:py-11"
              >
                {/* Traço que se desenha sob a linha em foco. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -top-px h-px origin-left scale-x-0 bg-[var(--sec-fg)] transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-x-100 group-has-[:focus-visible]:scale-x-100"
                />
                <span className="label text-[var(--sec-soft)] tabular-nums lg:col-span-1">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="text-title transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-3 lg:col-span-5 lg:group-hover:translate-x-6">
                  {s.name}
                </h3>
                <span
                  aria-hidden="true"
                  className="col-start-3 row-start-1 flex h-11 w-11 items-center justify-center self-center rounded-full shadow-[inset_0_0_0_1px_var(--sec-line)] transition-[background-color,color,transform] duration-700 ease-[var(--ease-out-expo)] group-hover:rotate-45 group-hover:bg-[var(--sec-fg)] group-hover:text-[var(--sec-bg)] lg:col-start-12 lg:justify-self-end"
                >
                  <ArrowUpRight size={18} strokeWidth={1.5} />
                </span>
                <p className="col-span-2 col-start-2 max-w-[34rem] text-[var(--sec-soft)] lg:col-span-4 lg:col-start-7 lg:row-start-1">
                  {s.description}
                  {meta.length > 0 && (
                    <span className="label mt-3 block text-[var(--sec-fg)] tabular-nums">{meta.join(' · ')}</span>
                  )}
                </p>
                {/* O link cobre a linha inteira (área de toque grande). */}
                <a
                  href={b.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-booking={b.channel}
                  className="absolute inset-0 z-10 outline-offset-[-2px]"
                >
                  <span className="sr-only">
                    Agendar {s.name} (abre o {b.channelName} em nova aba)
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

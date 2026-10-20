import { useRef, useState } from 'react';
import { business } from '../config/site';
import { specialties } from '../data/content';
import { useGsap } from '../hooks/useGsap';
import { useReveal } from '../hooks/useReveal';
import { ScrollTrigger, gsap } from '../lib/motion';
import { ArrowUpRightIcon } from './icons';
import { Lotus } from './Lotus';
import { Picture } from './Picture';
import { BookingLink } from './ui';

const message = (name: string) => `Olá, Meire! Vim pelo site e gostaria de agendar: ${name}.`;

/**
 * Índice editorial: os nomes dos serviços em linhas grandes e, no desktop, uma
 * prévia fixa que troca de foto conforme a linha em foco (rolagem, mouse ou teclado).
 * No celular, cada serviço traz a própria foto.
 */
export function Specialties() {
  const root = useRef<HTMLElement>(null);
  const [state, setState] = useState({ active: 0, prev: -1 });
  useReveal(root);

  const activate = (i: number) =>
    setState((s) => (s.active === i ? s : { active: i, prev: s.active }));

  // A linha que cruza o meio da tela vira a ativa (desktop).
  useGsap(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      const rows = gsap.utils.toArray<HTMLElement>('[data-specialty]', root.current);
      const triggers = rows.map((row, i) =>
        ScrollTrigger.create({
          trigger: row,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && activate(i),
        }),
      );
      return () => triggers.forEach((t) => t.kill());
    });
    return () => mm.revert();
  }, root);

  const current = specialties[state.active];

  return (
    <section
      ref={root}
      id="especialidades"
      aria-labelledby="especialidades-titulo"
      className="section-y relative bg-floresta text-papel"
    >
      <div className="container-x grid grid-cols-1 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-[1/span_5] lg:row-span-2">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
            <h2
              id="especialidades-titulo"
              data-reveal="lines"
              className="text-display lg:text-[clamp(2.6rem,0.5rem+4.6vw,5.75rem)]"
            >
              Especialidades
            </h2>
            <p data-reveal="fade" className="mt-6 max-w-[30rem] text-champanhe">
              Os serviços que mais aparecem nos trabalhos da Meire. Valores e disponibilidade são combinados no
              agendamento.
            </p>

            {/* Prévia (desktop): uma foto por serviço, a ativa sobe por cima da anterior. */}
            <figure data-reveal="fade" className="mt-12 hidden max-w-[24rem] lg:block xl:max-w-[26rem]">
              <div className="relative aspect-[4/5] overflow-hidden bg-verde">
                {specialties.map((s, i) => (
                  <div
                    key={s.id}
                    data-frame
                    data-state={i === state.active ? 'active' : i === state.prev ? 'prev' : undefined}
                    className="absolute inset-0 [clip-path:inset(100%_0%_0%_0%)] transition-[clip-path] delay-[900ms] duration-0 data-[state=active]:z-20 data-[state=active]:[clip-path:inset(0%_0%_0%_0%)] data-[state=active]:delay-0 data-[state=active]:duration-[900ms] data-[state=active]:ease-[var(--ease-in-out-quart)] data-[state=prev]:z-10 data-[state=prev]:[clip-path:inset(0%_0%_0%_0%)]"
                    aria-hidden={i !== state.active}
                  >
                    <Picture
                      image={s.image}
                      alt={s.alt}
                      sizes="26rem"
                      className="block h-full w-full"
                      imgClassName={`h-full w-full object-cover transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] ${i === state.active ? 'scale-100' : 'scale-110'}`}
                    />
                  </div>
                ))}
              </div>
              <figcaption className="mt-3 text-[0.8125rem] text-champanhe/80">
                Na foto: {current.photoNote.toLowerCase()}
              </figcaption>
            </figure>
          </div>
        </div>

        <ul className="mt-14 lg:col-[7/span_6] lg:mt-0 lg:pt-3">
          {specialties.map((s, i) => {
            const isActive = i === state.active;
            return (
              <li
                key={s.id}
                data-specialty
                data-active={isActive || undefined}
                className="group/row border-t border-[var(--line-light)] py-9 last:border-b lg:py-11"
                onMouseEnter={() => activate(i)}
                onFocus={() => activate(i)}
              >
                {/* Celular: a foto do serviço, alternando os lados. */}
                <div
                  data-reveal="image"
                  className={`mb-7 aspect-[4/5] w-[78%] overflow-hidden lg:hidden ${i % 2 ? 'ml-auto' : ''}`}
                >
                  <Picture
                    image={s.image}
                    alt={s.alt}
                    sizes="78vw"
                    className="block h-full w-full"
                    imgClassName="h-full w-full object-cover"
                  />
                </div>

                <div className="flex items-start gap-4">
                  <Lotus
                    size={30}
                    stroke={1.4}
                    className="mt-[0.55em] hidden shrink-0 text-rosa opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)] group-data-[active]/row:translate-x-0 group-data-[active]/row:opacity-100 lg:block lg:-translate-x-3"
                  />
                  <div className="flex-1 transition-transform duration-700 ease-[var(--ease-out-expo)] lg:-translate-x-[46px] lg:group-data-[active]/row:translate-x-0">
                    <h3 className="text-title transition-opacity duration-500 lg:opacity-45 lg:group-data-[active]/row:opacity-100">
                      {s.name}
                    </h3>
                    <p className="mt-3 max-w-[34rem] text-champanhe/90 lg:mt-4">{s.description}</p>
                    <p className="mt-2 text-[0.8125rem] text-champanhe/85 lg:hidden">Na foto: {s.photoNote.toLowerCase()}</p>
                    <BookingLink
                      message={message(s.name)}
                      label={`Agendar ${s.name.toLowerCase()}`}
                      bare
                      className="link-line mt-5 text-[0.9375rem] font-medium text-rosa"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="pt-10 lg:col-[7/span_6]">
            <a
              href={business.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-line link-quiet inline-flex text-champanhe"
            >
              Veja mais resultados no Instagram
              <ArrowUpRightIcon size={16} />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
        </div>
      </div>
    </section>
  );
}

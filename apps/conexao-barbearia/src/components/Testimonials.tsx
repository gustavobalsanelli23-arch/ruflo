import { ArrowUpRight } from 'lucide-react';
import { mapsLinks, testimonials, units } from '../data/site';
import { Reveal } from './ui/Reveal';
import { SectionHeader } from './ui/SectionHeader';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('');

export function Testimonials() {
  const [featured, ...rest] = testimonials;

  return (
    <section id="depoimentos" aria-labelledby="depoimentos-title" className="relative bg-ink py-24 md:py-32 lg:py-40">
      <div className="container-x">
        <SectionHeader
          id="depoimentos-title"
          index="05"
          label="Depoimentos"
          title={
            <>
              Quem conhece, <span className="font-normal italic text-gold">recomenda.</span>
            </>
          }
          intro="Palavras de clientes que já viveram a experiência Conexão."
        />

        <div className="mt-16 grid gap-12 md:mt-20 lg:grid-cols-12 lg:gap-16">
          {/* Depoimento em destaque */}
          <Reveal className="lg:col-span-5">
            <figure className="lg:sticky lg:top-32">
              <span
                aria-hidden="true"
                className="block font-display text-[7rem] leading-[0.6] text-gold md:text-[9rem]"
              >
                “
              </span>
              <blockquote className="mt-2 text-pretty font-display text-[1.75rem] font-normal italic leading-[1.3] text-bone md:text-[2.125rem]">
                {featured.quote}
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <span aria-hidden="true" className="h-px w-10 bg-gold/60" />
                <span>
                  <span className="block text-sm font-semibold text-bone">{featured.name}</span>
                  <span className="text-[0.6875rem] uppercase tracking-[0.2em] text-stone">Cliente Conexão</span>
                </span>
              </figcaption>
            </figure>
          </Reveal>

          {/* Demais depoimentos */}
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:col-span-7">
            {rest.map((t, i) => (
              <li
                key={t.name}
                className={`bg-ink ${rest.length % 2 === 1 && i === rest.length - 1 ? 'sm:col-span-2' : ''}`}
              >
                <Reveal delay={(i % 2) * 0.08} className="h-full">
                  <figure className="flex h-full flex-col p-7 sm:p-8">
                    <blockquote className="flex-1 text-pretty text-[0.9375rem] leading-relaxed text-bone/75">
                      <span aria-hidden="true" className="mr-1 font-display text-2xl leading-none text-gold">
                        “
                      </span>
                      {t.quote}
                    </blockquote>
                    <figcaption className="mt-7 flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/40 font-display text-base text-gold"
                      >
                        {initials(t.name)}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-bone">{t.name}</span>
                        <span className="text-[0.625rem] uppercase tracking-[0.2em] text-stone">Cliente Conexão</span>
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>

        <Reveal>
          <div className="mt-16 flex flex-col gap-5 border-t border-line pt-10 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-bone/60">Veja todas as avaliações das nossas unidades no Google:</p>
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {units.map((u) => (
                <li key={u.id}>
                  <a
                    href={mapsLinks(u).reviews}
                    target="_blank"
                    rel="noopener"
                    className="link-line text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-bone"
                  >
                    {u.shortName}
                    <ArrowUpRight className="size-3.5 text-gold" strokeWidth={1.75} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

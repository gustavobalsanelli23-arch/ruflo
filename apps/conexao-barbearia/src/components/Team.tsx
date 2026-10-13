import { ArrowUpRight } from 'lucide-react';
import { links, team } from '../data/site';
import { track } from '../lib/analytics';
import { Picture } from './ui/Picture';
import { Reveal } from './ui/Reveal';
import { SectionHeader } from './ui/SectionHeader';

export function Team() {
  return (
    <section id="equipe" aria-labelledby="equipe-title" className="relative bg-bone py-24 text-ink md:py-32 lg:py-40">
      <div className="container-x">
        <SectionHeader
          id="equipe-title"
          tone="light"
          index="04"
          label="Nossa equipe"
          title={
            <>
              Barbeiros que <span className="font-normal italic text-accent-deep">conectam.</span>
            </>
          }
          intro="Profissionais experientes, treinados dentro do padrão Conexão, que tratam cada cliente como único."
        />

        <ul className="mt-16 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:mt-20 lg:grid-cols-4 lg:gap-x-8 lg:pb-14">
          {team.map((barber, i) => (
            <Reveal as="li" key={barber.id} delay={i * 0.08} className={i % 2 === 1 ? 'lg:translate-y-14' : ''}>
              <article className="group" aria-labelledby={`barbeiro-${barber.id}`}>
                <div className="relative aspect-[4/5] overflow-hidden bg-ink">
                  <Picture
                    image={barber.image}
                    sizes="(min-width: 1024px) 22vw, 46vw"
                    className="photo-mono h-full w-full object-cover object-top group-hover:scale-[1.04]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/60 to-transparent"
                  />
                </div>
                <p className="mt-5 text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-accent-deep sm:text-[0.6875rem]">
                  {barber.experience}
                </p>
                <h3
                  id={`barbeiro-${barber.id}`}
                  className="mt-2 font-display text-[1.5rem] uppercase leading-none tracking-tight text-ink sm:text-[1.875rem]"
                >
                  {barber.name}
                </h3>
                <p className="mt-3 text-pretty text-[0.8125rem] leading-relaxed text-stone-deep sm:text-sm">
                  {barber.bio}
                </p>
              </article>
            </Reveal>
          ))}
        </ul>

        <Reveal>
          <div className="mt-20 flex flex-col items-start justify-between gap-6 border-t border-ink/15 pt-10 sm:flex-row sm:items-center">
            <p className="max-w-lg font-display text-2xl leading-snug text-ink md:text-[1.75rem]">
              Escolha o seu horário e venha conhecer a equipe pessoalmente.
            </p>
            <a
              href={links.booking}
              target="_blank"
              rel="noopener"
              onClick={() => track('Schedule', { origem: 'equipe' })}
              className="btn btn-dark"
            >
              Agendar horário
              <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

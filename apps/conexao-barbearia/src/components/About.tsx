import { ArrowUpRight } from 'lucide-react';
import { business, links, team, units } from '../data/site';
import { track } from '../lib/analytics';
import { Picture } from './ui/Picture';
import { Reveal, RevealImage } from './ui/Reveal';

const storefront = {
  name: 'fachada-unidade',
  widths: [480, 800],
  width: 800,
  height: 1000,
  alt: 'Fachada de uma unidade da Conexão Barbearia, com o letreiro e o salão ao fundo',
};

const crew = {
  name: 'equipe-conexao',
  widths: [480, 800],
  width: 800,
  height: 600,
  alt: 'Equipe de barbeiros da Conexão Barbearia em frente ao painel com o logotipo',
};

const facts = [
  { value: String(business.foundedYear), label: 'Ano de fundação' },
  { value: String(units.length).padStart(2, '0'), label: 'Unidades em Barueri' },
  { value: String(team.length).padStart(2, '0'), label: 'Barbeiros na equipe' },
];

export function About() {
  return (
    <section id="sobre" aria-labelledby="sobre-title" className="relative bg-bone py-24 text-ink md:py-32 lg:py-40">
      <div className="container-x grid gap-16 lg:grid-cols-12 lg:gap-12">
        {/* Composição fotográfica */}
        <div className="group relative self-start pb-10 lg:col-span-6 lg:pr-10 lg:pb-14">
          <RevealImage className="relative aspect-[4/5] w-[86%] overflow-hidden bg-bone-2 sm:w-[78%] lg:w-[84%]">
            <Picture
              image={storefront}
              sizes="(min-width: 1024px) 40vw, 80vw"
              className="photo-mono h-full w-full object-cover"
            />
          </RevealImage>
          <RevealImage
            delay={0.2}
            className="absolute bottom-0 right-0 aspect-[4/3] w-[54%] overflow-hidden border-[6px] border-bone bg-bone-2 shadow-[0_30px_60px_-30px_rgb(10_14_21/0.45)] sm:w-[48%]"
          >
            <Picture
              image={crew}
              sizes="(min-width: 1024px) 24vw, 50vw"
              className="photo-mono h-full w-full object-cover"
            />
          </RevealImage>
          <p
            aria-hidden="true"
            className="absolute left-[calc(86%+0.75rem)] top-0 hidden origin-top-left translate-x-5 rotate-90 whitespace-nowrap text-[0.625rem] font-semibold uppercase tracking-[0.32em] text-stone-deep sm:left-[calc(78%+0.75rem)] sm:block lg:left-[calc(84%*0.92+0.75rem)]"
          >
            Barueri · São Paulo — desde {business.foundedYear}
          </p>
        </div>

        {/* Texto */}
        <div className="lg:col-span-6 lg:col-start-7 lg:pt-6">
          <Reveal>
            <p className="eyebrow text-accent-deep">
              <span className="tabular-nums">01</span>
              <span aria-hidden="true" className="h-px w-10 bg-accent-deep/60" />
              <span>Sobre a Conexão</span>
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2
              id="sobre-title"
              className="display text-balance mt-6 text-[2.6rem] xs:text-5xl md:text-6xl xl:text-7xl"
            >
              Mais que um corte. <span className="font-normal italic text-accent-deep">Um padrão.</span>
            </h2>
          </Reveal>

          <div className="mt-10 grid max-w-xl gap-5 text-pretty text-base leading-[1.8] text-stone-deep md:text-[1.0625rem]">
            <Reveal delay={0.12}>
              <p>
                <strong className="font-semibold text-ink">Desde {business.foundedYear} no mercado</strong>, a Conexão
                Barbearia se destaca pela dedicação, pela experiência e por um padrão de atendimento que garante
                qualidade em cada detalhe.
              </p>
            </Reveal>
            <Reveal delay={0.16}>
              <p>
                Contamos com barbeiros experientes, treinados dentro de um padrão próprio. Aqui, cada cliente é único: o
                corte e o cuidado seguem o seu estilo, sempre com atenção aos mínimos detalhes.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p>
                Um espaço moderno e confortável, pensado para você relaxar, se sentir à vontade e viver uma experiência
                completa.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.24}>
            <p className="mt-10 font-display text-2xl italic text-ink md:text-3xl">{business.tagline}</p>
          </Reveal>

          <Reveal delay={0.28}>
            <dl className="mt-12 grid grid-cols-3 border-t border-ink/15">
              {facts.map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col-reverse justify-end border-r border-ink/15 pr-3 pt-6 last:border-r-0 [&:not(:first-child)]:pl-4 sm:[&:not(:first-child)]:pl-6"
                >
                  <dt className="mt-3 text-[0.625rem] font-semibold uppercase leading-snug tracking-[0.2em] text-stone-deep sm:text-[0.6875rem]">
                    {f.label}
                  </dt>
                  <dd className="font-display text-4xl leading-none tabular-nums text-ink md:text-5xl">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <a
                href={links.booking}
                target="_blank"
                rel="noopener"
                onClick={() => track('Schedule', { origem: 'sobre' })}
                className="btn btn-dark"
              >
                Agendar horário
                <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
              </a>
              <a href="#equipe" className="btn btn-outline-dark">
                Conhecer a equipe
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

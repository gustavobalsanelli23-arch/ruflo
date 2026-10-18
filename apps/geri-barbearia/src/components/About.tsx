import { useRef } from 'react';
import { business } from '../config/site';
import { milestones } from '../data/content';
import { useReveal } from '../hooks/useReveal';
import { Picture } from './Picture';

export function About() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section ref={root} id="a-casa" aria-labelledby="a-casa-titulo" className="section-y relative">
      <h2 id="a-casa-titulo" className="sr-only">
        Sobre a {business.name}
      </h2>

      <div className="container-x grid gap-16 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-6 lg:pt-16 xl:col-span-6">
          <blockquote>
            <p
              data-reveal="lines"
              className="font-serif text-[clamp(2.1rem,1.3rem+2.6vw,3.9rem)] leading-[1.08] tracking-[-0.01em] italic"
            >
              “A tradição da barbearia com o toque moderno que você merece.”
            </p>
            <footer data-reveal="fade" className="mt-6 flex items-center gap-4 text-sm text-parchment">
              <span className="h-px w-10 bg-gold" aria-hidden="true" />
              {business.name}
            </footer>
          </blockquote>

          <div className="mt-14 max-w-[34rem] space-y-6 text-lead text-bone/80 lg:mt-20">
            <p data-reveal="fade">
              A {business.name} abriu as portas em 13 de setembro de 2024, no centro de {business.address.city}. A regra
              da casa está escrita no próprio emblema: chegou, cortou.
            </p>
            <p data-reveal="fade" data-delay="0.1">
              Na cadeira, {business.barber} trabalha da tesoura ao freestyle, do degradê à barba, e atende do pai ao
              filho com o mesmo capricho.
            </p>
          </div>
        </div>

        {/* Composição de fotos sobrepostas, como um mural da casa */}
        <div className="relative lg:col-span-5 lg:col-start-8">
          <figure className="relative ml-auto w-[78%] sm:w-[62%] lg:w-[82%]">
            <div data-reveal="image" className="overflow-hidden">
              <Picture
                image="fachada"
                alt="Fachada da Geri Barbearia: parede ocre, placa preta com o nome em letras clássicas, poste de barbeiro e um banco de madeira"
                sizes="(min-width: 1024px) 30vw, 62vw"
                className="block aspect-[9/14]"
                imgClassName="h-full w-full object-cover"
                position="30% 40%"
              />
            </div>
            <figcaption
              data-reveal="fade"
              className="mt-3 ml-auto max-w-[42%] text-right text-xs text-parchment/80 lg:max-w-[48%]"
            >
              A fachada, com o poste de barbeiro na porta.
            </figcaption>
          </figure>

          <figure
            data-speed="0.12"
            className="relative -mt-40 w-[56%] sm:-mt-56 sm:w-[46%] lg:-mt-64 lg:-ml-16 lg:w-[56%]"
          >
            <div data-reveal="image" className="overflow-hidden border-[6px] border-ink">
              <Picture
                image="certificado"
                alt="Dois barbeiros na Geri Barbearia segurando um certificado do curso de corte na tesoura e uma cabeça de treino"
                sizes="(min-width: 1024px) 22vw, 46vw"
                className="block aspect-[4/5]"
                imgClassName="h-full w-full object-cover"
                position="50% 35%"
              />
            </div>
            <figcaption data-reveal="fade" className="mt-3 text-xs text-parchment/80">
              Abril de 2025: mais um certificado, em corte na tesoura.
            </figcaption>
          </figure>
        </div>
      </div>

      {/* Linha do tempo: uma sequência real, por isso numerada pelas datas */}
      <div className="container-x mt-24 lg:mt-36">
        <div data-reveal="rule" className="hairline" aria-hidden="true" />
        <ol className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
          {milestones.map((m, i) => (
            <li
              key={m.dateTime}
              data-reveal="fade"
              data-delay={String(i * 0.1)}
              className="relative border-b border-[var(--line)] py-8 sm:border-b-0 lg:pr-6"
            >
              <span aria-hidden="true" className="absolute -top-[4px] left-0 h-[7px] w-[7px] rotate-45 bg-gold" />
              <time dateTime={m.dateTime} className="block pt-3 text-sm text-gold">
                {m.date}
              </time>
              <h3 className="mt-3 text-[1.65rem] leading-tight">{m.title}</h3>
              <p className="mt-2 max-w-[18rem] text-[0.95rem] text-bone/70">{m.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

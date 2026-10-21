import { googleRating, links, reviewHighlights } from '../data/site';
import { ArrowUpRight, Star, StarHalf } from './ui/Icons';
import { Reveal } from './ui/Reveal';

export function Testimonials() {
  const full = Math.floor(googleRating.value);
  const half = googleRating.value - full >= 0.5;

  return (
    <section id="avaliacoes" aria-labelledby="avaliacoes-titulo" className="bg-bone py-24 md:py-32">
      <div className="mx-auto grid max-w-[1440px] gap-14 px-5 md:px-10 lg:grid-cols-12 lg:gap-10">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow flex items-center gap-4 text-stone">
            <span className="font-display text-sm normal-case italic tracking-normal text-honey-deep">06</span>
            <span className="h-px w-8 bg-current opacity-40" aria-hidden />
            Avaliações
          </p>
          <h2 id="avaliacoes-titulo" className="sr-only">
            Avaliações no Google
          </h2>
          <div className="mt-10 flex items-end gap-5">
            <span className="display text-[6.5rem] leading-[0.8] md:text-[8rem]">{googleRating.value.toLocaleString('pt-BR')}</span>
            <div className="pb-2">
              <div className="flex gap-1 text-honey-deep" role="img" aria-label={`Nota ${googleRating.value.toLocaleString('pt-BR')} de 5`}>
                {Array.from({ length: full }, (_, i) => (
                  <Star key={i} width={18} height={18} />
                ))}
                {half && <StarHalf width={18} height={18} />}
              </div>
              <p className="mt-2 text-sm text-stone">{googleRating.count} avaliações no Google</p>
            </div>
          </div>
          <a
            href={links.googleMaps}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-10 inline-flex min-h-11 items-center gap-3 text-sm font-medium"
          >
            <span className="link-line pb-0.5">Ler todas as avaliações</span>
            <ArrowUpRight width={16} height={16} className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </Reveal>

        <div className="lg:col-span-7 lg:col-start-6">
          <ul className="space-y-12">
            {reviewHighlights.map((quote, i) => (
              <Reveal as="li" key={quote} delay={i * 0.1}>
                <figure>
                  <blockquote>
                    <p className="display text-pretty text-[1.9rem] leading-[1.2] md:text-[2.75rem]">
                      <span className="text-honey-deep">“</span>
                      {quote}
                      <span className="text-honey-deep">”</span>
                    </p>
                  </blockquote>
                  <figcaption className="eyebrow mt-5 text-[0.6rem] text-stone">Cliente · avaliação no Google</figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
          <p className="mt-12 max-w-lg text-xs leading-relaxed text-stone">
            Trechos de avaliações públicas destacados pelo Google no perfil do salão, reproduzidos sem edição.
          </p>
        </div>
      </div>
    </section>
  );
}

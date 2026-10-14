import { aboutImage, business, pillars, profile } from '../data/site';
import { Logo } from './ui/Logo';
import { Picture } from './ui/Picture';
import { Reveal, RevealImage, RevealLines } from './ui/Reveal';
import { SectionLabel } from './ui/SectionLabel';

export function About() {
  return (
    <section id="sobre" aria-labelledby="sobre-title" className="paper torn-top relative overflow-hidden py-20 md:py-32">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-10">
        {/* Retrato */}
        <div className="relative lg:col-span-5 lg:pt-6">
          <RevealImage className="relative mx-auto w-[88%] max-w-md -rotate-[1.5deg] lg:mx-0 lg:w-full">
            <span className="tape -top-3 left-1/2 -translate-x-1/2 rotate-2" aria-hidden="true" />
            <figure className="border-[7px] border-chalk bg-chalk shadow-[12px_12px_0_0_rgb(11_11_11/0.16)]">
              {aboutImage ? (
                <div className="group grain overflow-hidden">
                  <Picture
                    image={aboutImage}
                    sizes="(min-width: 1024px) 34vw, 88vw"
                    className="photo-bw aspect-[4/5] h-auto w-full object-cover"
                  />
                </div>
              ) : (
                <div className="concrete grid aspect-[4/5] place-items-center p-10">
                  <Logo decorative className="h-auto w-4/5" />
                </div>
              )}
              <figcaption className="flex items-center justify-between gap-4 bg-chalk px-1 pb-1 pt-3 text-ink">
                <span className="poster text-2xl">{business.barber}</span>
                <span className="tag text-ash">Barbeiro responsável</span>
              </figcaption>
            </figure>
          </RevealImage>
        </div>

        {/* Texto */}
        <div className="lg:col-span-7 lg:col-start-6 lg:pl-8">
          <SectionLabel index="01" tone="dark">
            A barbearia
          </SectionLabel>
          <h2 id="sobre-title" className="poster mt-6 text-[clamp(3.25rem,8.2vw,7.5rem)] text-ink">
            <RevealLines lines={['Por trás de', 'cada corte,', <span className="poster-outline-ink">uma identidade.</span>]} />
          </h2>

          <Reveal delay={0.1}>
            <p className="mt-8 max-w-xl text-pretty text-xl font-medium leading-snug text-ink md:text-2xl">
              {business.barber}, responsável pela {business.name}. Técnica, precisão e personalidade para entregar um corte que
              combina com você.
            </p>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mt-8 inline-flex -rotate-1 items-center gap-3 bg-ink px-4 py-2.5 text-paper">
              <span className="poster text-xl md:text-2xl">“{profile.tagline}”</span>
            </p>
          </Reveal>

          <ol className="mt-14 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {pillars.map((p, i) => (
              <Reveal as="li" key={p.title} delay={0.12 + i * 0.08} className="border-t-[3px] border-ink pt-4">
                <p className="tag text-ash">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="poster mt-2 text-[2rem] text-ink">{p.title}</h3>
                <p className="mt-2 text-pretty text-ash">{p.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

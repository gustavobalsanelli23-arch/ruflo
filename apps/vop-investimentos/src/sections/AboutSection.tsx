import { m, useReducedMotion } from 'framer-motion';
import { Aperture } from '../components/Aperture';
import { BlurText } from '../components/BlurText';
import { Parallax } from '../components/Parallax';
import { Picture } from '../components/Picture';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import { about } from '../data/content';
import { photos } from '../data/media';
import { EASE_CINEMA } from '../lib/motion';

export function AboutSection() {
  const reduce = useReducedMotion();
  return (
    <section id="sobre" aria-labelledby="sobre-titulo" className="section-y relative bg-ebony">
      <div className="container-x">
        <BlurText
          as="h2"
          id="sobre-titulo"
          lines={about.title}
          className="display display-lg max-w-[22ch] lg:max-w-none"
          lineClassName={(i) => (i === 1 ? 'lg:pl-[2.2em] text-linen/70' : undefined)}
          breakOnMobile={false}
        />

        <div className="mt-16 grid gap-14 md:mt-24 lg:grid-cols-12 lg:gap-10">
          <Aperture className="relative aspect-[4/5] overflow-hidden rounded-[4px] md:aspect-[16/10] lg:col-span-5 lg:aspect-[4/5]">
            <Parallax range={6}>
              <Picture
                slot={photos.piscinaInterna}
                sizes="(min-width: 1024px) 38vw, 100vw"
                className="block size-full"
                imgClassName="size-full object-cover"
                position="50% 50%"
              />
            </Parallax>
          </Aperture>

          <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
            {about.foundedYear && (
              <Reveal as="p" className="kicker mb-5">
                Desde {about.foundedYear}
              </Reveal>
            )}
            <Reveal as="p" className="font-serif text-[clamp(1.5rem,1.1rem+1.2vw,2.15rem)] leading-[1.28] text-linen">
              {about.philosophy}
            </Reveal>

            {about.history.map((paragraph) => (
              <Reveal as="p" key={paragraph} className="mt-6 text-[1.0625rem] leading-relaxed text-linen/75">
                {paragraph}
              </Reveal>
            ))}

            <RevealGroup as="dl" step={0.1} className="mt-14 grid gap-x-10 gap-y-9 sm:grid-cols-2">
              {about.differentials.map((d) => (
                <RevealItem key={d.title} className="border-t border-line pt-5">
                  <dt className="text-[1.0625rem] font-medium">{d.title}</dt>
                  <dd className="mt-2 text-[0.9375rem] leading-relaxed text-mineral">{d.text}</dd>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>

        {about.team.length > 0 && (
          <div className="mt-24 md:mt-36">
            <BlurText as="h3" lines={['Quem atende você']} className="display display-md" />
            <RevealGroup as="ul" step={0.1} className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {about.team.map((person) => (
                <RevealItem as="li" key={person.name}>
                  {person.photo && (
                    <Picture
                      slot={person.photo}
                      sizes="(min-width: 1024px) 22vw, (min-width: 640px) 46vw, 100vw"
                      className="mb-5 block aspect-[4/5] overflow-hidden rounded-[4px]"
                      imgClassName="size-full object-cover"
                    />
                  )}
                  <p className="text-[1.0625rem] font-medium">{person.name}</p>
                  <p className="mt-1 text-[0.9375rem] text-mineral">
                    {person.role}
                    {person.creci && <span className="block text-[0.8125rem]">CRECI {person.creci}</span>}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        )}

        <div className="mt-24 md:mt-36">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <BlurText as="h3" lines={['Como funciona o atendimento']} className="display display-md" />
            <Reveal as="p" className="max-w-sm text-[0.9375rem] text-mineral">
              Do primeiro contato à escritura, com um especialista acompanhando cada etapa.
            </Reveal>
          </div>

          <div className="relative mt-12">
            <m.span
              aria-hidden="true"
              data-reveal
              className="absolute left-0 right-0 top-[1.35rem] hidden h-px origin-left bg-champagne/50 md:block"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={reduce ? { duration: 0 } : { duration: 1.8, ease: EASE_CINEMA }}
            />
            <RevealGroup as="ol" step={0.15} delay={0.2} className="grid gap-10 md:grid-cols-4 md:gap-8">
              {about.process.map((step, i) => (
                <RevealItem as="li" key={step.title} className="relative grid grid-cols-[3rem_1fr] gap-x-4 md:block">
                  <span className="display relative flex size-11 items-center justify-center rounded-full bg-ebony text-[1.35rem] text-champagne ring-1 ring-champagne/50">
                    {i + 1}
                  </span>
                  <div className="md:mt-7">
                    <h4 className="text-[1.0625rem] font-medium">{step.title}</h4>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-mineral">{step.text}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Aperture } from '../components/Aperture';
import { BlurText } from '../components/BlurText';
import { Parallax } from '../components/Parallax';
import { Picture } from '../components/Picture';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import { intro, services } from '../data/content';
import { photos } from '../data/media';

export function IntroSection() {
  return (
    <section id="inteligencia" aria-labelledby="inteligencia-titulo" className="section-y relative bg-night">
      <div className="container-x grid gap-y-16 lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-7">
          <BlurText as="h2" id="inteligencia-titulo" lines={intro.title} className="display display-lg" />
          <Reveal as="p" className="lede mt-8 md:mt-10" delay={0.2}>
            {intro.text}
          </Reveal>

          <div className="mt-16 md:mt-24">
            <Reveal as="p" className="kicker mb-5">
              O que a VOP faz
            </Reveal>
            <RevealGroup as="ul" step={0.08} className="border-b border-line">
              {services.items.map((s) => (
                <RevealItem
                  as="li"
                  key={s.name}
                  className="group relative grid gap-1 border-t border-line py-5 sm:grid-cols-12 sm:gap-6 sm:py-6"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-[-1px] h-px w-0 bg-champagne transition-[width] duration-700 ease-out group-hover:w-full"
                  />
                  <h3 className="text-[1.0625rem] font-medium text-linen sm:col-span-5">{s.name}</h3>
                  <p className="text-[0.9375rem] leading-relaxed text-mineral sm:col-span-7">{s.description}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>

        <div className="relative lg:col-span-5 lg:mt-48">
          <Aperture className="relative aspect-[4/5] overflow-hidden rounded-[4px] md:aspect-[16/11] lg:aspect-[4/5]">
            <Parallax range={7}>
              <Picture
                slot={photos.edificioPedestre}
                sizes="(min-width: 1024px) 38vw, 100vw"
                className="block size-full"
                imgClassName="size-full object-cover"
                position="62% 50%"
              />
            </Parallax>
          </Aperture>
          <Aperture
            from="bottom"
            delay={0.35}
            className="relative -mt-24 ml-auto aspect-[3/2] w-[58%] overflow-hidden rounded-[4px] ring-8 ring-night sm:-mt-32 xl:-ml-[22%] xl:mr-auto"
          >
            <Picture slot={photos.escadaLuz} sizes="(min-width: 1024px) 22vw, 58vw" className="block size-full" imgClassName="size-full object-cover slow-zoom" />
          </Aperture>
        </div>
      </div>
    </section>
  );
}

import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { experienceMedia, experienceSteps, whatsappLink } from '../data/site';
import { ArrowIcon } from './ui/Icons';
import { Picture } from './ui/Picture';
import { Reveal, RevealImage, RevealLines } from './ui/Reveal';

/** Vídeo em loop, sem som: só carrega e toca quando entra na tela (e nunca com movimento reduzido). */
function LoopVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(true);
  const { video } = experienceMedia;

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play()
            .then(() => setPaused(false))
            .catch(() => setPaused(true));
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused)
      el.play()
        .then(() => setPaused(false))
        .catch(() => undefined);
    else {
      el.pause();
      setPaused(true);
    }
  };

  return (
    <div className="relative size-full">
      <video
        ref={ref}
        className="size-full object-cover"
        poster={video.poster}
        width={video.width}
        height={video.height}
        muted
        loop
        playsInline
        preload="none"
        aria-label="Vídeo: cabelo escuro, longo e brilhante balançando após o botox capilar"
      >
        <source src={video.webm} type="video/webm" />
        <source src={video.mp4} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        className="absolute bottom-4 left-4 flex h-10 items-center gap-2.5 bg-ink/45 px-4 text-[0.625rem] font-medium uppercase tracking-[0.28em] text-ivory backdrop-blur-md transition-colors hover:bg-ink/70"
      >
        <span className="relative flex size-2.5 items-center justify-center" aria-hidden="true">
          {paused ? (
            <span className="border-y-[5px] border-l-[8px] border-y-transparent border-l-current" />
          ) : (
            <span className="flex gap-[3px]">
              <span className="h-2.5 w-[2px] bg-current" />
              <span className="h-2.5 w-[2px] bg-current" />
            </span>
          )}
        </span>
        {paused ? 'Reproduzir vídeo' : 'Pausar vídeo'}
      </button>
    </div>
  );
}

export function Experience() {
  return (
    <section
      id="experiencia"
      aria-labelledby="experiencia-titulo"
      className="relative overflow-hidden bg-cream py-24 md:py-36"
    >
      <div className="container-x grid gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="relative lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <RevealImage className="aspect-[3/4] overflow-hidden bg-linen">
              <LoopVideo />
            </RevealImage>
            <RevealImage
              delay={0.3}
              className="absolute -bottom-12 -right-3 aspect-[3/4] w-[42%] overflow-hidden border-[6px] border-cream sm:-right-8 lg:-right-20"
            >
              <Picture
                image={experienceMedia.wash}
                sizes="(min-width: 1024px) 16vw, 42vw"
                className="size-full object-cover"
              />
            </RevealImage>
          </div>
        </div>

        <div className="pt-10 lg:col-span-6 lg:col-start-7 lg:pt-0">
          <Reveal>
            <p className="eyebrow eyebrow-rule text-bronze">04 — Experiência</p>
          </Reveal>
          <RevealLines
            as="h2"
            id="experiencia-titulo"
            className="display mt-6 text-[clamp(2.75rem,6.4vw,5.5rem)] text-espresso"
            lines={[
              'Um momento',
              <>
                <em className="italic text-bronze">só seu.</em>
              </>,
            ]}
          />
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-lg font-display text-[1.625rem] leading-[1.25] text-espresso">
              Seu momento de autocuidado merece um cuidado especial.
            </p>
            <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-cafe md:text-base">
              Um estúdio claro, com luz natural e espelhos iluminados, pensado para você relaxar enquanto cuidamos dos
              seus fios — sem pressa e com atenção a cada detalhe.
            </p>
          </Reveal>

          <ol className="mt-14">
            {experienceSteps.map((step, i) => (
              <Reveal
                as="li"
                key={step.title}
                delay={0.06 * i}
                className="group grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-espresso/12 py-8 last:border-b md:grid-cols-[5rem_1fr]"
              >
                <span className="font-display text-[2.5rem] italic leading-none text-bronze/70 transition-colors duration-500 group-hover:text-bronze">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[0.75rem] font-medium uppercase tracking-[0.26em] text-espresso">{step.title}</h3>
                  <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-cafe">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal className="mt-12">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              Reservar meu horário
              <ArrowIcon className="btn-arrow h-3 w-7" />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

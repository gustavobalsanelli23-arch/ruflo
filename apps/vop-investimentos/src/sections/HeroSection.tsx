import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { BlurText } from '../components/BlurText';
import { FadingVideo } from '../components/FadingVideo';
import { Magnetic } from '../components/Magnetic';
import { Picture } from '../components/Picture';
import { hero } from '../data/content';
import { heroClips, videoSources } from '../data/media';
import { REDUCED_MOTION, useMediaQuery } from '../hooks/useMediaQuery';

export function HeroSection() {
  const portrait = useMediaQuery('(orientation: portrait) and (max-width: 900px)');
  const reduceQuery = useMediaQuery(REDUCED_MOTION);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const sources = useMemo(() => heroClips.map((c) => videoSources(c, portrait ? 'portrait' : 'landscape')), [portrait]);
  const hasVideo = !reduceQuery && !unavailable;
  // Entradas da primeira dobra em CSS (.intro-anim): começam na primeira pintura.
  const at = (delay: number, dur = 0.8) => ({ '--delay': `${delay}s`, '--dur': `${dur}s` }) as CSSProperties;

  return (
    <section id="inicio" aria-label="Apresentação" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-night">
      {/* Fundo: pôster (primeira pintura) e, por cima, a sequência de vídeos.
          Entre um capítulo e outro o vídeo passa pelo preto, como num corte de cinema. */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-out"
          style={{ opacity: playing ? 0 : 1 }}
          aria-hidden={playing || undefined}
        >
          <Picture
            slot={heroClips[0].poster}
            alt=""
            sizes="100vw"
            priority
            className="block size-full"
            imgClassName="size-full object-cover slow-zoom"
          />
        </div>
        <FadingVideo
          src={sources}
          paused={paused}
          className="absolute inset-0 size-full object-cover"
          onIndexChange={setIndex}
          onReady={() => setPlaying(true)}
          onProgress={setProgress}
          onUnavailable={() => setUnavailable(true)}
        />
        {/* Leitura do texto: base densa, topo para a navbar, lateral para o título.
            No celular em pé o texto ocupa quase toda a altura: o véu é mais forte. */}
        <div className="absolute inset-0 bg-night/35 md:bg-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(5_5_5/0.6)_0%,rgb(5_5_5/0.15)_24%,rgb(5_5_5/0.55)_52%,rgb(5_5_5/0.95)_100%)] md:bg-[linear-gradient(180deg,rgb(5_5_5/0.55)_0%,rgb(5_5_5/0.05)_22%,rgb(5_5_5/0.15)_50%,rgb(5_5_5/0.92)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(5_5_5/0.68)_0%,rgb(5_5_5/0.2)_45%,rgb(5_5_5/0)_68%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgb(5_5_5/0.5)_100%)]" />
      </div>

      <div className="container-x relative mt-auto pb-6 pt-32 sm:pb-8">
        <p
          style={at(0.3)}
          className="intro-anim liquid-glass mb-7 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-linen/90"
        >
          <span aria-hidden="true" className="size-1 rounded-full bg-champagne" />
          {hero.badge}
        </p>

        <BlurText
          as="h1"
          lines={hero.headline}
          delay={0.45}
          immediate
          className="display display-xl text-shadow-soft"
          lineClassName={(i) => (i === 2 ? 'sm:pl-[1.4em]' : undefined)}
        />

        <div className="mt-10 grid gap-8 border-t border-line pt-7 md:mt-12 lg:grid-cols-12 lg:items-end">
          <p style={at(0.9)} className="intro-anim lede lg:col-span-5">
            {hero.subheadline}
          </p>
          <div style={at(1.05)} className="intro-anim flex flex-col gap-3 xs:flex-row lg:col-span-7 lg:justify-end">
            <Magnetic>
              <a href="#imoveis" className="btn btn-solid w-full xs:w-auto">
                Explorar oportunidades
                <ArrowUpRight className="btn-icon" size={18} strokeWidth={1.6} aria-hidden="true" />
              </a>
            </Magnetic>
            <Magnetic>
              <a href="#sobre" className="btn btn-glass liquid-glass w-full xs:w-auto">
                <span>Conhecer a VOP</span>
              </a>
            </Magnetic>
          </div>
        </div>

        <div style={{ ...at(1.4, 1), '--rise': '0px' } as CSSProperties} className="intro-anim mt-8 flex items-center justify-between gap-4 sm:mt-10">
          <a href="#inteligencia" className="group inline-flex items-center gap-3 rounded-full py-2 text-[0.8125rem] text-mineral hover:text-linen">
            <span aria-hidden="true" className="relative block h-9 w-px overflow-hidden bg-linen/15">
              <span className="scroll-cue absolute inset-x-0 top-0 block h-1/3 bg-linen" />
            </span>
            Role para descobrir
          </a>

          {hasVideo && (
            <div className="flex items-center gap-2">
              <ol aria-hidden="true" className="liquid-glass hidden h-10 items-center gap-4 rounded-full px-5 sm:flex">
                {heroClips.map((clip, i) => (
                  <li key={clip.id} className="flex items-center gap-2.5">
                    <span className={['text-[0.75rem] tabular-nums transition-colors', i === index ? 'text-linen' : 'text-mute'].join(' ')}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="relative block h-px w-10 overflow-hidden bg-linen/20">
                      <span
                        className="absolute inset-0 origin-left bg-champagne transition-transform duration-300 ease-linear"
                        style={{ transform: `scaleX(${i < index ? 1 : i === index ? progress : 0})` }}
                      />
                    </span>
                    <span
                      className={[
                        'overflow-hidden whitespace-nowrap text-[0.75rem] transition-all duration-500',
                        i === index ? 'max-w-24 text-linen opacity-100' : 'max-w-0 opacity-0',
                      ].join(' ')}
                    >
                      {clip.label}
                    </span>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
                className="liquid-glass flex size-10 items-center justify-center rounded-full text-linen"
              >
                <span className="sr-only">{paused ? 'Retomar o vídeo de fundo' : 'Pausar o vídeo de fundo'}</span>
                {paused ? <Play size={14} strokeWidth={1.6} aria-hidden="true" /> : <Pause size={14} strokeWidth={1.6} aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { BlurText } from '../components/BlurText';
import { DecodeText } from '../components/Decode';
import { FadingVideo } from '../components/FadingVideo';
import { Magnetic } from '../components/Magnetic';
import { Picture } from '../components/Picture';
import { Reveal } from '../components/Reveal';
import { CtaEdge, PixelIcon } from '../components/StratumIcons';
import { resolveChannel } from '../config/site';
import { finalCta } from '../data/content';
import { ctaClip, videoSources } from '../data/media';
import { useMediaQuery } from '../hooks/useMediaQuery';

export function FinalCtaSection() {
  const channel = resolveChannel();
  const portrait = useMediaQuery('(orientation: portrait) and (max-width: 900px)');
  const [ready, setReady] = useState(false);
  return (
    <section aria-labelledby="cta-titulo" className="relative isolate flex min-h-[92svh] items-center overflow-hidden bg-night">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: ready ? 0 : 1 }}>
          <Picture slot={ctaClip.poster} alt="" sizes="100vw" className="block size-full" imgClassName="size-full object-cover slow-zoom" />
        </div>
        <FadingVideo
          src={videoSources(ctaClip, portrait ? 'portrait' : 'landscape')}
          lazy
          className="absolute inset-0 size-full object-cover"
          onReady={() => setReady(true)}
        />
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_55%,rgb(4_7_13/0.35)_0%,rgb(4_7_13/0.82)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,#070b13,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,#04070d,transparent)]" />
      </div>

      {/* A moldura do hero volta para fechar o site. */}
      <div className="st-frame pointer-events-none" aria-hidden="true">
        <span className="ln ln-t" />
        <span className="ln ln-r" />
        <span className="ln ln-b" />
        <span className="ln ln-l" />
        <span className="cn cn-tl" />
        <span className="cn cn-tr" />
        <span className="cn cn-br" />
        <span className="cn cn-bl" />
      </div>

      <div className="container-x flex flex-col items-center py-32 text-center">
        <BlurText as="h2" id="cta-titulo" lines={['Seu próximo movimento', 'começa com uma boa decisão.']} className="display display-lg text-shadow-soft max-w-[18ch] md:max-w-none" breakOnMobile={false} />
        <Reveal as="p" className="lede mx-auto mt-8 text-center" delay={0.3}>
          {finalCta.text}
        </Reveal>
        <Reveal className="mt-12 flex flex-col items-center gap-4" delay={0.5}>
          <Magnetic strength={8}>
            <a href={channel.href} target="_blank" rel="noopener noreferrer" className="cta lbl !mt-0">
              <span className="cta-glass" />
              <CtaEdge />
              <span className="cta-in">
                <PixelIcon />
                <DecodeText text={finalCta.button.toUpperCase()} onMount={false} />
              </span>
            </a>
          </Magnetic>
          <p className="text-[0.8125rem] text-mineral">
            {channel.id === 'whatsapp' ? 'Abre o WhatsApp com uma mensagem pronta.' : 'Abre o Direct do Instagram da VOP.'}{' '}
            <a href="#contato" className="link-quiet text-linen/85">
              Prefere o formulário?
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

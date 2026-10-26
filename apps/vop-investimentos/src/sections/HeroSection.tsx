import { useCallback, useEffect, useRef, useState } from 'react';
import { DecodeText } from '../components/Decode';
import { BubbleIcon, CtaEdge, DoubleChevronIcon, MotionIcon, PixelIcon } from '../components/StratumIcons';
import { chapters } from '../data/content';
import { chapterScene } from '../data/media';
import { REDUCED_MOTION, useMediaQuery } from '../hooks/useMediaQuery';

/** Tempo (ms) em que o texto desce na máscara antes de trocar de capítulo. */
const SWAP_OUT = 340;

/**
 * Hero na estética de referência: palco de uma tela com moldura de fio,
 * trilho de capítulos à esquerda, título que sobe de uma máscara, CTA de
 * vidro octogonal e dock embaixo. Cada capítulo tem uma cena em loop,
 * carregada só quando escolhida; a nova aparece por cima quando já pode
 * tocar, e o texto troca descendo e subindo na máscara. O fundo e o texto
 * seguem o ponteiro (paralaxe com inclinação 3D) e se afastam ao rolar.
 */
export function HeroSection() {
  const reduce = useMediaQuery(REDUCED_MOTION);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const [paused, setPaused] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const request = useRef(0);
  const visible = useRef(0);
  const pausedRef = useRef(false);
  const inView = useRef(true);
  const swapTimer = useRef(0);

  /** Mostra a cena `i` assim que ela puder tocar; um clique mais novo vence. */
  const showScene = useCallback((i: number) => {
    const v = videos.current[i];
    if (!v) return;
    const token = ++request.current;
    v.muted = true;
    if (!v.getAttribute('src') && v.dataset.src) {
      v.src = v.dataset.src;
      v.load();
    }
    const reveal = () => {
      if (token !== request.current) return;
      v.classList.add('on');
      visible.current = i;
      videos.current.forEach((o, j) => {
        if (!o || j === i) return;
        o.classList.remove('on');
        window.setTimeout(() => !o.classList.contains('on') && o.pause(), 900);
      });
    };
    if (pausedRef.current || !inView.current) {
      if (v.readyState >= 2) reveal();
      else v.addEventListener('loadeddata', reveal, { once: true });
      return;
    }
    v.play().catch(() => {});
    if (v.readyState >= 3) reveal();
    else v.addEventListener('canplay', reveal, { once: true });
  }, []);

  // Primeira cena depois que a página carregou (a foto parada é a primeira pintura).
  useEffect(() => {
    pausedRef.current = reduce;
    setPaused(reduce);
    if (reduce) return;
    const start = () => showScene(0);
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
  }, [reduce, showScene]);

  // Fora da tela, a cena pausa; de volta, retoma (se o vídeo estiver ligado).
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      inView.current = e.isIntersecting;
      const v = videos.current[visible.current];
      if (!v || !v.getAttribute('src')) return;
      if (e.isIntersecting && !pausedRef.current) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Paralaxe: o fundo desliza contra o ponteiro, o texto inclina em 3D a
  // favor dele; ao rolar, o fundo desce mais devagar e o texto se afasta.
  useEffect(() => {
    const el = stage.current;
    const b = bg.current;
    const c = copy.current;
    if (!el || !b || !c || reduce) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const tick = () => {
      x += (tx - x) * 0.045;
      y += (ty - y) * 0.045;
      const h = el.offsetHeight || 1;
      const s = Math.min(1, Math.max(0, window.scrollY / h));
      b.style.transform = `translate3d(${(-x * 14).toFixed(2)}px, ${(-y * 9 + s * h * 0.3).toFixed(2)}px, 0) scale(${(1.045 + s * 0.08).toFixed(4)})`;
      c.style.transform = `perspective(1100px) translate3d(${(x * 6).toFixed(2)}px, ${(-s * h * 0.12).toFixed(2)}px, ${(-s * 160).toFixed(1)}px) rotateX(${(-y * 2.4).toFixed(3)}deg) rotateY(${(x * 3.2).toFixed(3)}deg)`;
      c.style.opacity = String(Math.max(0, 1 - s * 1.5));
      raf = Math.abs(tx - x) > 0.0004 || Math.abs(ty - y) > 0.0004 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', kick, { passive: true });
    kick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', kick);
      b.style.transform = '';
      c.style.transform = '';
      c.style.opacity = '';
    };
  }, [reduce]);

  useEffect(() => () => clearTimeout(swapTimer.current), []);

  const select = (i: number) => {
    if (i === active) return;
    // Um clique durante a entrada encerra a coreografia (senão ela segura o texto).
    document.documentElement.classList.remove('anim');
    setActive(i);
    showScene(i);
    clearTimeout(swapTimer.current);
    if (reduce) {
      setShown(i);
      return;
    }
    setSwapping(true);
    swapTimer.current = window.setTimeout(() => {
      setShown(i);
      requestAnimationFrame(() => requestAnimationFrame(() => setSwapping(false)));
    }, SWAP_OUT);
  };

  const toggleVideo = () => {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    const v = videos.current[visible.current];
    if (next) {
      v?.pause();
      return;
    }
    if (v?.getAttribute('src')) v.play().catch(() => {});
    else showScene(active);
  };

  const chapter = chapters[shown];

  return (
    <section ref={stage} id="inicio" aria-label="Apresentação" className={['st-stage', swapping && 'swapping'].filter(Boolean).join(' ')}>
      <div ref={bg} className="st-bg" aria-hidden="true">
        {chapters.map((c, i) => (
          <video
            key={c.scene}
            ref={(el) => {
              videos.current[i] = el;
            }}
            data-src={chapterScene(c.scene)}
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            tabIndex={-1}
          />
        ))}
      </div>
      <div className="st-veil" aria-hidden="true" />

      {/* Moldura: os fios e os chanfros, e dentro dela o trilho, o texto e o dock. */}
      <div className="st-frame">
        <span className="ln ln-t" aria-hidden="true" />
        <span className="ln ln-r" aria-hidden="true" />
        <span className="ln ln-b" aria-hidden="true" />
        <span className="ln ln-l" aria-hidden="true" />
        <span className="cn cn-tl" aria-hidden="true" />
        <span className="cn cn-tr" aria-hidden="true" />
        <span className="cn cn-br" aria-hidden="true" />
        <span className="cn cn-bl" aria-hidden="true" />

        <ol className="st-index" aria-label="Capítulos">
          {chapters.map((c, i) => (
            <li key={c.scene} className={i === active ? 'on' : undefined}>
              <button type="button" aria-current={i === active ? 'step' : undefined} onClick={() => select(i)}>
                <DecodeText text={c.label.toUpperCase()} delay={600 + i * 40} />
              </button>
            </li>
          ))}
        </ol>

        <div ref={copy} className="st-hero">
          <h1 className="headline">
            <span className="hrow">
              <span className="hrise">{chapter.headline[0]}</span>
            </span>{' '}
            <span className="hrow">
              <span className="hrise">{chapter.headline[1]}</span>
            </span>
          </h1>
          <p className="blurb">{chapter.blurb}</p>
          <a href="#imoveis" className="cta lbl">
            <span className="cta-glass" />
            <CtaEdge />
            <span className="cta-in">
              <PixelIcon />
              <DecodeText text="EXPLORAR OPORTUNIDADES" delay={860} />
            </span>
          </a>
        </div>

        <div className="dock lbl">
          <span className="rule" aria-hidden="true" />
          <span className="div div-l" aria-hidden="true" />
          <span className="div div-r" aria-hidden="true" />
          <button
            type="button"
            className={['audio', paused && 'muted'].filter(Boolean).join(' ')}
            onClick={toggleVideo}
            aria-label={paused ? 'Retomar o vídeo de fundo' : 'Pausar o vídeo de fundo'}
          >
            <MotionIcon />
            <DecodeText text={paused ? 'VÍDEO OFF' : 'VÍDEO ON'} delay={960} />
          </button>
          <a href="#inteligencia" className="scroll">
            <DoubleChevronIcon />
            <DecodeText text="ROLE PARA DESCOBRIR" delay={1020} />
          </a>
          <a href="#contato" className="talk">
            <DecodeText text="FALE CONOSCO" delay={1080} />
            <BubbleIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

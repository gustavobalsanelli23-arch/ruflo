import { useEffect, useRef, useState } from 'react';
import { DecodeText } from '../components/Decode';
import type { VopScene } from '../components/hero/vopScene';
import { BubbleIcon, CtaEdge, DoubleChevronIcon, MotionIcon, PixelIcon } from '../components/StratumIcons';
import { chapters } from '../data/content';
import { REDUCED_MOTION, useMediaQuery } from '../hooks/useMediaQuery';

/** Tempo (ms) em que o texto desce na máscara antes de trocar de capítulo. */
const SWAP_OUT = 340;

/**
 * Hero na estética de referência: palco de uma tela com moldura de fio,
 * trilho de capítulos à esquerda, título que sobe de uma máscara, CTA de
 * vidro octogonal e dock embaixo. Ao fundo, a casa da VOP (o símbolo da
 * marca) em 3D sobre um lago: o quadro parado pinta primeiro e a cena
 * WebGL entra por cima depois do load; cada capítulo leva a câmera a outro
 * ângulo, e o texto troca descendo e subindo na máscara. O texto inclina
 * com o ponteiro e se afasta ao rolar.
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
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<VopScene | null>(null);
  const loading = useRef<Promise<void> | null>(null);
  const activeRef = useRef(0);
  const pausedRef = useRef(false);
  const swapTimer = useRef(0);

  /** Carrega a cena 3D (three.js, num pedaço separado). Sem WebGL, fica o quadro parado. */
  const startScene = () => {
    if (loading.current || !canvas.current) return;
    const el = canvas.current;
    loading.current = import('../components/hero/vopScene')
      .then(({ createVopScene }) => {
        const s = createVopScene(el, { reduce: false, onReady: () => el.classList.add('on') });
        s.setChapter(activeRef.current, true);
        s.setPaused(pausedRef.current);
        scene.current = s;
      })
      .catch(() => {
        /* sem WebGL: o quadro parado continua */
      });
  };

  // Depois do load e da coreografia de entrada (o quadro parado é a primeira
  // pintura; compilar a cena antes disso atrasaria o texto). Com "reduzir
  // movimento", nada carrega: o quadro parado basta, e o 3D ON liga a cena.
  useEffect(() => {
    pausedRef.current = reduce;
    setPaused(reduce);
    if (reduce) return;
    const html = document.documentElement;
    const watch = new MutationObserver(() => {
      if (html.classList.contains('anim')) return;
      watch.disconnect();
      startScene();
    });
    const begin = () => {
      if (!html.classList.contains('anim')) startScene();
      else watch.observe(html, { attributes: true, attributeFilter: ['class'] });
    };
    if (document.readyState === 'complete') begin();
    else window.addEventListener('load', begin, { once: true });
    return () => {
      watch.disconnect();
      window.removeEventListener('load', begin);
    };
    // startScene só lê e escreve refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  useEffect(() => () => scene.current?.dispose(), []);

  // Fora da tela, a cena para de desenhar.
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => scene.current?.setActive(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Paralaxe: o texto inclina em 3D a favor do ponteiro (a câmera da cena já
  // segue o ponteiro); ao rolar, o fundo desce mais devagar e o texto se afasta.
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
      b.style.transform = `translate3d(0, ${(s * h * 0.3).toFixed(2)}px, 0) scale(${(1 + s * 0.08).toFixed(4)})`;
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
    activeRef.current = i;
    scene.current?.setChapter(i);
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

  const toggleMotion = () => {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    if (scene.current) scene.current.setPaused(next);
    else if (!next) startScene();
  };

  const chapter = chapters[shown];

  return (
    <section ref={stage} id="inicio" aria-label="Apresentação" className={['st-stage', swapping && 'swapping'].filter(Boolean).join(' ')}>
      <div ref={bg} className="st-bg" aria-hidden="true">
        <canvas ref={canvas} />
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
            <li key={c.label} className={i === active ? 'on' : undefined}>
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
            onClick={toggleMotion}
            aria-label={paused ? 'Retomar a animação 3D' : 'Pausar a animação 3D'}
          >
            <MotionIcon />
            <DecodeText text={paused ? '3D OFF' : '3D ON'} delay={960} />
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

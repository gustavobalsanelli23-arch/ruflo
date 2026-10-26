import { useCallback, useEffect, useRef, useState } from 'react';

const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Todo rótulo se resolve no mesmo tempo, qualquer que seja o tamanho. */
const DUR = 400;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const fontsReady = () => (typeof document !== 'undefined' && document.fonts?.ready) || Promise.resolve();

/** Largura natural de `text` no lugar de `el` (mede uma cópia invisível, não o quadro sorteado). */
function measure(el: HTMLElement, text: string): number {
  const probe = el.cloneNode(false) as HTMLElement;
  probe.removeAttribute('style');
  probe.style.cssText = 'position:absolute;visibility:hidden;width:auto';
  probe.textContent = text;
  el.parentNode?.insertBefore(probe, el);
  const w = probe.getBoundingClientRect().width;
  probe.remove();
  return w;
}

/**
 * Texto do quadro `now` de uma decodificação: os caracteres já resolvidos,
 * seguidos de uma faixa de 3,6 letras aleatórias e nada depois dela.
 */
export function decodeFrame(text: string, progress: number, rand: readonly string[]): string {
  const n = text.length;
  const front = Math.min(1, Math.max(0, progress)) * n;
  let out = '';
  for (let i = 0; i < n; i++) {
    const c = text.charAt(i);
    if (i < front) out += c;
    else if (i < front + 3.6) out += c === ' ' ? ' ' : rand[i];
    else break;
  }
  return out;
}

interface DecodeTextProps {
  text: string;
  /** Atraso (ms) da primeira decodificação, contado de quando as fontes ficam prontas. */
  delay?: number;
  /** Decodifica ao montar (padrão) — false para só no hover e nas trocas de texto. */
  onMount?: boolean;
  className?: string;
}

/**
 * Rótulo que se decodifica da esquerda para a direita em 400ms: uma faixa de
 * letras sorteadas (trocadas a cada 45ms) corre à frente do texto resolvido.
 * A largura natural é reservada antes, para a troca nunca empurrar a linha.
 * Repete quando o ponteiro entra no link ou botão que o contém, e quando o
 * texto muda (ex.: MENU → FECHAR). Com "reduzir movimento", o texto só aparece.
 */
export function DecodeText({ text, delay = 0, onMount = true, className }: DecodeTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);
  const anim = useRef<{ raf: number; timer: number }>({ raf: 0, timer: 0 });
  const target = useRef(text);
  target.current = text;

  const settle = useCallback(() => {
    cancelAnimationFrame(anim.current.raf);
    clearTimeout(anim.current.timer);
    anim.current = { raf: 0, timer: 0 };
    setShown(target.current);
  }, []);

  const decode = useCallback(() => {
    settle();
    if (reducedMotion()) return;
    const value = target.current;
    const n = value.length;
    const rand: string[] = new Array(n);
    const roll = () => {
      for (let i = 0; i < n; i++) rand[i] = CH.charAt((Math.random() * 26) | 0);
    };
    roll();
    const t0 = performance.now();
    let lastRoll = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      if (now - lastRoll > 45) {
        roll();
        lastRoll = now;
      }
      setShown(decodeFrame(value, p, rand));
      if (p < 1) anim.current.raf = requestAnimationFrame(step);
      else settle();
    };
    anim.current.raf = requestAnimationFrame(step);
    // Com quadros estrangulados (aba em segundo plano), resolve sozinho.
    anim.current.timer = window.setTimeout(settle, DUR + 500);
  }, [settle]);

  // Reserva a largura natural (com as fontes prontas, a cada redimensionamento
  // e quando o texto muda), para a faixa sorteada nunca empurrar a linha.
  const reserve = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const w = measure(el, target.current);
    el.style.width = w ? `${Math.ceil(w * 100) / 100}px` : '';
  }, []);

  useEffect(() => {
    let timer = 0;
    fontsReady().then(reserve);
    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(reserve, 160);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [reserve]);

  // Primeira decodificação (entrada) e repetição no hover do link/botão.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    if (onMount) fontsReady().then(() => (timer = window.setTimeout(decode, delay)));
    const host = el.closest('a, button');
    host?.addEventListener('pointerenter', decode);
    return () => {
      clearTimeout(timer);
      host?.removeEventListener('pointerenter', decode);
      cancelAnimationFrame(anim.current.raf);
      clearTimeout(anim.current.timer);
    };
  }, [decode, delay, onMount]);

  // Texto novo (ex.: MENU → FECHAR, VÍDEO ON → OFF): decodifica até ele.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    reserve();
    decode();
  }, [text, decode, reserve]);

  // As letras sorteadas não são lidas: o leitor de tela recebe o texto final.
  return (
    <>
      <span ref={ref} aria-hidden="true" className={['t', className].filter(Boolean).join(' ')}>
        {shown}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}

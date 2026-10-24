// Arquitetura de movimento:
//  - abertura do hero: Web Animations API (src/lib/intro.ts), nativa, sem custo;
//  - rolagem: GSAP (ScrollTrigger + SplitText) e Lenis para suavizar a roda do
//    mouse no desktop. Nada de bibliotecas duplicadas.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

export { gsap, ScrollTrigger, SplitText };

export const EASE = {
  out: 'expo.out',
  inOut: 'power4.inOut',
  soft: 'power3.out',
} as const;

/**
 * Toca uma vez ao entrar e nunca reverte — como `once: true`, mas sem matar o
 * gatilho: um `once` que dispara durante um recálculo (página já rolada além
 * dele, ex.: ao girar o celular) remove-se da lista no meio do ScrollTrigger.refresh.
 */
export const PLAY_ONCE = { toggleActions: 'play none none none' } as const;

let registered = false;

export function setupGsap() {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: EASE.out, duration: 1.1 });
  registered = true;
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Roda `fn` quando a thread principal estiver livre (ou após `timeout` ms).
 * Usado para montar animações abaixo da dobra sem atrasar a primeira pintura.
 * Devolve a função que cancela o agendamento.
 */
export function whenIdle(fn: () => void, timeout = 1200): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 200);
  return () => window.clearTimeout(id);
}

// ── Rolagem suave ──────────────────────────────────────────────────────────
let lenis: Lenis | null = null;

/** Lenis só suaviza a roda do mouse; toque e teclado continuam nativos. */
export function startSmoothScroll() {
  if (lenis || prefersReducedMotion()) return lenis;
  setupGsap();
  lenis = new Lenis({ lerp: 0.11, smoothWheel: true, anchors: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? 'hidden' : '';
}

/** Rola até uma âncora (suave com Lenis) respeitando o reduced-motion. */
export function scrollToHash(hash: string) {
  const target = hash === '#topo' ? document.body : document.querySelector<HTMLElement>(hash);
  if (!target) return;
  // Se veio do menu mobile, a rolagem ainda está travada: libera antes de rolar.
  lockScroll(false);
  if (lenis) {
    lenis.scrollTo(target === document.body ? 0 : target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else {
    const top = target === document.body ? 0 : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
  // Leva o foco junto, para teclado e leitores de tela.
  if (target !== document.body) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  history.replaceState(null, '', hash === '#topo' ? window.location.pathname : hash);
}

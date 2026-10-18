// Arquitetura de movimento: GSAP (timelines + ScrollTrigger + SplitText + DrawSVG)
// e Lenis para a rolagem suave no desktop. Nada de bibliotecas duplicadas.
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

export { gsap, ScrollTrigger, SplitText };

export const EASE = {
  out: 'expo.out',
  inOut: 'power4.inOut',
  soft: 'power3.out',
} as const;

let registered = false;

export function setupGsap() {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
  gsap.defaults({ ease: EASE.out, duration: 1.1 });
  registered = true;
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ── Rolagem suave ──────────────────────────────────────────────────────────
let lenis: Lenis | null = null;

/** Lenis só suaviza a roda do mouse; toque e teclado continuam nativos. */
export function startSmoothScroll() {
  if (lenis || prefersReducedMotion()) return lenis;
  setupGsap();
  lenis = new Lenis({ lerp: 0.12, smoothWheel: true, anchors: false });
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
  // As seções já têm respiro interno generoso: alinhamos o topo delas ao topo da tela.
  if (lenis) {
    lenis.scrollTo(target === document.body ? 0 : target, { duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
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

// ── Portão da abertura: o hero só começa quando a cortina abre ──────────────
let releaseIntro: () => void = () => {};
export const introGate = new Promise<void>((resolve) => {
  releaseIntro = resolve;
});
export function openIntroGate() {
  releaseIntro();
}

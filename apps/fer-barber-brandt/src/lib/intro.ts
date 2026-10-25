// Abertura do hero com a Web Animations API: uma única timeline coordenada,
// declarada no markup com data-intro. A ordem:
//   1. logo e navegação  2. fotografia (máscara)  3. identificação
//   4–5. as duas linhas do nome  6. descrição  7. agendamento  8. complementos
//
// Este arquivo não importa nada: o build o transpila e embute no HTML
// (scripts/prerender.mjs), logo depois do hero, para a abertura começar
// durante o carregamento da página, sem esperar o bundle do React.
//
// Como funciona sem deixar nada preso:
//  - o script do <head> põe .js-intro em <html> (opacity 0 nos data-intro);
//  - aqui, depois das fontes e da foto principal, cada elemento recebe uma
//    animação com fill: 'backwards' (segura o quadro inicial durante o atraso)
//    e só então a classe sai — sem piscar;
//  - durante a abertura, .intro-running em <html> liga o will-change; ao
//    terminar, as animações são canceladas e a classe sai: os elementos voltam
//    ao CSS normal, sem nenhum estilo inline ou temporário;
//  - se o JS não carregar, o timer do <head> retira a classe e tudo aparece.

type Frames = Keyframe[];

interface Step {
  intro: string;
  frames: Frames;
  /** Início em ms, relativo ao começo da timeline. */
  at: number;
  duration: number;
  stagger?: number;
  easing?: string;
}

const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
const QUART = 'cubic-bezier(0.76, 0, 0.24, 1)';

// Opacidade inicial 0.001 (igual ao CSS de espera): ver index.css.
const rise = (y: number): Frames => [
  { opacity: 0.001, transform: `translate3d(0, ${y}px, 0)` },
  { opacity: 1, transform: 'translate3d(0, 0, 0)' },
];

/** Linha do título: sobe por trás do container com overflow hidden. */
const LINE: Frames = [{ transform: 'translate3d(0, 108%, 0)' }, { transform: 'translate3d(0, 0, 0)' }];

function timeline(compact: boolean): Step[] {
  // No celular a sequência é mais curta, com deslocamentos menores e sem
  // esconder a descrição e o botão.
  const k = compact ? 0.62 : 1;
  const t = (ms: number) => Math.round(ms * k);
  return [
    { intro: 'nav', frames: rise(compact ? -8 : -14), at: 0, duration: t(900), stagger: t(70) },
    { intro: 'mask', frames: [{ transform: 'translate3d(0, 101%, 0)' }, { transform: 'translate3d(0, 0, 0)' }], at: t(120), duration: t(1500), easing: QUART },
    { intro: 'unmask', frames: [{ transform: 'translate3d(0, -101%, 0)' }, { transform: 'translate3d(0, 0, 0)' }], at: t(120), duration: t(1500), easing: QUART },
    { intro: 'zoom', frames: [{ transform: 'scale(1.24)' }, { transform: 'scale(1)' }], at: t(120), duration: t(2800) },
    { intro: 'eyebrow', frames: rise(compact ? 10 : 16), at: t(650), duration: t(900) },
    { intro: 'line', frames: LINE, at: t(760), duration: t(1300), stagger: t(170) },
    // No celular, descrição e agendamento já estão na tela (ver index.css).
    ...(compact
      ? []
      : [
          { intro: 'text', frames: rise(20), at: 1250, duration: 1000, stagger: 90 },
          { intro: 'cta', frames: rise(18), at: 1420, duration: 1000, stagger: 90 },
        ]),
    { intro: 'tick', frames: [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], at: t(1550), duration: t(1500), easing: QUART },
    { intro: 'extra', frames: rise(compact ? 8 : 12), at: t(1650), duration: t(1000), stagger: t(80) },
  ];
}

/** Espera fontes e foto principal, mas nunca mais que `cap` ms. */
function ready(cap: number): Promise<void> {
  const img = document.querySelector<HTMLImageElement>('[data-hero-photo] img');
  const image = !img
    ? Promise.resolve()
    : img.complete
      ? img.decode().catch(() => undefined)
      : new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        });
  const fonts = document.fonts?.ready ?? Promise.resolve();
  return Promise.race([
    Promise.all([fonts, image]).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, cap)),
  ]);
}

declare global {
  interface Window {
    /** A abertura já assumiu (cancela o timer de segurança do <head>). */
    __fbbIntro?: boolean;
  }
}

/** Toca a abertura uma vez por carregamento. Devolve a promessa do fim. */
export function playIntro(): Promise<void> {
  const html = document.documentElement;
  if (window.__fbbIntro || !html.classList.contains('js-intro')) return Promise.resolve();
  window.__fbbIntro = true;

  return ready(1600).then(() => {
    const compact = !window.matchMedia('(min-width: 1024px)').matches;
    const animations: Animation[] = [];
    html.classList.add('intro-running');

    for (const step of timeline(compact)) {
      const els = [...document.querySelectorAll<HTMLElement>(`[data-intro="${step.intro}"]`)].filter(
        (el) => el.getClientRects().length > 0,
      );
      els.forEach((el, i) => {
        animations.push(
          el.animate(step.frames, {
            duration: step.duration,
            delay: step.at + i * (step.stagger ?? 0),
            easing: step.easing ?? EXPO,
            fill: 'backwards',
          }),
        );
      });
    }

    // As animações já seguram o quadro inicial: a classe pode sair sem piscar.
    html.classList.remove('js-intro');

    return Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => {
      animations.forEach((a) => a.cancel());
      html.classList.remove('intro-running');
      html.classList.add('intro-done');
    });
  });
}

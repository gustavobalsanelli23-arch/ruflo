// Meta Pixel já utilizado pelo site anterior (PixelYourSite). Carregado apenas em
// produção e só após a primeira interação do visitante (rolagem, toque, clique ou
// tecla): o script do Facebook pesa ~260 KB e bloquearia o carregamento inicial.
const META_PIXEL_ID = '745935314478201';

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export function initAnalytics() {
  if (!import.meta.env.PROD || typeof window === 'undefined' || window.fbq) return;
  const load = () => {
    const fbq: Fbq = function (...args: unknown[]) {
      (fbq.queue = fbq.queue || []).push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
    fbq('init', META_PIXEL_ID);
    fbq('track', 'PageView');
  };
  const events = ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const;
  const onFirstInteraction = () => {
    events.forEach((e) => window.removeEventListener(e, onFirstInteraction));
    load();
  };
  events.forEach((e) => window.addEventListener(e, onFirstInteraction, { once: true, passive: true }));
}

/** Eventos de conversão: Schedule (agendamento) e Contact (WhatsApp). */
export function track(event: 'Schedule' | 'Contact' | 'FindLocation', data?: Record<string, string>) {
  window.fbq?.('track', event, data);
}

// Ferramentas de medição já usadas pelo site anterior (vipbodyhair.com.br):
// Google Tag Manager e Meta Pixel. São carregadas apenas em produção e só após a
// primeira interação do visitante (rolagem, toque, clique ou tecla), para não
// pesarem no carregamento inicial da página.
const GTM_ID = 'GTM-TCVTRV6';
const META_PIXEL_ID = '239164310433263';

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    dataLayer?: Record<string, unknown>[];
  }
}

function loadScript(src: string) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function loadGtm() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  loadScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
}

function loadPixel() {
  if (window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    (fbq.queue = fbq.queue || []).push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  window.fbq = fbq;
  window._fbq = fbq;
  loadScript('https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', META_PIXEL_ID);
  fbq('track', 'PageView');
}

export function initAnalytics() {
  if (!import.meta.env.PROD || typeof window === 'undefined') return;
  const events = ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const;
  const onFirstInteraction = () => {
    events.forEach((e) => window.removeEventListener(e, onFirstInteraction));
    loadGtm();
    loadPixel();
  };
  events.forEach((e) => window.addEventListener(e, onFirstInteraction, { once: true, passive: true }));
}

/** Eventos de conversão: Contact (WhatsApp/telefone), Schedule (formulário) e FindLocation (mapa). */
export function track(event: 'Contact' | 'Schedule' | 'FindLocation', data?: Record<string, string>) {
  window.fbq?.('track', event, data);
  window.dataLayer?.push({ event: `vip_${event.toLowerCase()}`, ...data });
}

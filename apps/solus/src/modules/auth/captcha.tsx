'use client';

import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile widget. Rendered inside a form, it adds the
 * `cf-turnstile-response` field the server action checks. A token is single
 * use, so the widget resets whenever `resetKey` changes (each answer from
 * the server).
 */

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi | null> | null = null;

function loadTurnstile() {
  loading ??= new Promise((resolve) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.turnstile ?? null);
    script.onerror = () => {
      loading = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function Captcha({ siteKey, resetKey }: { siteKey: string | null; resetKey?: unknown }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    void loadTurnstile().then((api) => {
      if (cancelled || !api || !container.current || widget.current) return;
      widget.current = api.render(container.current, { sitekey: siteKey, language: 'pt-br', theme: 'auto', size: 'flexible' });
    });
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  if (!siteKey) return null;
  return <div ref={container} className="min-h-[65px]" />;
}

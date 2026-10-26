// Ícones desenhados para o site (traço fino, mesma grade de 32px) e as
// marcas de Instagram e WhatsApp, que o lucide não traz.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 32 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...rest,
});

/** Análise estratégica: compasso de desenho sobre uma cota. */
export function CompassIcon({ size = 32, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="16" cy="6.5" r="1.8" />
      <path d="M15 8.2 9 25.5M17 8.2l6 17.3" />
      <path d="M11.2 19.2c3 1.4 6.6 1.4 9.6 0" />
      <path d="M5 28.5h22M5 27v3M27 27v3" />
    </svg>
  );
}

/** Inteligência de mercado: linhas de leitura sobre uma grade. */
export function LinesIcon({ size = 32, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 27.5h22M5 4.5v23" />
      <path d="M5 21.5c3.5 0 4.5-6 8-6s4 3.5 7 3.5 4-9 7-11" />
      <path d="M5 25c4 0 6-2.5 10-2.5s6 1.2 12 1.2" opacity=".5" />
      <circle cx="27" cy="7.9" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Segurança na operação: escudo com a chave de uma casa. */
export function ShieldIcon({ size = 32, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M16 3.5 6 7.5v8c0 6.5 4.3 11 10 13 5.7-2 10-6.5 10-13v-8l-10-4Z" />
      <circle cx="16" cy="13.5" r="2.6" />
      <path d="M16 16.1v6.4M16 19.5h2.2M16 21.6h1.6" />
    </svg>
  );
}

export function InstagramIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true" {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WhatsappIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.6 2.6 0 0 0-.8 1.9 4.5 4.5 0 0 0 1 2.4 10.3 10.3 0 0 0 4 3.5c1.5.6 2 .7 2.8.6a2.3 2.3 0 0 0 1.5-1.1 1.9 1.9 0 0 0 .1-1.1c0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

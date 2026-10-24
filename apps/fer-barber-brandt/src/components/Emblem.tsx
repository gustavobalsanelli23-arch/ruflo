// Elementos gráficos tirados do emblema da Barbearia Brandt (foto de perfil do
// Instagram): a estrela, a navalha e a tesoura cruzadas e o selo redondo.
// Redesenhados em traço fino — referência ao emblema, não cópia dele.
import { business } from '../config/site';

/** Estrela de cinco pontas do emblema. */
export function Star({ size = 10, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden="true" focusable="false">
      <path
        d="M10 1.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.5l6.1-.7z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Navalha e tesoura cruzadas. */
export function RazorScissors({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Tesoura: lâminas no alto à esquerda, argolas embaixo à direita. */}
      <path d="M11 15.5L31 32M15.5 11L32 31" strokeWidth="2" />
      <path d="M32 32l7.4 10.6M32 32l10.6 7.4" strokeWidth="2" />
      <circle cx="42.6" cy="46.6" r="4.6" strokeWidth="1.8" />
      <circle cx="46.6" cy="42.6" r="4.6" strokeWidth="1.8" />
      <circle cx="32" cy="32" r="1.3" fill="currentColor" stroke="none" />
      {/* Navalha: lâmina no alto à direita, cabo embaixo à esquerda. */}
      <path d="M33.5 30.5L49 15c1.6-1.6 4.1-.4 3.9 1.8L37.6 35.4" strokeWidth="1.8" />
      <path d="M30 34L14.2 49.8" strokeWidth="4.2" />
      <circle cx="31.8" cy="32.2" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

const SEAL = `${business.name} ✦ ${business.tagline} ✦ Benedito Novo · SC ✦ `;

/**
 * O selo redondo do emblema, em versão de linha: o texto corre no círculo
 * (gira com a rolagem, ver Hero.tsx) e a navalha com a tesoura fica no centro.
 */
export function Seal({ className = '' }: { className?: string }) {
  const r = 76;
  return (
    <div className={`relative aspect-square ${className}`} aria-hidden="true">
      <svg data-seal-ring viewBox="0 0 200 200" className="absolute inset-0 h-full w-full text-latao">
        <defs>
          <path id="selo-circulo" d={`M100 ${100 - r}a${r} ${r} 0 1 1 0 ${2 * r}a${r} ${r} 0 1 1 0 ${-2 * r}`} />
        </defs>
        <circle cx="100" cy="100" r="97" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <circle cx="100" cy="100" r="58" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.45" />
        <text
          fill="currentColor"
          style={{ fontSize: 12.5, letterSpacing: '0.18em', fontStretch: '112%', fontWeight: 500, textTransform: 'uppercase' }}
        >
          <textPath href="#selo-circulo" textLength={2 * Math.PI * r - 4} lengthAdjust="spacing">
            {SEAL.toUpperCase()}
          </textPath>
        </text>
      </svg>
      <RazorScissors className="absolute inset-[31%] h-[38%] w-[38%] text-creme" />
    </div>
  );
}

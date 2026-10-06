'use client';

import { useId } from 'react';

export type JerseyView = 'front' | 'back' | 'detail';
export type JerseyCut = 'standard' | 'retro' | 'fitted' | 'kit';

interface JerseyArtProps {
  primary: string;
  secondary: string;
  view?: JerseyView;
  cut?: JerseyCut;
  number?: string;
  className?: string;
  title?: string;
}

/**
 * Placeholder ilustrativo e genérico de camisa, nas cores do time.
 * NÃO reproduz o design real de nenhum uniforme — é usado somente enquanto o
 * produto não tem fotos oficiais cadastradas.
 */
export function JerseyArt({ primary, secondary, view = 'front', cut = 'standard', number = '10', className, title }: JerseyArtProps) {
  const uid = useId().replace(/:/g, '');
  const waist = cut === 'fitted' ? 22 : 0;
  const body =
    `M140 40 Q200 ${view === 'back' ? 58 : 78} 260 40 L330 62 L392 148 L344 182 L318 158 ` +
    `Q${318 - waist} 300 ${318 - waist / 2} 440 Q200 452 ${82 + waist / 2} 440 Q${82 + waist} 300 82 158 L56 182 L8 148 L70 62 Z`;

  const viewBox = view === 'detail' ? '196 52 150 150' : cut === 'kit' ? '0 20 400 600' : '0 20 400 450';

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={title ?? 'Imagem ilustrativa da camisa'} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`${uid}-shade`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="0.22" stopColor="#000" stopOpacity="0" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`${uid}-fall`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <pattern id={`${uid}-mesh`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="0.9" fill="#000" fillOpacity="0.12" />
        </pattern>
        <clipPath id={`${uid}-clip`}>
          <path d={body} />
        </clipPath>
      </defs>

      {cut === 'kit' && (
        <g>
          <path d="M96 452 L304 452 L322 590 L218 598 L200 520 L182 598 L78 590 Z" style={{ fill: secondary }} />
          <path d="M96 452 L304 452 L322 590 L218 598 L200 520 L182 598 L78 590 Z" fill={`url(#${uid}-shade)`} />
          <path d="M96 452 L304 452 L306 470 L94 470 Z" style={{ fill: primary }} opacity="0.85" />
        </g>
      )}

      <path d={body} style={{ fill: primary }} />
      <g clipPath={`url(#${uid}-clip)`}>
        <rect x="0" y="0" width="400" height="480" fill={`url(#${uid}-mesh)`} />
        {/* Punhos e barra em cor secundária */}
        <path d="M392 148 L344 182 L336 170 L384 136 Z" style={{ fill: secondary }} />
        <path d="M8 148 L56 182 L64 170 L16 136 Z" style={{ fill: secondary }} />
        <rect x="0" y="432" width="400" height="20" style={{ fill: secondary }} opacity="0.9" />
        {/* Faixas laterais sutis */}
        <rect x="82" y="150" width="10" height="300" style={{ fill: secondary }} opacity="0.55" />
        <rect x="308" y="150" width="10" height="300" style={{ fill: secondary }} opacity="0.55" />
        <rect x="0" y="0" width="400" height="480" fill={`url(#${uid}-shade)`} />
        <rect x="0" y="0" width="400" height="480" fill={`url(#${uid}-fall)`} />
      </g>

      {/* Gola */}
      {cut === 'retro' ? (
        <g>
          <path d="M140 40 L200 104 L260 40" fill="none" style={{ stroke: secondary }} strokeWidth="12" strokeLinejoin="round" />
          <path d="M140 38 L118 74 L176 82 Z" style={{ fill: secondary }} />
          <path d="M260 38 L282 74 L224 82 Z" style={{ fill: secondary }} />
        </g>
      ) : (
        <path d={`M140 40 Q200 ${view === 'back' ? 58 : 78} 260 40`} fill="none" style={{ stroke: secondary }} strokeWidth="11" strokeLinecap="round" />
      )}

      {view === 'back' ? (
        <text
          x="200"
          y="290"
          textAnchor="middle"
          fontWeight="800"
          fontSize="150"
          style={{ fill: secondary, fontFamily: 'var(--font-display)' }}
          opacity="0.92"
        >
          {number}
        </text>
      ) : (
        /* Escudo genérico (não é o escudo oficial do time) */
        <g transform="translate(250 120)">
          <path d="M0 0 H44 V22 Q44 46 22 56 Q0 46 0 22 Z" fill="none" style={{ stroke: secondary }} strokeWidth="4" />
          <path d="M11 14 H33 M11 26 H33" style={{ stroke: secondary }} strokeWidth="3" opacity="0.6" />
        </g>
      )}
    </svg>
  );
}

import { useId } from 'react';

interface EmblemProps {
  className?: string;
  /** Sem os textos circulares: só o poste e a tesoura (favicon, tamanhos pequenos). */
  markOnly?: boolean;
  title?: string;
}

/**
 * Emblema da Geri Barbearia redesenhado em vetor a partir do logotipo oficial:
 * anel duplo, "GERI BARBEARIA" no arco, poste de barbeiro à frente de uma
 * tesoura aberta, "Desde 2024" e o lema "Chegou, cortou!" na base.
 * Os traços com [data-draw] são desenhados na animação de entrada.
 */
export function Emblem({ className, markOnly = false, title }: EmblemProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const top = `top-${uid}`;
  const bottom = `bottom-${uid}`;
  const tube = `tube-${uid}`;

  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
      stroke="currentColor"
    >
      <defs>
        <path id={top} d="M 38 120 A 82 82 0 0 1 202 120" />
        <path id={bottom} d="M 25 120 A 95 95 0 0 0 215 120" />
        <clipPath id={tube}>
          <rect x="110" y="78" width="20" height="74" rx="1.5" />
        </clipPath>
      </defs>

      {!markOnly && (
        <g data-emblem-ring>
          <circle data-draw cx="120" cy="120" r="116" strokeWidth="3" />
          <circle data-draw cx="120" cy="120" r="106" strokeWidth="1" />
        </g>
      )}

      {/* Tesoura aberta, com o pivô escondido atrás do poste */}
      <g data-emblem-scissors strokeLinecap="round" strokeLinejoin="round">
        <circle data-draw cx="80" cy="86" r="7.5" strokeWidth="2.5" />
        <circle data-draw cx="160" cy="86" r="7.5" strokeWidth="2.5" />
        <path data-draw d="M 85.5 91.5 L 120 118" strokeWidth="2.5" />
        <path data-draw d="M 154.5 91.5 L 120 118" strokeWidth="2.5" />
        <path d="M 118 120.2 L 122 115.8 L 157 151 Z" fill="currentColor" strokeWidth="1" />
        <path d="M 122 120.2 L 118 115.8 L 83 151 Z" fill="currentColor" strokeWidth="1" />
      </g>

      {/* Poste de barbeiro */}
      <g data-emblem-pole strokeWidth="2">
        <path data-draw d="M 111 72 A 9 9 0 0 1 129 72" />
        <circle cx="120" cy="61" r="1.8" fill="currentColor" stroke="none" />
        <rect data-draw x="106" y="72" width="28" height="6" rx="2" />
        <rect x="110" y="78" width="20" height="74" rx="1.5" fill="var(--emblem-bg, #10100f)" />
        <g clipPath={`url(#${tube})`} fill="currentColor" stroke="none">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={i} d={`M 100 ${74 + i * 14} L 140 ${58 + i * 14} L 140 ${64 + i * 14} L 100 ${80 + i * 14} Z`} />
          ))}
        </g>
        <rect data-draw x="110" y="78" width="20" height="74" rx="1.5" />
        <rect data-draw x="106" y="152" width="28" height="6" rx="2" />
        <rect data-draw x="112" y="158" width="16" height="5" />
        <rect data-draw x="108" y="163" width="24" height="4" rx="1.5" />
      </g>

      {!markOnly && (
        <g data-emblem-text stroke="none" fill="currentColor">
          <text fontFamily="var(--font-serif)" fontSize="19" fontWeight="700">
            <textPath href={`#${top}`} startOffset="50%" textAnchor="middle" textLength="196" lengthAdjust="spacing">
              GERI BARBEARIA
            </textPath>
          </text>
          <text fontFamily="var(--font-sans)" fontSize="10.5" fontWeight="600">
            <textPath href={`#${bottom}`} startOffset="50%" textAnchor="middle" textLength="132" lengthAdjust="spacing">
              CHEGOU, CORTOU!
            </textPath>
          </text>
          <text
            x="66"
            y="133"
            fontFamily="var(--font-sans)"
            fontSize="8.5"
            fontWeight="600"
            letterSpacing="2"
            textAnchor="middle"
          >
            DESDE
          </text>
          <text
            x="174"
            y="133"
            fontFamily="var(--font-sans)"
            fontSize="8.5"
            fontWeight="600"
            letterSpacing="2"
            textAnchor="middle"
          >
            2024
          </text>
          <rect x="47" y="137" width="40" height="1.2" />
          <rect x="153" y="137" width="40" height="1.2" />
        </g>
      )}
    </svg>
  );
}

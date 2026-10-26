// Marca da VOP em vetor, redesenhada a partir da foto de perfil do Instagram
// (assets/marca/vop-perfil-instagram.jpg): o telhado em duas águas, cinco
// traços verticais de alturas diferentes (o do lado direito atravessa o
// telhado) e o "VOP" em traço fino. As coordenadas são as medidas da foto
// (752×791); traço e cor vêm de currentColor. CONFIRMAR com o arquivo
// original da VOP quando ele chegar.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

/** Telhado e traços: o símbolo sozinho. */
function SymbolPaths() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="6.6" strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="10">
      <path d="M245 311.5 L365 208.5 L485 313" />
      <path d="M269 331 V374 M317.5 287 V414.5 M364 257 V472.5 M413 198 V429 M461 331 V374.5" />
    </g>
  );
}

/** "VOP": V em dois traços, O redondo e P de haste com bojo. */
function WordPaths() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="8.2" strokeLinecap="butt" strokeLinejoin="miter">
      <path d="M254.5 528 L276.5 587.8 L298.5 528" strokeLinejoin="bevel" />
      <ellipse cx="369.5" cy="558" rx="27.5" ry="26.2" />
      <path d="M445 588.5 V531.6 H459.5 A14.7 14.7 0 0 1 459.5 561 H445" />
    </g>
  );
}

/** Símbolo (telhado e traços). */
export function VopSymbol(props: P) {
  return (
    <svg viewBox="240 194 250 282" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <SymbolPaths />
    </svg>
  );
}

/** Logotipo "VOP" (só as letras). */
export function VopWordmark(props: P) {
  return (
    <svg viewBox="248 524 234 68" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <WordPaths />
    </svg>
  );
}

/** Assinatura completa, como no perfil: símbolo em cima, "VOP" embaixo. */
export function VopLockup({ title, ...props }: P & { title?: string }) {
  return (
    <svg viewBox="240 194 250 398" xmlns="http://www.w3.org/2000/svg" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} {...props}>
      {title && <title>{title}</title>}
      <SymbolPaths />
      <WordPaths />
    </svg>
  );
}

// Ícones da estética de referência, com os traçados originais.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

/** Três blocos (ENTRAR e CTA). */
export function PixelIcon(props: P) {
  return (
    <svg className="ico" viewBox="0 0 7 11" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x="0" y="0" width="4" height="5" />
      <rect x="3" y="4" width="4" height="4" />
      <rect x="0" y="7" width="4" height="4" />
    </svg>
  );
}

/** Quatro quadrados arredondados (MENU). */
export function DotsIcon(props: P) {
  return (
    <svg className="ico" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x="0" y="0" width="4" height="4" rx=".8" />
      <rect x="6" y="0" width="4" height="4" rx=".8" />
      <rect x="0" y="6" width="4" height="4" rx=".8" />
      <rect x="6" y="6" width="4" height="4" rx=".8" />
    </svg>
  );
}

/** Vídeo de fundo: duas barras tocando, triângulo quando pausado (.wave/.slash do dock). */
export function MotionIcon(props: P) {
  return (
    <svg className="ico" viewBox="0 0 14 11" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <g className="wave" stroke="none">
        <rect x="2.5" y="1" width="3" height="9" />
        <rect x="8.5" y="1" width="3" height="9" />
      </g>
      <path className="slash" d="M3 .8 L12.4 5.5 L3 10.2 Z" stroke="none" />
    </svg>
  );
}

/** Dupla seta para baixo (ROLE PARA DESCOBRIR). */
export function DoubleChevronIcon(props: P) {
  return (
    <svg className="ico" viewBox="0 0 5 7" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M0 0 H5 L2.5 3 Z" />
      <path d="M0 4 H5 L2.5 7 Z" />
    </svg>
  );
}

/** Balão de conversa com três pontos (FALE CONOSCO). */
export function BubbleIcon(props: P) {
  return (
    <svg className="ico" viewBox="0 0 16 15" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M8 .8 C12 .8 15.2 3.8 15.2 7.4 C15.2 11 12 14 8 14 C6.6 14 5.3 13.6 4.2 13 L.9 13.9 L1.9 10.9 C1.2 9.9 .8 8.7 .8 7.4 C.8 3.8 4 .8 8 .8 Z" />
      <g fill="currentColor" stroke="none">
        <circle cx="5.2" cy="7.4" r=".95" />
        <circle cx="8" cy="7.4" r=".95" />
        <circle cx="10.8" cy="7.4" r=".95" />
      </g>
    </svg>
  );
}

/** Contorno chanfrado do CTA (traçado de 190×41 da referência, sem escalar o traço). */
export function CtaEdge() {
  return (
    <svg className="cta-edge" viewBox="0 0 190 41" preserveAspectRatio="none" aria-hidden="true">
      <path d="M3.5.5 H179.5 L189.5 10.5 V37.5 L186.5 40.5 H10.5 L.5 30.5 V3.5 Z" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Triângulo para a esquerda (voltar, ambiente anterior); girado, avança. */
export function BackIcon(props: P) {
  return (
    <svg className="ico" viewBox="0 0 7 11" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M7 0 V11 L0 5.5 Z" />
    </svg>
  );
}

/** Dois traços cruzados (fechar). */
export function CloseIcon(props: P) {
  return (
    <svg className="ico" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M1 1 L9 9 M9 1 L1 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );
}

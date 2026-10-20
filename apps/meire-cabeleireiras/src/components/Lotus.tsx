// A flor de lótus do logo da Meire, redesenhada em traço fino.
import type { SVGProps } from 'react';

interface LotusProps extends Omit<SVGProps<SVGSVGElement>, 'stroke'> {
  size?: number;
  /** Espessura do traço (o desenho é escalável; padrão 1.4). */
  stroke?: number;
}

export const LOTUS_PATHS = [
  // pétala central
  'M24 3.5C30.4 9.6 31.6 19.2 24 28.5C16.4 19.2 17.6 9.6 24 3.5Z',
  // miolo
  'M24 11.5C26.6 14.6 26.6 19.6 24 23.2C21.4 19.6 21.4 14.6 24 11.5Z',
  // pétalas laterais
  'M21.4 28.3C13.6 28.2 7.8 23 5.6 13.6C11.2 14 15.6 16.6 18.4 20.8',
  'M26.6 28.3C34.4 28.2 40.2 23 42.4 13.6C36.8 14 32.4 16.6 29.6 20.8',
  // base
  'M12.5 28.5C19.6 30.8 28.4 30.8 35.5 28.5',
];

export function Lotus({ size = 32, stroke = 1.4, ...rest }: LotusProps) {
  return (
    <svg
      width={size}
      height={(size * 32) / 48}
      viewBox="0 0 48 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {LOTUS_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

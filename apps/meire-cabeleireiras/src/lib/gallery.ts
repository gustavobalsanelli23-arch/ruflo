import images from '../data/images.generated.json';
import type { Work } from '../data/content';

/** Fração da largura da coluna ocupada por uma foto marcada como `small`. */
export const SMALL_SCALE = 0.68;

/** Larguras relativas das colunas da galeria (iguais às do CSS grid). */
export const COLUMN_WEIGHTS: Record<number, number[]> = {
  2: [1, 1],
  3: [5, 3.4, 4],
};

/**
 * Distribui as fotos na coluna mais curta (altura real = largura da coluna ×
 * proporção da foto), para a galeria ficar equilibrada com qualquer filtro.
 * A segunda coluna começa mais abaixo no layout; o cálculo já desconta isso.
 * Com poucas fotos (filtro), elas ocupam as primeiras colunas, sem buracos.
 */
export function toColumns(list: Work[], count: number): Work[][] {
  const weights = COLUMN_WEIGHTS[count] ?? new Array<number>(count).fill(1);
  const cols: Work[][] = Array.from({ length: count }, () => []);
  const heights = new Array<number>(count).fill(0);
  if (count > 1) heights[1] = 0.35 * weights[1];
  list.forEach((work, i) => {
    const { width, height } = images[work.image];
    // Uma foto por coluna primeiro (nenhuma coluna vazia no meio); depois, a mais curta.
    const target = i < count ? i : heights.indexOf(Math.min(...heights));
    cols[target].push(work);
    // Legenda e espaçamento ocupam uma altura fixa, não proporcional.
    heights[target] += weights[target] * (work.small ? SMALL_SCALE : 1) * (height / width) + 0.6;
  });
  return cols;
}

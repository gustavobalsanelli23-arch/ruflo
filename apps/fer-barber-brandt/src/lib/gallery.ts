import type { Work } from '../data/content';
import { ratioOf } from '../components/Picture';

/** Larguras relativas das colunas da galeria (iguais às do CSS grid). */
export const COLUMN_WEIGHTS: Record<number, number[]> = {
  2: [1, 1],
  3: [5, 3.2, 4],
};

/** Recuo do topo de cada coluna, em frações da largura da coluna (o layout em degraus). */
export const COLUMN_OFFSETS: Record<number, number[]> = {
  2: [0, 0.35],
  3: [0, 0.55, 0.22],
};

/**
 * Distribui as fotos na coluna mais curta (altura = largura da coluna ÷
 * proporção da foto), para a composição ficar equilibrada com qualquer
 * quantidade e proporção de fotos. Os recuos das colunas já entram na conta.
 */
export function toColumns(list: Work[], count: number): Work[][] {
  const weights = COLUMN_WEIGHTS[count] ?? new Array<number>(count).fill(1);
  const offsets = COLUMN_OFFSETS[count] ?? new Array<number>(count).fill(0);
  const cols: Work[][] = Array.from({ length: count }, () => []);
  const heights = weights.map((w, i) => w * offsets[i]);
  list.forEach((work, i) => {
    // Uma foto por coluna primeiro (nenhuma coluna vazia); depois, a mais curta.
    const target = i < count ? i : heights.indexOf(Math.min(...heights));
    cols[target].push(work);
    // Legenda e espaçamento ocupam uma altura fixa, não proporcional.
    heights[target] += weights[target] / ratioOf(work.photo) + 0.5;
  });
  return cols;
}

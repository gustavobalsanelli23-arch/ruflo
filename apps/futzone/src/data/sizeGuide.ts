import type { AdultSize, KidsSize } from '@/types/catalog';

/** Medidas de referência (cm). Ajustar conforme a tabela oficial do fornecedor. */
export const adultSizeGuide: Array<{ size: AdultSize; chest: string; length: string; height: string }> = [
  { size: 'PP', chest: '88–92', length: '68', height: '1,55–1,62' },
  { size: 'P', chest: '92–96', length: '70', height: '1,62–1,70' },
  { size: 'M', chest: '96–102', length: '72', height: '1,70–1,77' },
  { size: 'G', chest: '102–108', length: '74', height: '1,77–1,83' },
  { size: 'GG', chest: '108–116', length: '76', height: '1,83–1,90' },
  { size: 'XGG', chest: '116–124', length: '78', height: '1,90–1,96' },
];

export const kidsSizeGuide: Array<{ size: KidsSize; age: string; chest: string; length: string }> = [
  { size: '4', age: '3–4 anos', chest: '58', length: '44' },
  { size: '6', age: '5–6 anos', chest: '62', length: '48' },
  { size: '8', age: '7–8 anos', chest: '68', length: '52' },
  { size: '10', age: '9–10 anos', chest: '72', length: '56' },
  { size: '12', age: '11–12 anos', chest: '78', length: '60' },
  { size: '14', age: '13–14 anos', chest: '84', length: '64' },
];

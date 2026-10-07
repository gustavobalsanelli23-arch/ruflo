import type { AdultSize, KidsSize } from '@/types/catalog';

/**
 * Tabela de medidas de referência (cm). PROVISÓRIA — substituir pela tabela
 * oficial do fornecedor (aba "Tamanhos" do catálogo).
 */
export const adultSizeGuide: Array<{ size: AdultSize; chest: string; length: string; height: string }> = [
  { size: 'P', chest: '92–96', length: '70', height: '1,62–1,70' },
  { size: 'M', chest: '96–102', length: '72', height: '1,70–1,77' },
  { size: 'G', chest: '102–108', length: '74', height: '1,77–1,83' },
  { size: 'GG', chest: '108–116', length: '76', height: '1,83–1,90' },
  { size: '2GG', chest: '116–124', length: '78', height: '1,88–1,95' },
  { size: '3GG', chest: '124–132', length: '80', height: '1,90–1,98' },
  { size: '4GG', chest: '132–140', length: '82', height: '1,92–2,00' },
];

export const kidsSizeGuide: Array<{ size: KidsSize; age: string; chest: string; length: string }> = [
  { size: 'T18', age: 'a confirmar', chest: '—', length: '—' },
  { size: 'T20', age: 'a confirmar', chest: '—', length: '—' },
  { size: 'T22', age: 'a confirmar', chest: '—', length: '—' },
  { size: 'T24', age: 'a confirmar', chest: '—', length: '—' },
  { size: 'T26', age: 'a confirmar', chest: '—', length: '—' },
  { size: 'T28', age: 'a confirmar', chest: '—', length: '—' },
];

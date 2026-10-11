import type { AdultSize, KidsSize } from '@/types/catalog';

/**
 * Tabela de medidas de referência (cm). PROVISÓRIA: substituir pela tabela
 * oficial do fornecedor (aba "Tamanhos" do catálogo).
 *
 * Faixas usam hífen ("92-96"). Medida desconhecida é `null`: a interface
 * mostra "não informado" em vez de inventar um valor.
 */
export const adultSizeGuide: Array<{ size: AdultSize; chest: string; length: string; height: string }> = [
  { size: 'P', chest: '92-96', length: '70', height: '1,62-1,70' },
  { size: 'M', chest: '96-102', length: '72', height: '1,70-1,77' },
  { size: 'G', chest: '102-108', length: '74', height: '1,77-1,83' },
  { size: 'GG', chest: '108-116', length: '76', height: '1,83-1,90' },
  { size: '2GG', chest: '116-124', length: '78', height: '1,88-1,95' },
  { size: '3GG', chest: '124-132', length: '80', height: '1,90-1,98' },
  { size: '4GG', chest: '132-140', length: '82', height: '1,92-2,00' },
];

/** Infantil: o fornecedor ainda não informou idade nem medidas por tamanho. */
export const kidsSizeGuide: Array<{ size: KidsSize; age: string | null; chest: string | null; length: string | null }> = [
  { size: 'T18', age: null, chest: null, length: null },
  { size: 'T20', age: null, chest: null, length: null },
  { size: 'T22', age: null, chest: null, length: null },
  { size: 'T24', age: null, chest: null, length: null },
  { size: 'T26', age: null, chest: null, length: null },
  { size: 'T28', age: null, chest: null, length: null },
];

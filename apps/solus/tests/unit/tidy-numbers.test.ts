import { describe, expect, it } from 'vitest';
import { tidyNumbers } from '@/lib/ai/tidy-numbers';

describe('números do analista no formato brasileiro', () => {
  it('agrupa milhares e troca o ponto decimal por vírgula', () => {
    expect(tidyNumbers('O azeite vendeu 12012 nos últimos 30 dias.')).toBe('O azeite vendeu 12.012 nos últimos 30 dias.');
    expect(tidyNumbers('Receita de R$ 63662,00 e lucro de 23495.6.')).toBe('Receita de R$ 63.662,00 e lucro de 23.495,6.');
    expect(tidyNumbers('Lucro de -1234567 no período.')).toBe('Lucro de -1.234.567 no período.');
  });

  it('não mexe no que já está formatado, em números curtos, anos, códigos e datas', () => {
    for (const text of [
      'Receita de R$ 12.012,00 e 3.718 vendas.',
      'Lucro bruto de -715 e margem de -6,0%.',
      'Em 2026 o SKU CAF-001 e o pedido P1001 subiram.',
      'De 21/10/2026 a 19/11/2026, às 14:30.',
      'EAN 7891234567890 e chave 35261112345678000199550010000012341000012345.',
      'O SKU 100234 e o pedido 55871 venderam bem; código: 4410.',
      'Nota nº 12345 do fornecedor.',
    ]) {
      expect(tidyNumbers(text)).toBe(text);
    }
  });
});

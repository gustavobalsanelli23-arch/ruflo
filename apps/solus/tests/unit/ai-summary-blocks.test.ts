import { describe, expect, it } from 'vitest';
import { asBlocks } from '@/services/ai';

describe('blocos do resumo salvo', () => {
  it('mantém blocos válidos e descarta os malformados em vez de quebrar a tela', () => {
    const blocks = asBlocks([
      { kind: 'summary', text: 'Receita estável.' },
      { kind: 'metrics' },
      { kind: 'metrics', items: [{ label: 'Receita', value: 'R$ 1,00' }] },
      { kind: 'script', html: '<b>x</b>' },
      'texto solto',
    ]);
    expect(blocks).toEqual([
      { kind: 'summary', text: 'Receita estável.' },
      { kind: 'metrics', items: [{ label: 'Receita', value: 'R$ 1,00' }] },
    ]);
  });

  it('conteúdo que não é lista vira resumo vazio', () => {
    expect(asBlocks({ kind: 'summary', text: 'x' })).toEqual([]);
    expect(asBlocks(null)).toEqual([]);
  });
});

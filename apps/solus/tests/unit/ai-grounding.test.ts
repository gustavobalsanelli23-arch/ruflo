// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildGround, sentences, unverified } from '@/lib/ai/grounding';

/**
 * The grounding check decides whether a number or date the model wrote is in
 * the data the tools returned. False negatives would let an invented number
 * through; false positives would remove correct passages. Both are pinned.
 */

const ground = buildGround([
  {
    periodo: { inicio: '2026-09-27', fim: '2026-10-26', dias: 30 },
    metricas: [
      { id: 'receita_liquida', valor: 128_430.55, valor_formatado: 'R$ 128.430,55', variacao: -12.3 },
      { id: 'margem_bruta', valor: 23.4, valor_formatado: '23,4%', variacao: -1.8 },
      { id: 'ticket_medio', valor: 87.2 },
    ],
    produtos: [
      { produto: 'Café Torrado 250 g', sku: 'CAF-250', receita_liquida: 4_512.9, unidades: 301 },
      { produto: 'Azeite Extra Virgem 500 ml', sku: 'AZE-500', receita_liquida: 3_980 },
    ],
    alteracao_custo: '2026-08-15',
  },
]);

describe('números', () => {
  it('aceita valores copiados como vieram ou arredondados para menos casas', () => {
    expect(unverified('A receita líquida foi de R$ 128.430,55.', ground)).toEqual([]);
    expect(unverified('Receita de R$ 128.431 no período.', ground)).toEqual([]);
    expect(unverified('Receita de R$ 128,4 mil, margem de 23,4% e ticket de R$ 87,20.', ground)).toEqual([]);
    expect(unverified('A margem ficou em 23%.', ground)).toEqual([]);
    expect(unverified('A receita caiu 12,3% e a margem perdeu 1,8 p.p.', ground)).toEqual([]);
  });

  it('aceita a queda escrita sem o sinal', () => {
    expect(unverified('Queda de 12% na receita.', ground)).toEqual([]);
  });

  it('recusa um número que não está nos dados, mesmo perto de um que está', () => {
    expect(unverified('A receita foi de R$ 130.000,00.', ground)).toEqual(['R$ 130.000,00']);
    expect(unverified('A margem foi de 25,1%.', ground)).toEqual(['25,1%']);
    expect(unverified('Receita de R$ 128.450.', ground)).toEqual(['R$ 128.450']);
  });

  it('recusa um valor calculado pelo modelo (soma de dois produtos)', () => {
    // 4.512,90 + 3.980,00 = 8.492,90: não veio de nenhuma consulta.
    expect(unverified('Os dois produtos somam R$ 8.492,90.', ground)).toEqual(['R$ 8.492,90']);
  });

  it('não confunde números dentro de nomes e SKUs vindos dos dados', () => {
    expect(unverified('O Café Torrado 250 g (CAF-250) vendeu 301 unidades.', ground)).toEqual([]);
  });

  it('inteiros pequenos sem unidade não são conferidos; ordinais também não', () => {
    expect(unverified('Os 3 produtos com maior queda; o 1º lugar é o café.', ground)).toEqual([]);
    // Acima de 10 é conferido (12 passaria: é o arredondamento de 12,3, que está nos dados).
    expect(unverified('Os 47 produtos com maior queda.', ground)).toEqual(['47']);
  });

  it('o tamanho das listas e a duração do período contam como dados', () => {
    expect(unverified('Nos últimos 30 dias, 2 produtos se destacaram.', ground)).toEqual([]);
  });
});

describe('datas', () => {
  it('aceita datas que aparecem nos dados, em vários formatos', () => {
    expect(unverified('O custo mudou em 15/08/2026.', ground)).toEqual([]);
    expect(unverified('O custo mudou em 15 de agosto de 2026.', ground)).toEqual([]);
    expect(unverified('Desde 15 ago, o custo é outro.', ground)).toEqual([]);
    expect(unverified('Período de 27/09 a 26/10/2026.', ground)).toEqual([]);
    expect(unverified('Em outubro de 2026 a receita caiu.', ground)).toEqual([]);
  });

  it('recusa datas que não estão nos dados', () => {
    expect(unverified('O custo mudou em 20/08/2026.', ground)).toEqual(['20/08/2026']);
    expect(unverified('Em março de 2025 a receita era maior.', ground)).toEqual(['março de 2025']);
    expect(unverified('Em 2024 a margem era outra.', ground)).toEqual(['2024']);
  });
});

describe('frases', () => {
  it('separa o resumo em frases sem quebrar números', () => {
    expect(sentences('A receita caiu 12,3%. A margem ficou em 23,4%! Veja os produtos.')).toEqual([
      'A receita caiu 12,3%.',
      'A margem ficou em 23,4%!',
      'Veja os produtos.',
    ]);
    expect(sentences('Receita de R$ 128.430,55 no período.')).toEqual(['Receita de R$ 128.430,55 no período.']);
  });
});

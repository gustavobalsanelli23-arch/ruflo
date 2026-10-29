// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { applyMapping, describeMapping, mappingProblems, suggestMapping, type MappedRow } from '@/lib/ingest/mapping';
import type { RawCell, ReadOptions } from '@/lib/ingest/types';
import { validateRows, type ValidationContext } from '@/lib/ingest/validate';

const options: ReadOptions = { decimal: 'br', dateOrder: 'dmy', snapshotDate: null };
const context: ValidationContext = { options, today: '2026-03-10' };
const row = (values: Record<string, RawCell>, line = 2): MappedRow => ({ line, values });

describe('mapeamento sugerido', () => {
  it('reconhece cabeçalhos comuns de ERPs e PDVs brasileiros', () => {
    const headers = ['Data Emissão', 'Nº do Pedido', 'Cód. Produto', 'Descrição', 'Qtde', 'Vlr. Unitário', 'Desconto (R$)', 'Total', 'Custo Médio', 'Loja'];
    const { mapping } = suggestMapping(headers, 'sales');
    expect(describeMapping(mapping, headers)).toEqual({
      sold_at: 'Data Emissão',
      order_id: 'Nº do Pedido',
      sku: 'Cód. Produto',
      product_name: 'Descrição',
      quantity: 'Qtde',
      unit_price: 'Vlr. Unitário',
      discount: 'Desconto (R$)',
      line_total: 'Total',
      unit_cost: 'Custo Médio',
      channel: 'Loja',
    });
  });

  it('cada coluna vai para um campo só, e colunas desconhecidas ficam de fora', () => {
    const headers = ['SKU', 'Estoque', 'Observação'];
    const { mapping } = suggestMapping(headers, 'inventory');
    expect(mapping).toEqual({ sku: 0, quantity: 1 });
  });

  it('aponta campos obrigatórios faltando e colunas repetidas', () => {
    const headers = ['Data', 'SKU', 'Qtd'];
    expect(mappingProblems({ sold_at: 0, sku: 1, quantity: 2 }, 'sales', options, headers)).toEqual([
      'Escolha a coluna de "Preço unitário" ou a de "Valor total da linha".',
    ]);
    expect(mappingProblems({ sold_at: 0, sku: 1, quantity: 1, unit_price: 2 }, 'sales', options, headers)).toContain(
      'A coluna "SKU" foi escolhida para mais de um campo (SKU / código do produto, Quantidade).',
    );
    expect(mappingProblems({ sku: 0, quantity: 1 }, 'inventory', options, headers)).toEqual([
      'Escolha a coluna de "Data da posição" ou informe a data da contagem.',
    ]);
    expect(mappingProblems({ sku: 0, quantity: 1 }, 'inventory', { snapshotDate: '2026-03-01' }, headers)).toEqual([]);
  });

  it('aplica o mapeamento mantendo o número do registro', () => {
    const mapped = applyMapping({ rows: [{ line: 7, cells: ['A', '3', 'x'] }] }, { sku: 0, quantity: 1 });
    expect(mapped).toEqual([{ line: 7, values: { sku: 'A', quantity: '3' } }]);
  });
});

describe('validação de vendas', () => {
  const valid = { sold_at: '05/03/2026', order_id: 'P-1', sku: ' caf-01 ', quantity: '2', unit_price: '1.250,50', discount: '10,00', unit_cost: '700' };

  it('linha válida vira o registro do banco, já normalizado', () => {
    const { staged, issues } = validateRows('sales', [row(valid)], context);
    expect(issues).toEqual([]);
    expect(staged).toEqual([
      {
        row_number: 2,
        sold_at: '2026-03-05',
        order_id: 'P-1',
        sku: 'caf-01',
        product_name: null,
        quantity: 2,
        unit_price: 1250.5,
        discount: 10,
        unit_cost: 700,
        kind: 'sale',
        channel: null,
      },
    ]);
  });

  it.each([
    [{ sold_at: '31/02/2026' }, 'invalid_date'],
    [{ sold_at: '' }, 'missing_value'],
    [{ sold_at: '12/03/2026' }, 'future_date'],
    [{ sold_at: '01/01/1999' }, 'date_out_of_range'],
    [{ sku: '' }, 'missing_value'],
    [{ sku: 'X'.repeat(65) }, 'too_long'],
    [{ order_id: 'P'.repeat(65) }, 'too_long'],
    [{ quantity: 'dois' }, 'invalid_number'],
    [{ quantity: '0' }, 'zero_quantity'],
    [{ unit_price: '-5' }, 'negative_value'],
    [{ unit_price: '' }, 'missing_value'],
    [{ discount: '3.000,00' }, 'discount_exceeds'],
    [{ discount: '-1' }, 'negative_value'],
  ] as const)('%o rejeita a linha (%s)', (change, code) => {
    const { staged, issues } = validateRows('sales', [row({ ...valid, ...change })], context);
    expect(staged).toEqual([]);
    expect(issues.filter((issue) => issue.severity === 'error').map((issue) => issue.code)).toContain(code);
    expect(issues[0]).toMatchObject({ row_number: 2, severity: 'error' });
  });

  it('quantidade negativa vira devolução, com aviso', () => {
    const { staged, issues } = validateRows('sales', [row({ ...valid, quantity: '-2' })], context);
    expect(staged[0]).toMatchObject({ kind: 'return', quantity: 2 });
    expect(issues).toEqual([expect.objectContaining({ code: 'negative_quantity', severity: 'warning', raw_value: '-2' })]);
    // com a coluna de tipo dizendo devolução, não há aviso
    const typed = validateRows('sales', [row({ ...valid, quantity: '-2', kind: 'Devolução' })], context);
    expect(typed.issues).toEqual([]);
  });

  it('sem preço unitário, o preço sai do total (que já tem o desconto)', () => {
    const { staged } = validateRows('sales', [row({ ...valid, unit_price: null, line_total: '90,00', discount: '10', quantity: '4' })], context);
    // (90 + 10) / 4
    expect(staged[0]).toMatchObject({ unit_price: 25, discount: 10 });
  });

  it('total que não confere com quantidade × preço − desconto gera aviso, e vale o preço', () => {
    const { staged, issues } = validateRows('sales', [row({ ...valid, line_total: '2.000,00' })], context);
    expect(staged[0]).toMatchObject({ unit_price: 1250.5 });
    expect(issues.map((issue) => issue.code)).toEqual(['total_mismatch']);
  });

  it('custo ilegível é descartado com aviso (a venda continua); custo zero também avisa', () => {
    const unreadable = validateRows('sales', [row({ ...valid, unit_cost: 'N/D' })], context);
    expect(unreadable.staged[0]).toMatchObject({ unit_cost: null });
    expect(unreadable.issues.map((issue) => issue.code)).toEqual(['ignored_value']);
    expect(validateRows('sales', [row({ ...valid, unit_cost: '0' })], context).issues.map((issue) => issue.code)).toEqual(['zero_cost']);
  });

  it('tipo desconhecido rejeita; preço zero só avisa', () => {
    expect(validateRows('sales', [row({ ...valid, kind: 'bonificação' })], context).staged).toEqual([]);
    const free = validateRows('sales', [row({ ...valid, unit_price: '0', discount: '0' })], context);
    expect(free.staged).toHaveLength(1);
    expect(free.issues.map((issue) => issue.code)).toEqual(['zero_price']);
  });

  it('valores muito grandes ou descrições longas: rejeita números, corta textos', () => {
    expect(validateRows('sales', [row({ ...valid, unit_price: '99.999.999.999,00' })], context).issues[0]!.code).toBe('number_out_of_range');
    const long = validateRows('sales', [row({ ...valid, product_name: 'N'.repeat(250) })], context);
    expect((long.staged[0]!.product_name as string).length).toBe(200);
    expect(long.issues.map((issue) => issue.code)).toEqual(['truncated']);
  });
});

describe('validação de cadastros e estoque', () => {
  it('produto: custo ilegível vira aviso; preço abaixo do custo avisa; prazo e flags inválidos são ignorados', () => {
    const { staged, issues } = validateRows(
      'products',
      [row({ sku: 'A', name: 'Azeite', cost: '30,00', price: '25,00', lead_time_days: '400', perishable: 'talvez', active: 'Sim' })],
      context,
    );
    expect(staged[0]).toMatchObject({ sku: 'A', cost: 30, price: 25, lead_time_days: null, perishable: null, active: true });
    expect(issues.map((issue) => issue.code).sort()).toEqual(['ignored_value', 'ignored_value', 'price_below_cost']);
  });

  it('produto sem nome é rejeitado', () => {
    expect(validateRows('products', [row({ sku: 'A', name: '' })], context).staged).toEqual([]);
  });

  it('estoque: data da coluna ou a data informada; negativo avisa', () => {
    const fallback = { ...context, options: { ...options, snapshotDate: '2026-03-01' } };
    const { staged, issues } = validateRows('inventory', [row({ sku: 'A', quantity: '-3' }), row({ sku: 'B', quantity: '5', snapshot_date: '02/03/2026' }, 3)], fallback);
    expect(staged.map((r) => [r.sku, r.snapshot_date, r.quantity])).toEqual([
      ['A', '2026-03-01', -3],
      ['B', '2026-03-02', 5],
    ]);
    expect(issues.map((issue) => issue.code)).toEqual(['negative_stock']);
    expect(validateRows('inventory', [row({ sku: 'A', quantity: '1' })], context).issues[0]!.code).toBe('missing_value');
  });

  it('fornecedor: nome obrigatório; código longo rejeita', () => {
    expect(validateRows('suppliers', [row({ name: 'Olivas BR', code: 'F1', lead_time_days: '12' })], context).staged).toEqual([
      { row_number: 2, name: 'Olivas BR', code: 'F1', lead_time_days: 12 },
    ]);
    expect(validateRows('suppliers', [row({ name: 'X', code: 'C'.repeat(65) })], context).staged).toEqual([]);
  });
});

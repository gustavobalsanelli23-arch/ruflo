import { describe, expect, it } from 'vitest';
import { convertMercadoLivre, MlFormatError, parseMlDate, parseMlNumber, toCsv } from '../../scripts/pilot/mercado-livre';

const HEADER = [
  'N.º de venda',
  'Data da venda',
  'Estado',
  'Unidades',
  'Receita por produtos (BRL)',
  'Tarifa de venda e impostos (BRL)',
  'Tarifas de envio (BRL)',
  'Total (BRL)',
  'SKU',
  '# de anúncio',
  'Título do anúncio',
  'Preço unitário de venda do anúncio (BRL)',
  'Comprador',
  'CPF',
  'Endereço',
];

const report = (...rows: (string | number | null)[][]) => [
  ['Vendas'],
  ['Período: 01/11/2026 a 17/11/2026'],
  [],
  ['Vendas', null, null, null, 'Faturamento', null, null, null, 'Anúncios', null, null, null, 'Compradores'],
  HEADER,
  ...rows,
];

const sale = (overrides: Partial<Record<string, string | number | null>> = {}) => {
  const base: Record<string, string | number | null> = {
    order: '2000009876543210',
    date: '17 de novembro de 2026 14:32 hs.',
    status: 'Entregue',
    units: 2,
    revenue: 159.8,
    fees: -22.37,
    shipping: -18.9,
    total: 118.53,
    sku: 'CAM-AZ-M',
    ad: 'MLB1234567890',
    title: 'Camiseta Azul M',
    price: 79.9,
    buyer: 'João Pereira',
    cpf: '123.456.789-09',
    address: 'Rua B, 10',
    ...overrides,
  };
  return Object.values(base);
};

describe('relatório de vendas do Mercado Livre', () => {
  it('acha o cabeçalho abaixo dos títulos e converte as vendas', () => {
    const result = convertMercadoLivre(report(sale()));
    expect(result.lines).toEqual([
      { date: '2026-11-17', order: '2000009876543210', sku: 'CAM-AZ-M', name: 'Camiseta Azul M', quantity: 2, unitPrice: 79.9 },
    ]);
    expect(result.fees).toBeCloseTo(22.37);
    expect(result.shipping).toBeCloseTo(18.9);
  });

  it('deixa de fora canceladas, devolvidas e resumos de pacote, e conta cada uma', () => {
    const result = convertMercadoLivre(
      report(
        sale(),
        sale({ status: 'Cancelada pelo comprador' }),
        sale({ status: 'Devolvida' }),
        sale({ status: 'Pacote de 2 produtos', units: null, sku: null, ad: null }),
      ),
    );
    expect(result.lines).toHaveLength(1);
    expect(result.skipped).toMatchObject({ canceladas: 1, devolvidas: 1, semUnidades: 1 });
  });

  it('não leva comprador, CPF nem endereço para a planilha', () => {
    const csv = toCsv(convertMercadoLivre(report(sale())).lines);
    expect(csv).not.toMatch(/João|123\.456|Rua B/);
    expect(csv).toContain('17/11/2026;2000009876543210;CAM-AZ-M;Camiseta Azul M;2;79,9;venda;Mercado Livre');
  });

  it('usa o nº do anúncio sem SKU e a receita sem preço unitário', () => {
    const result = convertMercadoLivre(report(sale({ sku: '', price: null, revenue: 150 })));
    expect(result.lines[0]).toMatchObject({ sku: 'MLB1234567890', unitPrice: 75 });
  });

  it('explica quando o arquivo não é o relatório de vendas', () => {
    expect(() => convertMercadoLivre([['Produto', 'Estoque'], ['A', 1]])).toThrow(MlFormatError);
  });

  it('lê datas e números nos formatos do relatório', () => {
    expect(parseMlDate('3 de março de 2026 09:05 hs.')).toBe('2026-03-03');
    expect(parseMlDate('31/12/2026 23:59')).toBe('2026-12-31');
    expect(parseMlDate(new Date(Date.UTC(2026, 10, 17)))).toBe('2026-11-17');
    expect(parseMlDate('31 de fevereiro de 2026')).toBeNull();
    expect(parseMlNumber('1.234,56')).toBe(1234.56);
    expect(parseMlNumber('-12,90')).toBe(-12.9);
    expect(parseMlNumber(42)).toBe(42);
  });
});

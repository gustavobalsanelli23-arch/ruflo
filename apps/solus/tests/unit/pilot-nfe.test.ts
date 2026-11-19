import { describe, expect, it } from 'vitest';
import { combine, parseNfe, toCsv } from '../../scripts/pilot/nfe';

const KEY = '35261112345678000199550010000012341000012345';

function nfe({
  key = KEY,
  tpNF = '1',
  finNFe = '1',
  mod = '55',
  cStat = '100',
  items = [{ cProd: 'CAF-01', xProd: 'Café &amp; Cia 500g', qCom: '2.0000', vUnCom: '18.5000', vProd: '37.00', vDesc: '1.00' }],
}: Partial<{ key: string; tpNF: string; finNFe: string; mod: string; cStat: string; items: Record<string, string>[] }> = {}) {
  const det = items
    .map(
      (item, index) =>
        `<det nItem="${index + 1}"><prod><cProd>${item.cProd}</cProd><cEAN>SEM GTIN</cEAN><xProd>${item.xProd}</xProd><uCom>UN</uCom><qCom>${item.qCom}</qCom><vUnCom>${item.vUnCom}</vUnCom><vProd>${item.vProd}</vProd>${item.vDesc ? `<vDesc>${item.vDesc}</vDesc>` : ''}</prod><imposto/></det>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${key}" versao="4.00"><ide><mod>${mod}</mod><serie>1</serie><nNF>1234</nNF><dhEmi>2026-11-17T21:30:00-03:00</dhEmi><tpNF>${tpNF}</tpNF><finNFe>${finNFe}</finNFe></ide><emit><CNPJ>12345678000199</CNPJ><xNome>Loja Exemplo LTDA</xNome></emit><dest><CPF>12345678909</CPF><xNome>Maria da Silva</xNome><enderDest><xLgr>Rua A</xLgr></enderDest><email>maria@example.com</email></dest>${det}</infNFe></NFe><protNFe><infProt><chNFe>${key}</chNFe><cStat>${cStat}</cStat></infProt></protNFe></nfeProc>`;
}

describe('NF-e para planilha', () => {
  it('lê uma venda autorizada com data local, desconto e nome decodificado', () => {
    const parsed = parseNfe(nfe());
    expect(parsed.type).toBe('note');
    if (parsed.type !== 'note') return;
    expect(parsed.note.issuer).toBe('12345678000199');
    expect(parsed.note.lines).toEqual([
      { date: '2026-11-17', order: '1-1234', sku: 'CAF-01', name: 'Café & Cia 500g', unit: 'UN', quantity: 2, unitPrice: 18.5, discount: 1, kind: 'venda', channel: 'NF-e' },
    ]);
  });

  it('nunca leva dados do destinatário para a planilha', () => {
    const result = combine([parseNfe(nfe())]);
    const csv = toCsv(result.byIssuer.get('12345678000199')!.lines);
    expect(csv).not.toMatch(/12345678909|Maria|Rua A|maria@example/);
    expect(csv).toContain('17/11/2026;1-1234;CAF-01;Café & Cia 500g;UN;2;18,5;1;venda;NF-e');
  });

  it('separa devolução de cliente, ignora compras, devolução a fornecedor e notas não autorizadas', () => {
    const returned = parseNfe(nfe({ tpNF: '0', finNFe: '4' }));
    expect(returned.type === 'note' && returned.note.lines[0]!.kind).toBe('devolução');
    expect(parseNfe(nfe({ tpNF: '0' }))).toMatchObject({ type: 'skipped', reason: 'compra' });
    expect(parseNfe(nfe({ tpNF: '1', finNFe: '4' }))).toMatchObject({ type: 'skipped', reason: 'devolucao_fornecedor' });
    expect(parseNfe(nfe({ cStat: '110' }))).toMatchObject({ type: 'skipped', reason: 'nao_autorizada' });
    expect(parseNfe('<html/>')).toMatchObject({ type: 'skipped', reason: 'nao_e_nfe' });
  });

  it('marca NFC-e como canal e tira notas canceladas por evento e repetidas', () => {
    const cancellation = `<procEventoNFe><evento><infEvento Id="ID110111${KEY}01"><chNFe>${KEY}</chNFe><tpEvento>110111</tpEvento></infEvento></evento><retEvento><infEvento><cStat>135</cStat></infEvento></retEvento></procEventoNFe>`;
    const other = '35261112345678000199650010000099991000099999';
    const result = combine([parseNfe(nfe()), parseNfe(cancellation), parseNfe(nfe({ key: other, mod: '65' })), parseNfe(nfe({ key: other, mod: '65' }))]);
    expect(result.notes).toBe(1);
    expect(result.skipped).toEqual({ cancelada: 1, duplicada: 1 });
    expect(result.byIssuer.get('12345678000199')!.lines[0]!.channel).toBe('NFC-e');
  });

  it('protege células que começariam uma fórmula', () => {
    const parsed = parseNfe(nfe({ items: [{ cProd: '=CMD()', xProd: 'Item "especial"; grande', qCom: '1', vUnCom: '10', vProd: '10' }] }));
    if (parsed.type !== 'note') throw new Error('esperava nota');
    const csv = toCsv(parsed.note.lines);
    expect(csv).toContain(`'=CMD()`);
    expect(csv).toContain('"Item ""especial""; grande"');
  });
});

describe('planilha gerada na importação do SOLUS', () => {
  it('o cabeçalho é reconhecido sem ajuste manual', async () => {
    const { suggestMapping } = await import('@/lib/ingest/mapping');
    const header = toCsv([]).replace('\uFEFF', '').trim().split(';');
    const { mapping } = suggestMapping(header, 'sales');
    expect(Object.fromEntries(Object.entries(mapping).map(([field, column]) => [field, header[column!]]))).toEqual({
      sold_at: 'Data da venda',
      order_id: 'Nº do pedido',
      sku: 'SKU',
      product_name: 'Nome do produto',
      quantity: 'Quantidade',
      unit_price: 'Preço unitário',
      discount: 'Desconto',
      kind: 'Tipo',
      channel: 'Canal',
    });
  });
});

import { describe, expect, it } from 'vitest';
import { convertSource, looksLikeMercadoLivre } from '@/modules/data-hub/tenant/convert-source';

const KEY = '35261112345678000199550010000012341000012345';

function nfe({ key = KEY, cnpj = '12345678000199', name = 'Loja Exemplo LTDA' } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc><NFe><infNFe Id="NFe${key}"><ide><mod>55</mod><nNF>1234</nNF><dhEmi>2026-11-17T21:30:00-03:00</dhEmi><tpNF>1</tpNF><finNFe>1</finNFe></ide><emit><CNPJ>${cnpj}</CNPJ><xNome>${name}</xNome></emit><dest><CPF>12345678909</CPF><xNome>Maria da Silva</xNome></dest><det nItem="1"><prod><cProd>CAF-01</cProd><xProd>Café 500g</xProd><uCom>UN</uCom><qCom>2</qCom><vUnCom>18.5</vUnCom><vProd>37.00</vProd></prod></det></infNFe></NFe><protNFe><infProt><chNFe>${key}</chNFe><cStat>100</cStat></infProt></protNFe></nfeProc>`;
}

const xml = (content: string, name = 'nota.xml') => new File([content], name, { type: 'text/xml' });

describe('relatório do Mercado Livre e XML de NF-e na importação', () => {
  it('reconhece o relatório do Mercado Livre pelas colunas dele, não uma planilha de vendas comum', () => {
    expect(looksLikeMercadoLivre([['Vendas'], [], ['N.º de venda', 'Data da venda', 'Unidades', '# de anúncio', 'Título do anúncio']])).toBe(true);
    expect(looksLikeMercadoLivre([['Data da venda', 'Nº do pedido', 'SKU', 'Quantidade', 'Preço unitário']])).toBe(false);
    expect(looksLikeMercadoLivre([['Data', 'Venda', 'Quantidade']])).toBe(false);
  });

  it('converte vários XML de uma empresa numa planilha CSV, sem dados do destinatário', async () => {
    const other = '35261112345678000199550010000099991000099999';
    const result = await convertSource([xml(nfe()), xml(nfe({ key: other }), 'nota2.xml')]);
    expect(result?.ok).toBe(true);
    if (!result?.ok) return;
    expect(result.source).toBe('nfe');
    expect(result.file.name).toBe('vendas-nfe-12345678000199.csv');
    expect(result.file.type).toBe('text/csv');
    const csv = await result.file.text();
    expect(csv).toContain('CAF-01');
    expect(csv).not.toMatch(/12345678909|Maria/);
    expect(result.summary[0]).toContain('2 arquivos XML lidos, 2 notas aproveitadas');
  });

  it('recusa XML de mais de uma empresa emissora', async () => {
    const result = await convertSource([xml(nfe()), xml(nfe({ key: '35261198765432000111550010000012341000012345', cnpj: '98765432000111', name: 'Outra LTDA' }))]);
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining('2 empresas emissoras diferentes') });
  });

  it('não mistura XML com planilha nem aceita várias planilhas de uma vez', async () => {
    const sheet = new File(['a;b\n1;2'], 'vendas.csv', { type: 'text/csv' });
    expect(await convertSource([xml(nfe()), sheet])).toMatchObject({ ok: false });
    expect(await convertSource([sheet, sheet])).toMatchObject({ ok: false });
  });

  it('uma planilha comum segue o caminho normal', async () => {
    expect(await convertSource([new File(['Data;SKU\n17/11/2026;A'], 'vendas.csv', { type: 'text/csv' })])).toBeNull();
  });
});

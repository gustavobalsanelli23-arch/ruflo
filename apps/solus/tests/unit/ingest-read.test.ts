// @vitest-environment node
import writeXlsxFile from 'write-excel-file/node';
import { describe, expect, it } from 'vitest';
import { decodeText } from '@/lib/ingest/decode';
import { detectFormat } from '@/lib/ingest/formats';
import { MAX_FILE_BYTES } from '@/lib/ingest/limits';
import { buildTable, readCsv, readXlsx } from '@/lib/ingest/read';

const utf8 = (text: string) => new TextEncoder().encode(text);
const toArrayBuffer = (buffer: Buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

async function xlsx(rows: (string | number | Date | null)[][], sheet = 'Vendas') {
  return writeXlsxFile(rows.map((row) => row.map((cell) => (cell instanceof Date ? { value: cell, format: 'dd/mm/yyyy' } : cell))), { sheet }).toBuffer();
}

describe('formato decidido pelo conteúdo', () => {
  it('XLSX de verdade é aceito; com nome .csv é recusado', async () => {
    const bytes = new Uint8Array(await xlsx([['SKU'], ['A']]));
    expect(detectFormat(bytes, 'vendas.xlsx')).toEqual({ ok: true, format: 'xlsx' });
    expect(detectFormat(bytes, 'vendas.csv')).toMatchObject({ ok: false, code: 'extension_mismatch' });
  });

  it('texto com nome .xlsx é recusado; texto .csv/.txt é CSV', () => {
    expect(detectFormat(utf8('sku;qtd\nA;1'), 'vendas.xlsx')).toMatchObject({ ok: false, code: 'extension_mismatch' });
    expect(detectFormat(utf8('sku;qtd\nA;1'), 'vendas.csv')).toEqual({ ok: true, format: 'csv' });
    expect(detectFormat(utf8('sku;qtd\nA;1'), 'VENDAS.TXT')).toEqual({ ok: true, format: 'csv' });
  });

  it('XLS (OLE2) e XLSX protegido por senha são recusados com orientação', () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    expect(detectFormat(ole, 'antigo.xls')).toMatchObject({ ok: false, code: 'xls_unsupported' });
    expect(detectFormat(ole, 'protegido.xlsx')).toMatchObject({ ok: false, code: 'xls_unsupported' });
    expect(detectFormat(utf8('a;b'), 'antigo.xls')).toMatchObject({ ok: false, code: 'xls_unsupported' });
  });

  it('binários disfarçados de CSV são recusados', () => {
    expect(detectFormat(utf8('%PDF-1.7 ...'), 'vendas.csv')).toMatchObject({ ok: false, code: 'binary_content' });
    expect(detectFormat(new Uint8Array([0x4d, 0x5a, 0x90, 0]), 'vendas.csv')).toMatchObject({ ok: false, code: 'binary_content' });
    expect(detectFormat(new Uint8Array([0x61, 0x3b, 0x00, 0x62]), 'vendas.csv')).toMatchObject({ ok: false, code: 'binary_content' });
    // ZIP que não é planilha (por exemplo, um .docx renomeado)
    expect(detectFormat(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x77, 0x6f, 0x72, 0x64]), 'vendas.xlsx')).toMatchObject({ ok: false, code: 'unsupported_content' });
  });

  it('vazio, grande demais e extensões desconhecidas', () => {
    expect(detectFormat(new Uint8Array(), 'a.csv')).toMatchObject({ code: 'empty_file' });
    expect(detectFormat(new Uint8Array(MAX_FILE_BYTES + 1), 'a.csv')).toMatchObject({ code: 'file_too_large' });
    expect(detectFormat(utf8('a'), 'planilha.ods')).toMatchObject({ code: 'unsupported_extension' });
    expect(detectFormat(utf8('a'), 'sem-extensao')).toMatchObject({ code: 'unsupported_extension' });
  });
});

describe('codificação de texto', () => {
  it('UTF-8 (com e sem BOM), UTF-16 e Windows-1252', () => {
    expect(decodeText(utf8('Descrição'))).toEqual({ text: 'Descrição', encoding: 'utf-8' });
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('Café')]))).toEqual({ text: 'Café', encoding: 'utf-8' });
    const ansi = new Uint8Array([0x44, 0x65, 0x73, 0x63, 0x72, 0x69, 0xe7, 0xe3, 0x6f]); // "Descrição" em Windows-1252
    expect(decodeText(ansi)).toEqual({ text: 'Descrição', encoding: 'windows-1252' });
    const utf16 = new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0xe7, 0x00]);
    expect(decodeText(utf16)).toEqual({ text: 'Aç', encoding: 'utf-16le' });
  });
});

describe('CSV', () => {
  it('detecta ";" mesmo com vírgula decimal e preserva aspas, quebras e números de registro', () => {
    const csv = readCsv(utf8('Data;Produto;Valor\n01/02/2026;"Café; torrado";1.250,50\n\n02/02/2026;"Linha\ncom quebra";3,5\n'));
    expect(csv).toMatchObject({ ok: true, delimiter: ';' });
    if (!csv.ok) return;
    const table = buildTable(csv.rows);
    expect(table).toMatchObject({ ok: true, headers: ['Data', 'Produto', 'Valor'] });
    if (!table.ok) return;
    expect(table.rows).toEqual([
      { line: 2, cells: ['01/02/2026', 'Café; torrado', '1.250,50'] },
      { line: 4, cells: ['02/02/2026', 'Linha\ncom quebra', '3,5'] },
    ]);
  });

  it('vírgula como separador e tabulação também', () => {
    expect(readCsv(utf8('sku,qtd\nA,1\nB,2'))).toMatchObject({ ok: true, delimiter: ',' });
    expect(readCsv(utf8('sku\tqtd\nA\t1'))).toMatchObject({ ok: true, delimiter: '\t' });
  });

  it('aspas sem fechamento viram uma mensagem clara', () => {
    const result = readCsv(utf8('sku;nome\nA;"sem fim\nB;ok'));
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.message).toMatch(/Aspas sem fechamento/);
  });
});

describe('tabela', () => {
  it('cabeçalhos vazios e repetidos ganham nomes; linhas de título antes do cabeçalho são puladas', () => {
    const table = buildTable([[null, null], ['SKU', 'Qtd', null, 'Qtd', ''], ['A', 1, null, 2, null]]);
    expect(table).toMatchObject({ ok: true, headers: ['SKU', 'Qtd', 'Coluna 3', 'Qtd (2)'] });
    if (table.ok) expect(table.rows).toEqual([{ line: 3, cells: ['A', 1, null, 2] }]);
  });

  it('sem linhas de dados, ou só vazio, explica o problema', () => {
    expect(buildTable([['SKU', 'Qtd']])).toMatchObject({ ok: false });
    expect(buildTable([[null], ['']])).toMatchObject({ ok: false });
  });
});

describe('XLSX', () => {
  it('lê todas as abas; datas viram AAAA-MM-DD e números continuam números', async () => {
    const buffer = await writeXlsxFile(
      [
        {
          sheet: 'Vendas',
          data: [
            ['Data', 'SKU', 'Quantidade', 'Preço'],
            [{ value: new Date(Date.UTC(2026, 0, 31)), format: 'dd/mm/yyyy' }, 'CAF-01', 2, 19.9],
            [{ value: new Date(Date.UTC(2026, 1, 1)), format: 'dd/mm/yyyy' }, 7891234567890, 1, 1250.5],
          ],
        },
        { sheet: 'Resumo', data: [['Total'], [1270.4]] },
      ],
    ).toBuffer();
    const result = await readXlsx(toArrayBuffer(buffer));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheets.map((sheet) => sheet.name)).toEqual(['Vendas', 'Resumo']);
    expect(result.sheets[0]!.rows).toEqual([
      ['Data', 'SKU', 'Quantidade', 'Preço'],
      ['2026-01-31', 'CAF-01', 2, 19.9],
      ['2026-02-01', 7891234567890, 1, 1250.5],
    ]);
  });

  it('arquivo corrompido devolve mensagem, não exceção', async () => {
    const broken = new Uint8Array(await xlsx([['a']])).slice(0, 200);
    expect(await readXlsx(broken.buffer)).toMatchObject({ ok: false });
  });
});

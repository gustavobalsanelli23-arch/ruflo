import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/universal';
import { decodeText, type TextEncoding } from './decode';
import { MAX_COLUMNS, MAX_ROWS } from './limits';
import type { ParsedTable, RawCell } from './types';

/**
 * Reads CSV text or an XLSX workbook into a table: a header row and the data
 * rows with their record number. Runs in the browser; the server never parses
 * files (it re-validates every value it receives).
 */

export type ReadError = { ok: false; message: string };

export interface CsvSheet {
  rows: RawCell[][];
  delimiter: string;
  encoding: TextEncoding;
}

export function readCsv(bytes: Uint8Array): ({ ok: true } & CsvSheet) | ReadError {
  const { text, encoding } = decodeText(bytes);
  const result = Papa.parse<string[]>(text, {
    delimiter: '',
    delimitersToGuess: [';', ',', '\t', '|'],
    skipEmptyLines: false,
  });
  const quoteError = result.errors.find((error) => error.type === 'Quotes');
  if (quoteError) {
    return { ok: false, message: `Aspas sem fechamento perto do registro ${(quoteError.row ?? 0) + 1}. Confira a exportação do arquivo.` };
  }
  return { ok: true, rows: result.data, delimiter: result.meta.delimiter, encoding };
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toRawCell(value: unknown): RawCell {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : isoDate(value);
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
  return String(value);
}

export async function readXlsx(input: ArrayBuffer): Promise<({ ok: true; sheets: { name: string; rows: RawCell[][] }[] }) | ReadError> {
  try {
    const sheets = await readXlsxFile(input);
    return {
      ok: true,
      sheets: sheets.map((sheet) => ({ name: sheet.sheet, rows: sheet.data.map((row) => row.map(toRawCell)) })),
    };
  } catch {
    return { ok: false, message: 'Não foi possível ler a planilha. Abra no Excel, salve de novo como .xlsx e tente outra vez.' };
  }
}

const isEmpty = (cell: RawCell) => cell === null || (typeof cell === 'string' && cell.trim() === '');

/**
 * The header is the first non-empty row within the first 20. Empty header
 * cells become "Coluna N"; repeated names get a suffix. Fully empty rows are
 * dropped, but every kept row keeps its original record number.
 */
export function buildTable(rows: RawCell[][]): ({ ok: true } & ParsedTable) | ReadError {
  const headerIndex = rows.slice(0, 20).findIndex((row) => row.some((cell) => !isEmpty(cell)));
  if (headerIndex < 0) return { ok: false, message: 'Não encontramos uma linha de cabeçalho nas primeiras 20 linhas.' };

  const headerRow = rows[headerIndex]!;
  let width = headerRow.length;
  while (width > 0 && isEmpty(headerRow[width - 1] ?? null)) width--;
  if (width > MAX_COLUMNS) return { ok: false, message: `A planilha tem mais de ${MAX_COLUMNS} colunas. Remova as colunas que não serão usadas.` };

  const seen = new Map<string, number>();
  const headers = Array.from({ length: width }, (_, index) => {
    const raw = headerRow[index];
    const base = isEmpty(raw ?? null) ? `Coluna ${index + 1}` : String(raw).replace(/\s+/g, ' ').trim().slice(0, 80);
    const count = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), count);
    return count === 1 ? base : `${base} (${count})`;
  });

  const data: ParsedTable['rows'] = [];
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const cells = (rows[index] ?? []).slice(0, width);
    if (cells.every(isEmpty)) continue;
    while (cells.length < width) cells.push(null);
    data.push({ line: index + 1, cells });
    if (data.length > MAX_ROWS) {
      return { ok: false, message: `O arquivo passa de ${MAX_ROWS.toLocaleString('pt-BR')} linhas. Divida por período.` };
    }
  }
  if (data.length === 0) return { ok: false, message: 'A planilha tem cabeçalho, mas nenhuma linha de dados.' };
  return { ok: true, headers, rows: data };
}

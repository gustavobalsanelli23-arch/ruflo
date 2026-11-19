/**
 * Mercado Livre sales report (Vendas > Exportar, .xlsx) -> SOLUS sales
 * spreadsheet (CSV), for the pilot with e-commerce sellers.
 *
 * The report has title rows above the header and buyer columns (name, CPF,
 * address). This keeps only sale number, date, SKU, ad title, units and price;
 * buyer columns are never read, as the pilot consent form promises.
 *
 * Which rows become sales: every row with SKU (or ad number) and units.
 * Cancelled and returned sales are left out and counted, so the revenue
 * matches what the seller actually kept. Pack summary rows (no units) are
 * skipped. Mercado Livre fees and shipping are added up and shown in the
 * summary: SOLUS has no column for them yet, so profit there does not
 * subtract them.
 *
 * Column names vary between report versions; they are matched by words, and
 * the script stops listing the headers it found if a required one is missing.
 *
 *   node scripts/pilot/mercado-livre.ts <relatorio.xlsx> [saida.csv]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type Cell = string | number | boolean | Date | null | undefined;

export interface MlLine {
  date: string;
  order: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface MlConversion {
  lines: MlLine[];
  skipped: { canceladas: number; devolvidas: number; semUnidades: number; dataIlegivel: number };
  fees: number | null;
  shipping: number | null;
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/n\.?\s*[º°]\.?/g, 'n ')
    .replace(/[^a-z0-9#]+/g, ' ')
    .trim();

/** Each column: header words to look for, in order of preference. */
const COLUMNS = {
  order: [/^n de venda/, /^numero de venda/, /^venda$/],
  date: [/^data da venda/, /^data de venda/, /^data$/],
  status: [/^estado$/, /^status$/, /^situacao$/, /^estado da venda/],
  units: [/^unidades$/, /^quantidade$/, /^unidades vendidas/],
  sku: [/^sku$/, /^sku do produto/],
  adId: [/^# de anuncio/, /^anuncio$/, /^n de anuncio/, /^codigo do anuncio/],
  title: [/^titulo do anuncio/, /^titulo$/, /^produto$/],
  unitPrice: [/^preco unitario de venda/, /^preco unitario/],
  revenue: [/^receita por produtos/, /^receita por produto/],
  fees: [/^tarifa de venda/, /^tarifas de venda/],
  shipping: [/^tarifas de envio/, /^tarifa de envio/, /^custo de envio/],
} as const;
type Column = keyof typeof COLUMNS;
const REQUIRED: Column[] = ['order', 'date', 'units'];

export class MlFormatError extends Error {}

function text(cell: Cell): string {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return cell.toISOString();
  return String(cell).replace(/\s+/g, ' ').trim();
}

function findColumns(header: Cell[]) {
  const names = header.map((cell) => normalize(text(cell)));
  const found: Partial<Record<Column, number>> = {};
  for (const [column, patterns] of Object.entries(COLUMNS) as [Column, readonly RegExp[]][]) {
    for (const pattern of patterns) {
      const index = names.findIndex((name, i) => pattern.test(name) && !Object.values(found).includes(i));
      if (index >= 0) {
        found[column] = index;
        break;
      }
    }
  }
  return found;
}

const MONTHS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "17 de novembro de 2026 14:32 hs.", "17/11/2026 14:32" or an Excel date. */
export function parseMlDate(cell: Cell): string | null {
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? null : cell.toISOString().slice(0, 10);
  if (typeof cell === 'number' && cell > 20000 && cell < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(cell) * 86_400_000).toISOString().slice(0, 10);
  }
  const value = normalize(text(cell));
  let match = /^(\d{1,2}) de ([a-z]+) de (\d{4})/.exec(value);
  if (match) {
    const month = MONTHS.indexOf(match[2]!) + 1;
    return month > 0 ? iso(Number(match[3]), month, Number(match[1])) : null;
  }
  match = /^(\d{1,2}) (\d{1,2}) (\d{4})/.exec(value);
  if (match) return iso(Number(match[3]), Number(match[2]), Number(match[1]));
  match = /^(\d{4}) (\d{1,2}) (\d{1,2})/.exec(value);
  if (match) return iso(Number(match[1]), Number(match[2]), Number(match[3]));
  return null;
}

function iso(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0, 10) : null;
}

/** Numbers as Excel gives them, or Brazilian text ("1.234,56", "-12,90"). */
export function parseMlNumber(cell: Cell): number | null {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;
  const value = text(cell).replace(/[R$\s]/g, '');
  if (value === '' || value === '-') return null;
  const normalized = /,\d{1,2}$/.test(value) || /\.\d{3},/.test(value) ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function convertMercadoLivre(rows: Cell[][]): MlConversion {
  const headerIndex = rows.slice(0, 30).findIndex((row) => {
    const found = findColumns(row);
    return REQUIRED.every((column) => found[column] !== undefined);
  });
  if (headerIndex < 0) {
    const sample = rows
      .slice(0, 30)
      .flat()
      .map(text)
      .filter(Boolean)
      .slice(0, 40);
    throw new MlFormatError(
      `Não achei as colunas de nº de venda, data da venda e unidades. Cabeçalhos vistos: ${sample.join(' | ') || '(nenhum)'}`,
    );
  }
  const columns = findColumns(rows[headerIndex]!);
  if (columns.sku === undefined && columns.adId === undefined) {
    throw new MlFormatError('O relatório não tem coluna de SKU nem de nº do anúncio.');
  }
  if (columns.unitPrice === undefined && columns.revenue === undefined) {
    throw new MlFormatError('O relatório não tem preço unitário nem receita por produtos.');
  }

  const at = (row: Cell[], column: Column) => (columns[column] === undefined ? null : row[columns[column]!]);
  const result: MlConversion = {
    lines: [],
    skipped: { canceladas: 0, devolvidas: 0, semUnidades: 0, dataIlegivel: 0 },
    fees: columns.fees === undefined ? null : 0,
    shipping: columns.shipping === undefined ? null : 0,
  };

  for (const row of rows.slice(headerIndex + 1)) {
    if (!row || row.every((cell) => text(cell) === '')) continue;
    const status = normalize(text(at(row, 'status')));
    if (/cancel/.test(status)) {
      result.skipped.canceladas++;
      continue;
    }
    if (/devol|reembols|mediac/.test(status)) {
      result.skipped.devolvidas++;
      continue;
    }
    const quantity = parseMlNumber(at(row, 'units'));
    const sku = text(at(row, 'sku')) || text(at(row, 'adId'));
    if (!quantity || quantity <= 0 || !sku) {
      result.skipped.semUnidades++;
      continue;
    }
    const date = parseMlDate(at(row, 'date'));
    if (!date) {
      result.skipped.dataIlegivel++;
      continue;
    }
    const revenue = parseMlNumber(at(row, 'revenue'));
    const unitPrice = parseMlNumber(at(row, 'unitPrice')) ?? (revenue !== null ? revenue / quantity : null);
    if (unitPrice === null) {
      result.skipped.semUnidades++;
      continue;
    }
    if (result.fees !== null) result.fees += Math.abs(parseMlNumber(at(row, 'fees')) ?? 0);
    if (result.shipping !== null) result.shipping += Math.abs(parseMlNumber(at(row, 'shipping')) ?? 0);
    result.lines.push({ date, order: text(at(row, 'order')), sku, name: text(at(row, 'title')), quantity, unitPrice });
  }
  result.lines.sort((a, b) => a.date.localeCompare(b.date) || a.order.localeCompare(b.order));
  return result;
}

const HEADER = ['Data da venda', 'Nº do pedido', 'SKU', 'Nome do produto', 'Quantidade', 'Preço unitário', 'Tipo', 'Canal'];

function brNumber(value: number) {
  const fixed = value.toFixed(4);
  return fixed.replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
}

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(lines: MlLine[]) {
  const rows = lines.map((line) => [
    line.date.split('-').reverse().join('/'),
    line.order,
    line.sku,
    line.name,
    brNumber(line.quantity),
    brNumber(line.unitPrice),
    'venda',
    'Mercado Livre',
  ]);
  return `﻿${[HEADER, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function main() {
  const [input, output = 'vendas-mercado-livre.csv'] = process.argv.slice(2);
  if (!input) {
    console.error('Uso: node scripts/pilot/mercado-livre.ts <relatorio.xlsx> [saida.csv]');
    process.exit(1);
  }
  const { default: readXlsxFile } = await import('read-excel-file/node');
  const sheets = (await readXlsxFile(resolve(input))) as unknown as { sheet: string; data: Cell[][] }[];
  let result: MlConversion | null = null;
  let lastError: Error | null = null;
  for (const sheet of sheets) {
    try {
      result = convertMercadoLivre(sheet.data);
      break;
    } catch (error) {
      if (!(error instanceof MlFormatError)) throw error;
      lastError = error;
    }
  }
  if (!result) {
    console.error(lastError?.message ?? 'Planilha vazia.');
    process.exit(1);
  }
  writeFileSync(resolve(output), toCsv(result.lines));
  const revenue = result.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  console.log(`${result.lines.length} linhas de venda (${brl(revenue)}) -> ${output}`);
  const { canceladas, devolvidas, semUnidades, dataIlegivel } = result.skipped;
  if (canceladas) console.log(`  ${canceladas} vendas canceladas ficaram fora`);
  if (devolvidas) console.log(`  ${devolvidas} vendas devolvidas ou em mediação ficaram fora`);
  if (semUnidades) console.log(`  ${semUnidades} linhas sem SKU, unidades ou preço (resumo de pacote?) ficaram fora`);
  if (dataIlegivel) console.log(`  ${dataIlegivel} linhas com data ilegível ficaram fora`);
  if (result.fees !== null || result.shipping !== null) {
    console.log(
      `Tarifas do Mercado Livre no período: ${brl(result.fees ?? 0)} de venda e ${brl(result.shipping ?? 0)} de envio.` +
        ' O SOLUS ainda não desconta esses valores do lucro.',
    );
  }
  console.log('Colunas do comprador (nome, CPF, endereço) não foram lidas nem gravadas.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();

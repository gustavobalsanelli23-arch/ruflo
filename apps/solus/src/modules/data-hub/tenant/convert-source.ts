import { detectFormat } from '@/lib/ingest/formats';
import { readXlsx } from '@/lib/ingest/read';
import { convertMercadoLivre, MlFormatError, toCsv as mlToCsv } from '@/lib/ingest/sources/mercado-livre';
import { combine, parseNfe, SKIP_LABEL, toCsv as nfeToCsv } from '@/lib/ingest/sources/nfe';

/**
 * Files that are not a sales spreadsheet yet, converted in the browser into
 * one: the Mercado Livre sales report (.xlsx) and NF-e / NFC-e XML (one or
 * many). The original never leaves the computer; what is uploaded is the
 * converted CSV, without buyer or recipient data. Anything else returns
 * `null` and goes through the normal reading.
 */

export type Converted = { ok: true; file: File; source: 'mercado-livre' | 'nfe'; summary: string[] };
export type ConvertResult = Converted | { ok: false; message: string } | null;

/** Max XML files in one go (a month of notes for a small shop fits easily). */
export const MAX_XML_FILES = 5000;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/n\.?\s*[º°]\.?/g, 'n ')
    .replace(/[^a-z0-9#]+/g, ' ')
    .trim();

/** Headers only the Mercado Livre report has (two of them must be present). */
const ML_MARKERS = [/^n de venda/, /^# de anuncio/, /^receita por produtos/, /^tarifa de venda/, /^titulo do anuncio/, /^tarifas de envio/];

export function looksLikeMercadoLivre(rows: unknown[][]): boolean {
  for (const row of rows.slice(0, 20)) {
    const names = row.map((cell) => normalize(cell === null || cell === undefined ? '' : String(cell)));
    const hits = ML_MARKERS.filter((marker) => names.some((name) => marker.test(name))).length;
    if (hits >= 2) return true;
  }
  return false;
}

const isXml = (file: File) => /\.xml$/i.test(file.name) || file.type === 'text/xml' || file.type === 'application/xml';
const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const plural = (count: number, one: string, many: string) => `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`;

function csvFile(text: string, name: string) {
  return new File([new TextEncoder().encode(text)], name, { type: 'text/csv' });
}

async function convertNfe(files: File[]): Promise<ConvertResult> {
  if (files.length > MAX_XML_FILES) return { ok: false, message: `São ${files.length} arquivos. Envie até ${MAX_XML_FILES} XML por vez.` };
  const parsed = await Promise.all(files.map(async (file) => parseNfe(await file.text())));
  const result = combine(parsed);
  if (result.byIssuer.size > 1) {
    const names = [...result.byIssuer.values()].map((group) => group.name).filter(Boolean).slice(0, 3).join(', ');
    return {
      ok: false,
      message: `Os XML são de ${result.byIssuer.size} empresas emissoras diferentes${names ? ` (${names})` : ''}. Importe as notas de uma empresa por vez, na organização dela.`,
    };
  }
  const [issuer, group] = [...result.byIssuer.entries()][0] ?? [];
  if (!group || group.lines.length === 0) {
    const reasons = Object.entries(result.skipped)
      .map(([reason, total]) => `${total} ${SKIP_LABEL[reason as keyof typeof SKIP_LABEL]}`)
      .join(', ');
    return { ok: false, message: `Nenhuma nota de venda autorizada nesses XML.${reasons ? ` Ficaram fora: ${reasons}.` : ''}` };
  }
  const revenue = group.lines.reduce((sum, line) => sum + (line.kind === 'devolução' ? -1 : 1) * (line.quantity * line.unitPrice - line.discount), 0);
  const summary = [
    `${plural(files.length, 'arquivo XML lido', 'arquivos XML lidos')}, ${plural(result.notes, 'nota aproveitada', 'notas aproveitadas')}: ${plural(group.lines.length, 'linha', 'linhas')} de venda (${brl(revenue)}).`,
    ...Object.entries(result.skipped).map(([reason, total]) => `${total} ${SKIP_LABEL[reason as keyof typeof SKIP_LABEL]} ficaram fora.`),
    'Os dados do destinatário (CPF/CNPJ, nome, endereço) não foram lidos.',
  ];
  return { ok: true, file: csvFile(nfeToCsv(group.lines), `vendas-nfe-${issuer || 'sem-documento'}.csv`), source: 'nfe', summary };
}

async function convertMl(file: File): Promise<ConvertResult> {
  const workbook = await readXlsx(await file.arrayBuffer());
  if (!workbook.ok) return null;
  const sheet = workbook.sheets.find((item) => looksLikeMercadoLivre(item.rows));
  if (!sheet) return null;
  try {
    const result = convertMercadoLivre(sheet.rows);
    if (result.lines.length === 0) return { ok: false, message: 'O relatório do Mercado Livre não tem nenhuma venda concluída no período.' };
    const revenue = result.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const { canceladas, devolvidas, semUnidades, dataIlegivel } = result.skipped;
    const summary = [
      `Relatório do Mercado Livre: ${plural(result.lines.length, 'linha', 'linhas')} de venda (${brl(revenue)}).`,
      ...(canceladas ? [`${plural(canceladas, 'venda cancelada ficou', 'vendas canceladas ficaram')} fora.`] : []),
      ...(devolvidas ? [`${plural(devolvidas, 'venda devolvida ou em mediação ficou', 'vendas devolvidas ou em mediação ficaram')} fora.`] : []),
      ...(semUnidades ? [`${plural(semUnidades, 'linha sem SKU, unidades ou preço ficou', 'linhas sem SKU, unidades ou preço ficaram')} fora.`] : []),
      ...(dataIlegivel ? [`${plural(dataIlegivel, 'linha com data ilegível ficou', 'linhas com data ilegível ficaram')} fora.`] : []),
      ...(result.fees !== null || result.shipping !== null
        ? [`Tarifas do Mercado Livre no período: ${brl(result.fees ?? 0)} de venda e ${brl(result.shipping ?? 0)} de envio. O SOLUS ainda não desconta esses valores do lucro.`]
        : []),
      'As colunas do comprador (nome, CPF, endereço) não foram lidas.',
    ];
    const base = file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'mercado-livre';
    return { ok: true, file: csvFile(mlToCsv(result.lines), `${base}-vendas.csv`), source: 'mercado-livre', summary };
  } catch (error) {
    if (error instanceof MlFormatError) return { ok: false, message: error.message };
    throw error;
  }
}

/** Converts the picked files when they are a Mercado Livre report or NF-e XML; null otherwise. */
export async function convertSource(files: File[]): Promise<ConvertResult> {
  if (files.length === 0) return null;
  if (files.every(isXml)) return convertNfe(files);
  if (files.some(isXml)) return { ok: false, message: 'Envie só XML de NF-e, ou só uma planilha. Não misture os dois.' };
  if (files.length > 1) return { ok: false, message: 'Escolha uma planilha por vez. Vários arquivos de uma vez só para XML de NF-e.' };
  const file = files[0]!;
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const check = detectFormat(head, file.name);
  // Only a real XLSX can be a Mercado Livre report (the ZIP signature).
  if (!(head[0] === 0x50 && head[1] === 0x4b) || (check.ok && check.format !== 'xlsx')) return null;
  return convertMl(file);
}

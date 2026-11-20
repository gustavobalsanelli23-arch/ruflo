/**
 * NF-e / NFC-e XML -> SOLUS sales spreadsheet (CSV), for the pilot with
 * accounting firms.
 *
 * Keeps only what the import needs: date, note number, product code and name,
 * quantity, price and discount. The recipient block (<dest>: CPF/CNPJ, name,
 * address, e-mail) is never read, as the pilot consent form promises, so no
 * consumer data reaches the spreadsheet.
 *
 * Which notes become rows:
 *   - authorized sales (tpNF=1, finNFe=1) -> "venda";
 *   - customer returns (tpNF=0, finNFe=4) -> "devolução";
 *   - everything else (purchases, returns to suppliers, complementary or
 *     adjustment notes, notes cancelled by an event in the same folder,
 *     notes without an authorization protocol of status 100) is skipped
 *     and counted in the summary.
 * One CSV per issuer, so a folder with several clients yields one file each.
 *
 *   node scripts/pilot/nfe.ts <pasta-com-xml> [pasta-de-saida]
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface NfeLine {
  date: string;
  order: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  kind: 'venda' | 'devolução';
  channel: 'NF-e' | 'NFC-e';
}

export interface NfeNote {
  key: string;
  issuer: string;
  issuerName: string;
  lines: NfeLine[];
}

export type NfeParse =
  | { type: 'note'; note: NfeNote }
  | { type: 'cancellation'; key: string }
  | { type: 'skipped'; key: string | null; reason: SkipReason };

export type SkipReason = 'compra' | 'devolucao_fornecedor' | 'complementar_ou_ajuste' | 'nao_autorizada' | 'nao_e_nfe' | 'sem_itens';

export const SKIP_LABEL: Record<SkipReason | 'cancelada' | 'duplicada', string> = {
  compra: 'notas de entrada (compras)',
  devolucao_fornecedor: 'devoluções a fornecedor',
  complementar_ou_ajuste: 'notas complementares ou de ajuste',
  nao_autorizada: 'notas sem autorização da SEFAZ (cStat 100)',
  nao_e_nfe: 'arquivos que não são NF-e',
  sem_itens: 'notas sem itens',
  cancelada: 'notas canceladas',
  duplicada: 'notas repetidas',
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity: string) => {
      if (entity[0] === '#') {
        const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return ENTITIES[entity.toLowerCase()] ?? whole;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Inner XML of the first <tag> (namespace prefixes allowed), or null. */
function block(xml: string, tag: string): string | null {
  const match = new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${tag}>`).exec(xml);
  return match ? match[1]! : null;
}

function blocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'g');
  return [...xml.matchAll(re)].map((match) => match[1]!);
}

function value(xml: string | null, tag: string): string {
  if (xml === null) return '';
  const inner = block(xml, tag);
  return inner === null ? '' : decode(inner);
}

function number(text: string): number {
  const parsed = Number(text);
  return text !== '' && Number.isFinite(parsed) ? parsed : 0;
}

/** Removes the recipient block before anything else is read. */
function withoutRecipient(xml: string) {
  return xml.replace(/<(?:\w+:)?dest(?:\s[^>]*)?>[\s\S]*?<\/(?:\w+:)?dest>/g, '');
}

export function parseNfe(raw: string): NfeParse {
  const xml = withoutRecipient(raw);

  // Cancellation event (procEventoNFe / evento with tpEvento 110111).
  const event = block(xml, 'infEvento');
  if (event !== null && !block(xml, 'infNFe')) {
    const key = value(event, 'chNFe');
    const status = value(block(xml, 'retEvento'), 'cStat');
    const accepted = status === '' || status === '135' || status === '155';
    if (value(event, 'tpEvento') === '110111' && key && accepted) return { type: 'cancellation', key };
    return { type: 'skipped', key: key || null, reason: 'nao_e_nfe' };
  }

  const infMatch = /<(?:\w+:)?infNFe\s[^>]*Id="NFe(\d{44})"[^>]*>([\s\S]*?)<\/(?:\w+:)?infNFe>/.exec(xml);
  if (!infMatch) return { type: 'skipped', key: null, reason: 'nao_e_nfe' };
  const key = infMatch[1]!;
  const inf = infMatch[2]!;

  const protocol = block(xml, 'infProt');
  if (protocol === null || value(protocol, 'cStat') !== '100') return { type: 'skipped', key, reason: 'nao_autorizada' };

  const ide = block(inf, 'ide');
  const direction = value(ide, 'tpNF');
  const purpose = value(ide, 'finNFe');
  let kind: NfeLine['kind'];
  if (purpose === '1' && direction === '1') kind = 'venda';
  else if (purpose === '4' && direction === '0') kind = 'devolução';
  else if (purpose === '4') return { type: 'skipped', key, reason: 'devolucao_fornecedor' };
  else if (purpose === '2' || purpose === '3') return { type: 'skipped', key, reason: 'complementar_ou_ajuste' };
  else return { type: 'skipped', key, reason: 'compra' };

  // dhEmi carries the issuer's local offset, so its first 10 characters are the local date.
  const date = (value(ide, 'dhEmi') || value(ide, 'dEmi')).slice(0, 10);
  const order = `${value(ide, 'serie') || '0'}-${value(ide, 'nNF')}`;
  const channel = value(ide, 'mod') === '65' ? 'NFC-e' : 'NF-e';

  const emit = block(inf, 'emit');
  // The issuer names the output file: only a well-formed CNPJ (14 digits) or
  // CPF (11) is kept, so XML text can never become a path.
  const taxId = value(emit, 'CNPJ') || value(emit, 'CPF');
  const issuer = /^(\d{11}|\d{14})$/.test(taxId) ? taxId : '';
  const issuerName = value(emit, 'xFant') || value(emit, 'xNome');

  const lines: NfeLine[] = [];
  for (const det of blocks(inf, 'det')) {
    const prod = block(det, 'prod');
    const ean = value(prod, 'cEAN');
    const sku = value(prod, 'cProd') || (/^\d{8,14}$/.test(ean) ? ean : '');
    const quantity = number(value(prod, 'qCom'));
    if (!sku || quantity <= 0) continue;
    const gross = number(value(prod, 'vProd'));
    const unitPrice = number(value(prod, 'vUnCom')) || (gross ? gross / quantity : 0);
    lines.push({
      date,
      order,
      sku,
      name: value(prod, 'xProd'),
      unit: value(prod, 'uCom'),
      quantity,
      unitPrice,
      discount: number(value(prod, 'vDesc')),
      kind,
      channel,
    });
  }
  if (lines.length === 0) return { type: 'skipped', key, reason: 'sem_itens' };
  return { type: 'note', note: { key, issuer, issuerName, lines } };
}

export interface Conversion {
  byIssuer: Map<string, { name: string; lines: NfeLine[] }>;
  skipped: Partial<Record<keyof typeof SKIP_LABEL, number>>;
  notes: number;
}

/** Combines parsed files: drops cancelled and repeated notes, groups by issuer. */
export function combine(parsed: NfeParse[]): Conversion {
  const cancelled = new Set(parsed.flatMap((item) => (item.type === 'cancellation' ? [item.key] : [])));
  const seen = new Set<string>();
  const skipped: Conversion['skipped'] = {};
  const count = (reason: keyof typeof SKIP_LABEL) => (skipped[reason] = (skipped[reason] ?? 0) + 1);
  const byIssuer: Conversion['byIssuer'] = new Map();
  let notes = 0;

  for (const item of parsed) {
    if (item.type === 'cancellation') continue;
    if (item.type === 'skipped') {
      count(item.reason);
      continue;
    }
    const { note } = item;
    if (cancelled.has(note.key)) {
      count('cancelada');
      continue;
    }
    if (seen.has(note.key)) {
      count('duplicada');
      continue;
    }
    seen.add(note.key);
    notes++;
    const group = byIssuer.get(note.issuer) ?? { name: note.issuerName, lines: [] };
    group.lines.push(...note.lines);
    byIssuer.set(note.issuer, group);
  }
  for (const group of byIssuer.values()) {
    group.lines.sort((a, b) => a.date.localeCompare(b.date) || a.order.localeCompare(b.order, 'pt-BR', { numeric: true }));
  }
  return { byIssuer, skipped, notes };
}

const HEADER = ['Data da venda', 'Nº do pedido', 'SKU', 'Nome do produto', 'Unidade', 'Quantidade', 'Preço unitário', 'Desconto', 'Tipo', 'Canal'];

function brNumber(value: number, decimals: number) {
  const fixed = value.toFixed(decimals);
  return (fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed).replace('.', ',');
}

function csvCell(text: string) {
  // Keeps spreadsheet apps from running a cell as a formula.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Semicolon CSV with comma decimals, as Excel in Portuguese opens it; UTF-8 with BOM. */
export function toCsv(lines: NfeLine[]) {
  const rows = lines.map((line) => [
    line.date.split('-').reverse().join('/'),
    line.order,
    line.sku,
    line.name,
    line.unit,
    brNumber(line.quantity, 4),
    brNumber(line.unitPrice, 4),
    brNumber(line.discount, 2),
    line.kind,
    line.channel,
  ]);
  return `﻿${[HEADER, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}

function xmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return xmlFiles(path);
    return entry.toLowerCase().endsWith('.xml') ? [path] : [];
  });
}

function main() {
  const [input, output = 'planilhas-solus'] = process.argv.slice(2);
  if (!input) {
    console.error('Uso: node scripts/pilot/nfe.ts <pasta-com-xml> [pasta-de-saida]');
    process.exit(1);
  }
  const files = xmlFiles(resolve(input));
  if (files.length === 0) {
    console.error('Nenhum arquivo .xml nessa pasta.');
    process.exit(1);
  }
  const result = combine(files.map((file) => parseNfe(readFileSync(file, 'utf8'))));
  mkdirSync(resolve(output), { recursive: true });

  console.log(`${files.length} arquivos lidos, ${result.notes} notas aproveitadas.`);
  for (const [issuer, group] of result.byIssuer) {
    const file = join(resolve(output), `vendas-${issuer || 'sem-documento'}.csv`);
    if (!file.startsWith(resolve(output) + sep)) throw new Error(`Caminho de saída inválido: ${file}`);
    writeFileSync(file, toCsv(group.lines));
    console.log(`  ${group.name || issuer}: ${group.lines.length} linhas -> ${basename(file)}`);
  }
  const skipped = Object.entries(result.skipped);
  if (skipped.length > 0) {
    console.log('Fora da planilha:');
    for (const [reason, total] of skipped) console.log(`  ${total} ${SKIP_LABEL[reason as keyof typeof SKIP_LABEL]}`);
  }
  console.log('Dados do destinatário (CPF/CNPJ, nome, endereço) não foram lidos nem gravados.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();

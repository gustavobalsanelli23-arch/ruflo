import { fieldsOf } from './fields';
import type { Dataset, Mapping, ParsedTable, RawCell, ReadOptions } from './types';

/** Header comparison key: lower case, no accents, punctuation as spaces. */
export function normalizeHeader(header: string) {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/n[º°]\.?/g, 'n ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function score(header: string, synonyms: string[]) {
  const normalized = normalizeHeader(header);
  if (!normalized) return 0;
  let best = 0;
  for (const synonym of synonyms) {
    if (normalized === synonym) return 1;
    // "valor unitario (r$)" contém "valor unitario" como palavras inteiras
    if (` ${normalized} `.includes(` ${synonym} `)) best = Math.max(best, 0.6 + Math.min(synonym.length / normalized.length, 1) * 0.3);
  }
  return best;
}

/**
 * Suggests a column for each field. Each column goes to at most one field:
 * the strongest match wins, so "Valor unitário" goes to the price and not to
 * the total.
 */
export function suggestMapping(headers: string[], dataset: Dataset): { mapping: Mapping; confidence: Record<string, number> } {
  const candidates: { field: string; column: number; score: number }[] = [];
  for (const field of fieldsOf(dataset)) {
    headers.forEach((header, column) => {
      const value = score(header, field.synonyms);
      if (value > 0) candidates.push({ field: field.key, column, score: value });
    });
  }
  candidates.sort((a, b) => b.score - a.score);

  const mapping: Mapping = {};
  const confidence: Record<string, number> = {};
  const usedColumns = new Set<number>();
  for (const candidate of candidates) {
    if (candidate.field in mapping || usedColumns.has(candidate.column)) continue;
    mapping[candidate.field] = candidate.column;
    confidence[candidate.field] = candidate.score;
    usedColumns.add(candidate.column);
  }
  return { mapping, confidence };
}

/** What stops the mapping from being used, in the user's words. */
export function mappingProblems(mapping: Mapping, dataset: Dataset, options: Pick<ReadOptions, 'snapshotDate'>, headers: string[]) {
  const problems: string[] = [];
  for (const field of fieldsOf(dataset)) {
    if (field.required && mapping[field.key] === undefined) problems.push(`Escolha a coluna de "${field.label}".`);
  }
  if (dataset === 'sales' && mapping.unit_price === undefined && mapping.line_total === undefined) {
    problems.push('Escolha a coluna de "Preço unitário" ou a de "Valor total da linha".');
  }
  if (dataset === 'inventory' && mapping.snapshot_date === undefined && !options.snapshotDate) {
    problems.push('Escolha a coluna de "Data da posição" ou informe a data da contagem.');
  }
  const byColumn = new Map<number, string[]>();
  for (const field of fieldsOf(dataset)) {
    const column = mapping[field.key];
    if (column === undefined) continue;
    if (column < 0 || column >= headers.length) problems.push(`A coluna escolhida para "${field.label}" não existe.`);
    byColumn.set(column, [...(byColumn.get(column) ?? []), field.label]);
  }
  for (const [column, labels] of byColumn) {
    if (labels.length > 1) problems.push(`A coluna "${headers[column]}" foi escolhida para mais de um campo (${labels.join(', ')}).`);
  }
  return problems;
}

export interface MappedRow {
  line: number;
  values: Record<string, RawCell>;
}

/** Picks, from each table row, the cells of the mapped fields. */
export function applyMapping(table: Pick<ParsedTable, 'rows'>, mapping: Mapping): MappedRow[] {
  const entries = Object.entries(mapping).filter((entry): entry is [string, number] => entry[1] !== undefined);
  return table.rows.map((row) => ({
    line: row.line,
    values: Object.fromEntries(entries.map(([field, column]) => [field, row.cells[column] ?? null])),
  }));
}

/** Header name by field, to store with the import (traceability). */
export function describeMapping(mapping: Mapping, headers: string[]) {
  return Object.fromEntries(
    Object.entries(mapping)
      .filter((entry): entry is [string, number] => entry[1] !== undefined)
      .map(([field, column]) => [field, headers[column] ?? `Coluna ${column + 1}`]),
  );
}

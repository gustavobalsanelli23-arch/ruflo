import { detectFormat, type FileFormat } from '@/lib/ingest/formats';
import type { TextEncoding } from '@/lib/ingest/decode';
import { buildTable, readCsv, readXlsx } from '@/lib/ingest/read';
import type { ParsedTable, RawCell } from '@/lib/ingest/types';

/**
 * Reads the chosen file in the browser: format from the content (not the
 * name), SHA-256 of the bytes (the server checks the stored copy against
 * it), then the sheet(s) as tables.
 */

export interface LoadedFile {
  file: File;
  format: FileFormat;
  sha256: string;
  /** XLSX sheets (raw rows) or the single CSV "sheet". */
  sheets: { name: string; rows: RawCell[][] }[];
  delimiter: string | null;
  encoding: TextEncoding | null;
}

export type LoadResult = { ok: true; loaded: LoadedFile } | { ok: false; message: string };

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function loadFile(file: File): Promise<LoadResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const check = detectFormat(bytes, file.name);
  if (!check.ok) return { ok: false, message: check.message };

  const digest = await sha256(bytes);
  if (check.format === 'csv') {
    const csv = readCsv(bytes);
    if (!csv.ok) return csv;
    return { ok: true, loaded: { file, format: 'csv', sha256: digest, sheets: [{ name: file.name, rows: csv.rows }], delimiter: csv.delimiter, encoding: csv.encoding } };
  }
  const workbook = await readXlsx(buffer);
  if (!workbook.ok) return workbook;
  const sheets = workbook.sheets.filter((sheet) => sheet.rows.some((row) => row.some((cell) => cell !== null && cell !== '')));
  if (sheets.length === 0) return { ok: false, message: 'A planilha não tem nenhuma aba com dados.' };
  return { ok: true, loaded: { file, format: 'xlsx', sha256: digest, sheets, delimiter: null, encoding: null } };
}

export function tableOf(loaded: LoadedFile, sheetName: string | null): ({ ok: true } & ParsedTable) | { ok: false; message: string } {
  const sheet = loaded.sheets.find((item) => item.name === sheetName) ?? loaded.sheets[0];
  if (!sheet) return { ok: false, message: 'Nenhuma aba encontrada.' };
  return buildTable(sheet.rows);
}

/**
 * Sends the file straight to Storage with the signed URL (the app server
 * never receives it). XMLHttpRequest, not fetch, for upload progress.
 */
export function uploadFile(url: string, file: File, contentType: string, onProgress: (ratio: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('content-type', contentType);
    request.setRequestHeader('x-upsert', 'false');
    request.setRequestHeader('cache-control', 'max-age=3600');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = () => resolve(false);
    request.send(file);
  });
}

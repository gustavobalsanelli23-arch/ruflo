import { MAX_FILE_BYTES } from './limits';

/**
 * Decides the format from the file's content, not from its name. The
 * extension only has to agree with what the bytes say.
 *
 *   XLSX  ZIP container (PK\x03\x04) with xl/workbook.xml inside
 *   CSV   text: no NUL bytes (except UTF-16 with BOM) and no known binary
 *         signature
 *   XLS   (OLE2, D0 CF 11 E0) refused: the only maintained parser for it is
 *         not published on npm and older versions have known
 *         vulnerabilities. Password-protected XLSX files are OLE2 as well.
 */

export type FileFormat = 'csv' | 'xlsx';

export const CONTENT_TYPE: Record<FileFormat, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export type FormatErrorCode =
  | 'empty_file'
  | 'file_too_large'
  | 'unsupported_extension'
  | 'xls_unsupported'
  | 'extension_mismatch'
  | 'unsupported_content'
  | 'binary_content';

export type FormatCheck = { ok: true; format: FileFormat } | { ok: false; code: FormatErrorCode; message: string };

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const BINARY_SIGNATURES = [
  [0x25, 0x50, 0x44, 0x46], // %PDF
  [0x89, 0x50, 0x4e, 0x47], // PNG
  [0xff, 0xd8, 0xff], // JPEG
  [0x47, 0x49, 0x46, 0x38], // GIF
  [0x1f, 0x8b], // gzip
  [0x52, 0x61, 0x72, 0x21], // RAR
  [0x37, 0x7a, 0xbc, 0xaf], // 7z
  [0x4d, 0x5a], // executável Windows
  [0x7f, 0x45, 0x4c, 0x46], // ELF
];

const EXTENSIONS: Record<string, FileFormat | 'xls'> = { csv: 'csv', txt: 'csv', tsv: 'csv', xlsx: 'xlsx', xls: 'xls' };

const MESSAGES: Record<FormatErrorCode, string> = {
  empty_file: 'O arquivo está vazio.',
  file_too_large: 'O arquivo passa de 25 MB. Divida por período (por exemplo, um arquivo por trimestre).',
  unsupported_extension: 'Formato não aceito. Envie uma planilha .xlsx ou um arquivo .csv.',
  xls_unsupported:
    'Arquivo do Excel antigo (.xls) ou protegido por senha. Abra no Excel, remova a senha se houver e salve como .xlsx ou CSV.',
  extension_mismatch: 'O conteúdo do arquivo não corresponde à extensão do nome. Exporte de novo do sistema de origem.',
  unsupported_content: 'O arquivo não é uma planilha do Excel (.xlsx) nem um texto CSV.',
  binary_content: 'O arquivo não é um texto CSV válido (parece ser um arquivo binário).',
};

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function contains(bytes: Uint8Array, text: string) {
  const needle = Array.from(text, (char) => char.charCodeAt(0));
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

export function extensionOf(fileName: string) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match ? match[1]!.toLowerCase() : '';
}

const fail = (code: FormatErrorCode): FormatCheck => ({ ok: false, code, message: MESSAGES[code] });

export function detectFormat(bytes: Uint8Array, fileName: string): FormatCheck {
  if (bytes.length === 0) return fail('empty_file');
  if (bytes.length > MAX_FILE_BYTES) return fail('file_too_large');

  const declared = EXTENSIONS[extensionOf(fileName)];
  if (!declared) return fail('unsupported_extension');
  if (declared === 'xls' || startsWith(bytes, OLE)) return fail('xls_unsupported');

  if (startsWith(bytes, ZIP)) {
    if (!contains(bytes, 'xl/workbook.xml')) return fail('unsupported_content');
    return declared === 'xlsx' ? { ok: true, format: 'xlsx' } : fail('extension_mismatch');
  }

  if (BINARY_SIGNATURES.some((signature) => startsWith(bytes, signature))) return fail('binary_content');

  const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff);
  if (!utf16 && bytes.subarray(0, 64 * 1024).includes(0)) return fail('binary_content');

  return declared === 'csv' ? { ok: true, format: 'csv' } : fail('extension_mismatch');
}

export function formatErrorMessage(code: FormatErrorCode) {
  return MESSAGES[code];
}

/** Shared shapes of the spreadsheet import pipeline (browser and server). */

export type Dataset = 'sales' | 'products' | 'inventory' | 'suppliers';

/** A cell after reading the file: dates already turned into `YYYY-MM-DD`. */
export type RawCell = string | number | boolean | null;

export type Severity = 'error' | 'warning';

/** One problem in one row, in the shape stored in public.import_errors. */
export interface RowIssue {
  row_number: number | null;
  field: string | null;
  code: string;
  severity: Severity;
  message: string;
  raw_value: string | null;
}

export interface TableRow {
  /** Record number in the file (the header is record 1). */
  line: number;
  cells: RawCell[];
}

export interface ParsedTable {
  headers: string[];
  rows: TableRow[];
}

export type DecimalStyle = 'br' | 'us';
export type DateOrder = 'dmy' | 'mdy' | 'ymd';

/** How values are read. Resolved once for the whole file, then fixed. */
export interface ReadOptions {
  decimal: DecimalStyle;
  dateOrder: DateOrder;
  /** Inventory only: position date when the file has no date column. */
  snapshotDate: string | null;
}

/** Field key → column index in the table. */
export type Mapping = Partial<Record<string, number>>;

/** A row ready for the database, keyed like the SQL record of its dataset. */
export type StagedRow = Record<string, string | number | boolean | null>;

import type { MappedRow } from './mapping';
import { cellText, parseBoolean, parseDate, parseDecimal, parseInteger, parseKind, round } from './normalize';
import type { Dataset, RawCell, ReadOptions, RowIssue, StagedRow } from './types';

/**
 * Turns mapped rows into database rows plus the problems found. The same code
 * runs in the browser (preview) and on the server (authoritative: the server
 * validates every row it receives before sending it to the database).
 *
 *   error    the row is rejected and listed with the reason
 *   warning  the row is imported; the adjustment made is recorded
 *
 * Rule of thumb: values that make up revenue (date, SKU, quantity, price,
 * discount) must be valid. Optional costs and catalog attributes that cannot
 * be read are dropped with a warning instead of rejecting the row.
 */

export interface ValidationContext {
  options: ReadOptions;
  /** Today's date (YYYY-MM-DD) in the organization's time zone. */
  today: string;
}

export interface ValidationResult {
  staged: StagedRow[];
  issues: RowIssue[];
}

const MIN_DATE = '2000-01-01';

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function brl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

class RowCheck {
  readonly issues: RowIssue[] = [];
  failed = false;

  constructor(
    readonly row: MappedRow,
    readonly context: ValidationContext,
  ) {}

  raw(field: string): RawCell {
    return this.row.values[field] ?? null;
  }

  report(field: string | null, code: string, severity: 'error' | 'warning', message: string) {
    if (severity === 'error') this.failed = true;
    const raw = field ? cellText(this.raw(field)) : '';
    this.issues.push({ row_number: this.row.line, field, code, severity, message, raw_value: raw ? raw.slice(0, 200) : null });
  }

  /**
   * Text cell. Identifiers (SKU, order) that are too long reject the row,
   * since cutting them could merge different records; descriptions are cut.
   */
  text(field: string, label: string, max: number, options: { required?: boolean; identifier?: boolean } = {}): string | null {
    const value = cellText(this.raw(field));
    if (!value) {
      if (options.required) this.report(field, 'missing_value', 'error', `${label} vazio.`);
      return null;
    }
    if (value.length <= max) return value;
    if (options.identifier) {
      this.report(field, 'too_long', 'error', `${label} com mais de ${max} caracteres.`);
      return null;
    }
    this.report(field, 'truncated', 'warning', `${label} cortado em ${max} caracteres.`);
    return value.slice(0, max);
  }

  sku() {
    return this.text('sku', 'SKU', 64, { required: true, identifier: true });
  }

  date(field: string, label: string, fallback: string | null = null): string | null {
    const parsed = parseDate(this.raw(field), this.context.options.dateOrder);
    if (!parsed.ok) {
      this.report(field, 'invalid_date', 'error', `${label} inválida. Use DD/MM/AAAA ou AAAA-MM-DD.`);
      return null;
    }
    const value = parsed.value ?? fallback;
    if (!value) {
      this.report(field, 'missing_value', 'error', `${label} vazia.`);
      return null;
    }
    if (value > addDays(this.context.today, 1)) {
      this.report(field, 'future_date', 'error', `${label} no futuro.`);
      return null;
    }
    if (value < MIN_DATE) {
      this.report(field, 'date_out_of_range', 'error', `${label} anterior a 2000.`);
      return null;
    }
    return value;
  }

  /** Strict number: invalid or negative values reject the row. */
  amount(field: string, label: string, decimals: number, options: { required?: boolean; allowNegative?: boolean } = {}): number | null {
    const parsed = parseDecimal(this.raw(field), this.context.options.decimal);
    if (!parsed.ok) {
      this.report(field, 'invalid_number', 'error', `${label} não é um número.`);
      return null;
    }
    if (parsed.value === null) {
      if (options.required) this.report(field, 'missing_value', 'error', `${label} vazio.`);
      return null;
    }
    if (parsed.value < 0 && !options.allowNegative) {
      this.report(field, 'negative_value', 'error', `${label} negativo.`);
      return null;
    }
    if (Math.abs(parsed.value) >= 1e10) {
      this.report(field, 'number_out_of_range', 'error', `${label} fora da faixa aceita.`);
      return null;
    }
    return round(parsed.value, decimals);
  }

  /** Lenient number for optional attributes: unreadable values are dropped. */
  optionalAmount(field: string, label: string, decimals: number): number | null {
    const parsed = parseDecimal(this.raw(field), this.context.options.decimal);
    if (!parsed.ok || (parsed.value !== null && (parsed.value < 0 || parsed.value >= 1e10))) {
      this.report(field, 'ignored_value', 'warning', `${label} ilegível ou negativo: ignorado.`);
      return null;
    }
    return parsed.value === null ? null : round(parsed.value, decimals);
  }

  leadTime(field: string) {
    const parsed = parseInteger(this.raw(field), this.context.options.decimal);
    if (!parsed.ok || (parsed.value !== null && (parsed.value < 0 || parsed.value > 365))) {
      this.report(field, 'ignored_value', 'warning', 'Prazo ilegível ou fora de 0 a 365 dias: ignorado.');
      return null;
    }
    return parsed.value;
  }

  flag(field: string, label: string) {
    const parsed = parseBoolean(this.raw(field));
    if (!parsed.ok) {
      this.report(field, 'ignored_value', 'warning', `${label}: use Sim ou Não. Valor ignorado.`);
      return null;
    }
    return parsed.value;
  }
}

function salesRow(check: RowCheck): StagedRow | null {
  const soldAt = check.date('sold_at', 'Data da venda');
  const sku = check.sku();
  const orderId = check.text('order_id', 'Nº do pedido', 64, { identifier: true });
  const productName = check.text('product_name', 'Nome do produto', 200);
  const channel = check.text('channel', 'Canal', 60);

  const kindCell = parseKind(check.raw('kind'));
  if (!kindCell.ok) check.report('kind', 'invalid_kind', 'error', 'Tipo não reconhecido. Use "venda" ou "devolução".');
  let kind = kindCell.ok ? (kindCell.value ?? 'sale') : 'sale';

  let quantity = check.amount('quantity', 'Quantidade', 3, { required: true, allowNegative: true });
  if (quantity === 0) {
    check.report('quantity', 'zero_quantity', 'error', 'Quantidade zero.');
    quantity = null;
  } else if (quantity !== null && quantity < 0) {
    if (kind === 'sale') check.report('quantity', 'negative_quantity', 'warning', 'Quantidade negativa importada como devolução.');
    kind = 'return';
    quantity = -quantity;
  }

  const discount = check.amount('discount', 'Desconto', 2) ?? 0;
  let unitPrice = check.amount('unit_price', 'Preço unitário', 4);
  const lineTotal = check.amount('line_total', 'Valor total', 2, { allowNegative: true });

  if (quantity !== null) {
    if (unitPrice === null && lineTotal !== null) {
      unitPrice = round((Math.abs(lineTotal) + discount) / quantity, 4);
    } else if (unitPrice !== null && lineTotal !== null) {
      const expected = quantity * unitPrice - discount;
      if (Math.abs(expected - Math.abs(lineTotal)) > 0.01 + expected * 0.0001) {
        check.report(
          'line_total',
          'total_mismatch',
          'warning',
          `Total da linha (${brl(Math.abs(lineTotal))}) diferente de quantidade × preço − desconto (${brl(expected)}). Usamos quantidade × preço.`,
        );
      }
    }
    if (unitPrice === null && !check.failed) {
      check.report('unit_price', 'missing_value', 'error', 'Sem preço unitário nem valor total.');
    }
    if (unitPrice !== null && discount > quantity * unitPrice + 1e-9) {
      check.report('discount', 'discount_exceeds', 'error', 'Desconto maior que o valor da linha.');
    }
    if (unitPrice === 0) check.report('unit_price', 'zero_price', 'warning', 'Preço zero (bonificação?): conta como venda sem receita.');
  }

  const unitCost = check.optionalAmount('unit_cost', 'Custo unitário', 4);
  if (unitCost === 0) check.report('unit_cost', 'zero_cost', 'warning', 'Custo zero: confira se é uma bonificação.');

  if (check.failed) return null;
  return {
    row_number: check.row.line,
    sold_at: soldAt,
    order_id: orderId,
    sku,
    product_name: productName,
    quantity,
    unit_price: unitPrice,
    discount,
    unit_cost: unitCost,
    kind,
    channel,
  };
}

function productsRow(check: RowCheck): StagedRow | null {
  const sku = check.sku();
  const name = check.text('name', 'Nome do produto', 200, { required: true });
  const category = check.text('category', 'Categoria', 120);
  const supplier = check.text('supplier', 'Fornecedor', 160);
  const unit = check.text('unit', 'Unidade', 20);
  const cost = check.optionalAmount('cost', 'Custo', 4);
  const price = check.optionalAmount('price', 'Preço', 4);
  if (cost !== null && price !== null && price < cost) {
    check.report('price', 'price_below_cost', 'warning', 'Preço de venda abaixo do custo.');
  }
  const leadTime = check.leadTime('lead_time_days');
  const perishable = check.flag('perishable', 'Perecível');
  const active = check.flag('active', 'Ativo');

  if (check.failed) return null;
  return { row_number: check.row.line, sku, name, category, supplier, unit, cost, price, lead_time_days: leadTime, perishable, active };
}

function inventoryRow(check: RowCheck): StagedRow | null {
  const sku = check.sku();
  const productName = check.text('product_name', 'Nome do produto', 200);
  const snapshotDate = check.date('snapshot_date', 'Data da posição', check.context.options.snapshotDate);
  const quantity = check.amount('quantity', 'Quantidade', 3, { required: true, allowNegative: true });
  if (quantity !== null && quantity < 0) {
    check.report('quantity', 'negative_stock', 'warning', 'Estoque negativo: vale como zero no capital e na cobertura.');
  }
  const unitCost = check.optionalAmount('unit_cost', 'Custo unitário', 4);

  if (check.failed) return null;
  return { row_number: check.row.line, sku, product_name: productName, snapshot_date: snapshotDate, quantity, unit_cost: unitCost };
}

function suppliersRow(check: RowCheck): StagedRow | null {
  const name = check.text('name', 'Nome do fornecedor', 160, { required: true });
  const code = check.text('code', 'Código', 64, { identifier: true });
  const leadTime = check.leadTime('lead_time_days');

  if (check.failed) return null;
  return { row_number: check.row.line, name, code, lead_time_days: leadTime };
}

const VALIDATORS: Record<Dataset, (check: RowCheck) => StagedRow | null> = {
  sales: salesRow,
  products: productsRow,
  inventory: inventoryRow,
  suppliers: suppliersRow,
};

export function validateRows(dataset: Dataset, rows: MappedRow[], context: ValidationContext): ValidationResult {
  const staged: StagedRow[] = [];
  const issues: RowIssue[] = [];
  for (const row of rows) {
    const check = new RowCheck(row, context);
    const result = VALIDATORS[dataset](check);
    if (result) staged.push(result);
    issues.push(...check.issues);
  }
  return { staged, issues };
}

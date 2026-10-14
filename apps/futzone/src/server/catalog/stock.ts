import 'server-only';
import type { Size } from '@/types/catalog';
import { ALL_SIZES } from '@/types/catalog';
import type { StockIssue } from '@/services/inventory.service';
import type { PoolClient } from 'pg';
import { withTransaction } from '@/server/db/client';
import { ensureDatabase } from '@/server/db/migrate';

/**
 * Baixa de estoque na confirmação do pedido. Tudo numa transação e com UPDATE
 * condicional por tamanho: se duas pessoas compram o último item ao mesmo tempo,
 * o banco serializa as duas linhas e só uma consegue. Adicionar ao carrinho não
 * reserva nada.
 */

export interface CommitLine {
  productId: string;
  size: Size;
  quantity: number;
}

export type CommitResult = { ok: true; repeated: boolean } | { ok: false; issues: StockIssue[] };

export class CommitInputError extends Error {}

const ORDER_ID = /^[A-Za-z0-9_-]{3,64}$/;

/** Valida e junta linhas repetidas (mesmo produto e tamanho). */
export function normalizeLines(orderId: unknown, raw: unknown): { orderId: string; lines: CommitLine[] } {
  if (typeof orderId !== 'string' || !ORDER_ID.test(orderId)) throw new CommitInputError('Pedido inválido.');
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) throw new CommitInputError('Itens inválidos.');
  const merged = new Map<string, CommitLine>();
  for (const item of raw) {
    const r = item as Record<string, unknown>;
    const productId = typeof r?.productId === 'string' ? r.productId : '';
    const size = r?.size as Size;
    const quantity = r?.quantity;
    if (!productId || productId.length > 80 || !ALL_SIZES.includes(size) || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new CommitInputError('Itens inválidos.');
    }
    const key = `${productId}\u0000${size}`;
    const prev = merged.get(key);
    merged.set(key, { productId, size, quantity: (prev?.quantity ?? 0) + quantity });
  }
  // Ordem fixa evita impasse (deadlock) entre pedidos com os mesmos itens.
  const lines = [...merged.values()].sort((a, b) => (a.productId + a.size < b.productId + b.size ? -1 : 1));
  return { orderId, lines };
}

export async function commitOrderStock(orderId: string, lines: CommitLine[]): Promise<CommitResult> {
  await ensureDatabase();
  return withTransaction((db) => commitStockTx(db, orderId, lines)).catch((err) => {
    if (err instanceof StockShortage) return { ok: false, issues: err.issues } as const;
    throw err;
  });
}

/**
 * Núcleo da baixa, dentro de uma transação já aberta. Em falta de estoque lança
 * `StockShortage`: quem chamou desfaz a transação inteira (nenhuma baixa parcial).
 */
export async function commitStockTx(db: PoolClient, orderId: string, lines: CommitLine[]): Promise<{ ok: true; repeated: boolean }> {
  // Mesmo pedido enviado de novo (rede instável, duplo clique): não baixa duas vezes.
  const claimed = await db.query(`INSERT INTO stock_commits (order_id, lines) VALUES ($1, $2) ON CONFLICT (order_id) DO NOTHING`, [orderId, JSON.stringify(lines)]);
  if (!claimed.rowCount) return { ok: true, repeated: true };

  const issues: StockIssue[] = [];
  for (const line of lines) {
    const upd = await db.query(
      `UPDATE product_stock s SET committed = s.committed + $3, updated_at = now()
       FROM products p
       WHERE s.product_id = $1 AND s.size = $2 AND p.id = s.product_id
         AND p.archived = false AND p.review_state = 'none' AND p.data->>'status' = 'published'
         AND s.supplier_available AND s.cap - s.committed >= $3`,
      [line.productId, line.size, line.quantity],
    );
    if (upd.rowCount) continue;
    const cur = await db.query<{ name: string; available: number; sellable: boolean }>(
      `SELECT p.data->>'name' AS name,
              CASE WHEN s.supplier_available THEN GREATEST(s.cap - s.committed, 0) ELSE 0 END AS available,
              (p.archived = false AND p.review_state = 'none' AND p.data->>'status' = 'published') AS sellable
       FROM products p LEFT JOIN product_stock s ON s.product_id = p.id AND s.size = $2 WHERE p.id = $1`,
      [line.productId, line.size],
    );
    const row = cur.rows[0];
    const available = row?.sellable ? Number(row.available ?? 0) : 0;
    issues.push({
      productId: line.productId,
      size: line.size,
      name: row?.name ?? 'Produto',
      requested: line.quantity,
      available,
      kind: available > 0 ? 'insuficiente' : 'indisponivel',
    });
  }
  // Desfaz tudo (inclusive o registro do pedido): nenhuma baixa parcial.
  if (issues.length) throw new StockShortage(issues);
  for (const line of lines) {
    await db.query(`INSERT INTO stock_commit_lines (order_id, product_id, size, quantity) VALUES ($1, $2, $3, $4)`, [orderId, line.productId, line.size, line.quantity]);
  }
  return { ok: true, repeated: false };
}

/**
 * Pedido cancelado: devolve ao estoque o que ele baixou, uma única vez
 * (`released_at`). Uma reposição do fornecedor já zerou a contagem? Não fica negativa.
 */
export async function releaseStockTx(db: PoolClient, orderId: string): Promise<boolean> {
  const r = await db.query(`UPDATE stock_commits SET released_at = now() WHERE order_id = $1 AND released_at IS NULL`, [orderId]);
  if (!r.rowCount) return false;
  await db.query(
    `UPDATE product_stock s SET committed = GREATEST(s.committed - l.quantity, 0), updated_at = now()
     FROM stock_commit_lines l WHERE l.order_id = $1 AND s.product_id = l.product_id AND s.size = l.size`,
    [orderId],
  );
  return true;
}

export class StockShortage extends Error {
  constructor(readonly issues: StockIssue[]) {
    super('Estoque insuficiente.');
  }
}

import 'server-only';
import { teams as storeTeams } from '@/data/teams';
import type { IntegrationSettings } from '@/types/supplier';
import type { PriceRules } from '@/lib/pricing';
import { getPool, withTransaction } from '@/server/db/client';
import { ensureDatabase } from '@/server/db/migrate';
import { getIntegrationSettings, loadProducts, sanitizeSettings, toCurrentRecord, writeKv } from '@/server/catalog/store';
import { diffPrices } from './diff';
import { recordChanges, storeSupplierPhotos } from './sync.service';

/**
 * Decisões do administrador sobre o que a sincronização encontrou: aprovar ou
 * rejeitar produtos novos, mudanças de preço e troca de fotos. Rejeitar nunca
 * apaga nada: o produto fica fora da loja, o preço atual vira manual, as fotos
 * atuais ficam marcadas como escolha manual.
 */

export class DecisionError extends Error {}

interface ChangeRow {
  id: string;
  product_id: string;
  kind: string;
  after: unknown;
  state: string;
}

async function pendingChange(id: number): Promise<ChangeRow> {
  await ensureDatabase();
  const r = await getPool().query<ChangeRow>('SELECT id, product_id, kind, after, state FROM sync_changes WHERE id = $1', [id]);
  const row = r.rows[0];
  if (!row) throw new DecisionError('Alteração não encontrada.');
  if (row.state !== 'pending') throw new DecisionError('Esta alteração já foi decidida.');
  return row;
}

/** Aprova um produto novo: baixa as fotos, aplica o preço (se editado) e publica. */
export async function approveProduct(productId: string, opts: { price?: number } = {}): Promise<{ warnings: string[] }> {
  await ensureDatabase();
  const r = await getPool().query<{ supplier_photos: string[]; review_state: string; data: { images: unknown[] } }>(
    'SELECT supplier_photos, review_state, data FROM products WHERE id = $1',
    [productId],
  );
  const row = r.rows[0];
  if (!row) throw new DecisionError('Produto não encontrado.');
  if (row.review_state !== 'pending') throw new DecisionError('Este produto não está aguardando aprovação.');
  if (opts.price !== undefined && (!Number.isInteger(opts.price) || opts.price <= 0 || opts.price > 10_000_000)) throw new DecisionError('Preço inválido.');

  // Fotos primeiro, fora da transação (rede). Sem foto o produto ainda pode ser publicado.
  const needsPhotos = !row.data.images.length && row.supplier_photos.length > 0;
  const warnings = needsPhotos ? await storeSupplierPhotos(productId, row.supplier_photos) : [];
  if (needsPhotos) {
    const stored = await getPool().query('SELECT 1 FROM product_images WHERE product_id = $1 LIMIT 1', [productId]);
    // Sem nenhuma foto copiada, o produto continua aguardando (tente de novo mais tarde).
    if (!stored.rowCount) throw new DecisionError(`As fotos do fornecedor não puderam ser copiadas (${warnings[0] ?? 'erro desconhecido'}). Tente novamente.`);
  }

  await withTransaction(async (db) => {
    const cur = await db.query('SELECT review_state FROM products WHERE id = $1 FOR UPDATE', [productId]);
    if (cur.rows[0]?.review_state !== 'pending') throw new DecisionError('Este produto não está aguardando aprovação.');
    if (opts.price !== undefined) {
      await db.query(
        `UPDATE products SET data = jsonb_set(data, '{price}', to_jsonb($2::int)), price_source = 'manual' WHERE id = $1`,
        [productId, opts.price],
      );
    }
    await db.query(
      `UPDATE products SET data = jsonb_set(data, '{status}', '"published"'), review_state = 'none', review_reason = NULL, updated_at = now() WHERE id = $1`,
      [productId],
    );
    await db.query(`UPDATE sync_changes SET state = 'approved', decided_at = now() WHERE product_id = $1 AND kind = 'novo' AND state = 'pending'`, [productId]);
  });
  return { warnings };
}

export async function rejectProduct(productId: string): Promise<void> {
  await ensureDatabase();
  await withTransaction(async (db) => {
    const cur = await db.query('SELECT review_state FROM products WHERE id = $1 FOR UPDATE', [productId]);
    if (cur.rows[0]?.review_state !== 'pending') throw new DecisionError('Este produto não está aguardando aprovação.');
    // Fica guardado como rejeitado: a sincronização não volta a propô-lo.
    await db.query(`UPDATE products SET review_state = 'rejected', updated_at = now() WHERE id = $1`, [productId]);
    await db.query(`UPDATE sync_changes SET state = 'rejected', decided_at = now() WHERE product_id = $1 AND kind = 'novo' AND state = 'pending'`, [productId]);
  });
}

/** Aprova uma mudança pendente de preço ou de fotos. */
export async function approveChange(changeId: number): Promise<{ warnings: string[] }> {
  const change = await pendingChange(changeId);
  if (change.kind === 'novo') return approveProduct(change.product_id);
  let warnings: string[] = [];
  if (change.kind === 'fotos') {
    warnings = await storeSupplierPhotos(change.product_id, change.after as string[]);
    if (warnings.length && warnings.length >= (change.after as string[]).length) throw new DecisionError(`As fotos não puderam ser baixadas: ${warnings[0]}`);
  }
  await withTransaction(async (db) => {
    const locked = await db.query('SELECT state FROM sync_changes WHERE id = $1 FOR UPDATE', [changeId]);
    if (locked.rows[0]?.state !== 'pending') throw new DecisionError('Esta alteração já foi decidida.');
    if (change.kind === 'preco') {
      await db.query(`UPDATE products SET data = jsonb_set(data, '{price}', to_jsonb($2::int)), updated_at = now() WHERE id = $1 AND price_source = 'rule'`, [
        change.product_id,
        change.after as number,
      ]);
    } else if (change.kind === 'fotos') {
      await db.query(`UPDATE products SET supplier_photos = $2, updated_at = now() WHERE id = $1`, [change.product_id, change.after as string[]]);
    }
    await db.query(`UPDATE sync_changes SET state = 'approved', decided_at = now() WHERE id = $1`, [changeId]);
  });
  return { warnings };
}

export async function rejectChange(changeId: number): Promise<void> {
  const change = await pendingChange(changeId);
  if (change.kind === 'novo') return rejectProduct(change.product_id);
  await withTransaction(async (db) => {
    const locked = await db.query('SELECT state FROM sync_changes WHERE id = $1 FOR UPDATE', [changeId]);
    if (locked.rows[0]?.state !== 'pending') throw new DecisionError('Esta alteração já foi decidida.');
    if (change.kind === 'preco') {
      // Mantém o preço atual como escolha manual: a tabela não volta a propor mudança.
      await db.query(`UPDATE products SET price_source = 'manual', updated_at = now() WHERE id = $1`, [change.product_id]);
    } else if (change.kind === 'fotos') {
      await db.query(
        `UPDATE products SET manual_fields = array(SELECT DISTINCT unnest(manual_fields || ARRAY['images'])), supplier_photos = $2, updated_at = now() WHERE id = $1`,
        [change.product_id, change.after as string[]],
      );
    }
    await db.query(`UPDATE sync_changes SET state = 'rejected', decided_at = now() WHERE id = $1`, [changeId]);
  });
}

export async function saveIntegrationSettings(input: unknown): Promise<IntegrationSettings> {
  await ensureDatabase();
  const settings = sanitizeSettings(input);
  await withTransaction((db) => writeKv(db, 'integration_settings', settings));
  return settings;
}

/** Salva a tabela de preços e já propõe (ou aplica) os novos preços dos produtos. */
export async function savePriceRules(rules: PriceRules): Promise<{ changes: number; pending: boolean }> {
  await ensureDatabase();
  return withTransaction(async (db) => {
    await writeKv(db, 'price_rules', rules);
    const settings = await getIntegrationSettings(db);
    const current = (await loadProducts(db)).map(toCurrentRecord).filter((r) => r.reviewState !== 'rejected');
    const changes = diffPrices(current, storeTeams, rules, settings);
    if (!settings.approvePriceChanges) {
      for (const c of changes) {
        await db.query(`UPDATE products SET data = jsonb_set(data, '{price}', to_jsonb($2::int)), updated_at = now() WHERE id = $1`, [c.productId, c.after as number]);
      }
    }
    await recordChanges(db, changes, null);
    return { changes: changes.length, pending: settings.approvePriceChanges };
  });
}

export async function mapSupplierTeam(supplierTeamId: string, teamId: string | null): Promise<void> {
  await ensureDatabase();
  if (teamId !== null && !storeTeams.some((t) => t.id === teamId)) throw new DecisionError('Time da loja inválido.');
  await withTransaction(async (db) => {
    const r = await db.query(`UPDATE supplier_teams SET team_id = $2, updated_at = now() WHERE supplier_team_id = $1`, [supplierTeamId, teamId]);
    if (!r.rowCount) throw new DecisionError('Time do fornecedor não encontrado.');
  });
}

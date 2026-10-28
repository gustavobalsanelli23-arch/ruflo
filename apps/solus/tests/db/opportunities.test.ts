import { afterAll, describe, expect, inject, it } from 'vitest';
import { numbered, runImport } from './support/imports';
import { asUser, closePool, type Session } from './support/session';

/**
 * Lifecycle of opportunities across engine runs: no duplicates, the user's
 * status is respected, resolved ones reopen, and every change is recorded.
 */

const { users, orgs } = inject('world');
afterAll(closePool);

const SYNC = `select * from public.sync_opportunities($1, $2, 'manual', null, 'test-1', '2026-03-01', '2026-03-31', '[]', $3)`;

function item(productId: string, label: string, impact = 100) {
  return {
    type: 'low_margin',
    dedupe_key: `low_margin:product:${productId}`,
    entity_type: 'product',
    entity_id: productId,
    entity_label: label,
    title: `Margem baixa em ${label}`,
    summary: 'Margem abaixo do mínimo.',
    priority: 'medium',
    confidence: 0.7,
    impact_value: impact,
    impact_kind: 'monthly_profit',
    impact_method: 'Diferença até a margem mínima.',
    facts: [{ label: 'Margem bruta', value: 0.1, format: 'percent' }],
    hypotheses: ['Preço defasado em relação ao custo.'],
    recommendations: ['Revisar o preço.'],
    period_start: '2026-03-01',
    period_end: '2026-03-31',
  };
}

async function setup(s: Session) {
  await runImport(s, {
    organizationId: orgs.a,
    dataset: 'products',
    rows: numbered([
      { sku: 'P1', name: 'Produto 1' },
      { sku: 'P2', name: 'Produto 2' },
      { sku: 'P3', name: 'Produto 3' },
    ]),
    policy: 'update',
  });
  const rows = await s.query<{ id: string; sku: string }>('select id, sku from public.products where organization_id = $1', [orgs.a]);
  return Object.fromEntries(rows.map((r) => [r.sku, r.id])) as Record<'P1' | 'P2' | 'P3', string>;
}

async function run(s: Session, items: object[]) {
  await s.become('service_role');
  const [result] = await s.query<Record<string, number | string>>(SYNC, [orgs.a, users.analystA, JSON.stringify(items)]);
  await s.become(users.analystA);
  return result!;
}

const state = (s: Session) =>
  s.query<{ entity_label: string; status: string; active: boolean; detected_count: number }>(
    'select entity_label, status, active, detected_count from public.opportunities where organization_id = $1 order by entity_label',
    [orgs.a],
  );

describe('ciclo de vida entre execuções do motor', () => {
  it('sem duplicatas; status do usuário respeitado; resolvidas reabrem; descartadas continuam descartadas', async () => {
    await asUser(users.analystA, async (s) => {
      const p = await setup(s);

      expect(await run(s, [item(p.P1, 'Produto 1'), item(p.P2, 'Produto 2')])).toMatchObject({ detected: 2, created: 2, updated: 0 });
      const [first] = await s.query<{ id: string }>(`select id from public.opportunities where entity_id = $1`, [p.P1]);
      await s.query(`select public.set_opportunity_status($1, 'in_progress', null)`, [first!.id]);

      // P1 (em andamento) e P2 (nova) somem; P3 aparece
      expect(await run(s, [item(p.P3, 'Produto 3')])).toMatchObject({ created: 1, resolved: 1 });
      expect(await state(s)).toEqual([
        { entity_label: 'Produto 1', status: 'in_progress', active: false, detected_count: 1 },
        { entity_label: 'Produto 2', status: 'resolved', active: false, detected_count: 1 },
        { entity_label: 'Produto 3', status: 'new', active: true, detected_count: 1 },
      ]);

      // P2 volta: reaberta. P3 descartada pelo usuário e detectada de novo: continua descartada
      const [third] = await s.query<{ id: string }>(`select id from public.opportunities where entity_id = $1`, [p.P3]);
      await s.query(`select public.set_opportunity_status($1, 'dismissed', 'Produto sazonal')`, [third!.id]);
      expect(await run(s, [item(p.P2, 'Produto 2'), item(p.P3, 'Produto 3', 250)])).toMatchObject({ created: 0, updated: 1, reopened: 1 });
      expect(await state(s)).toEqual([
        { entity_label: 'Produto 1', status: 'in_progress', active: false, detected_count: 1 },
        { entity_label: 'Produto 2', status: 'new', active: true, detected_count: 2 },
        { entity_label: 'Produto 3', status: 'dismissed', active: true, detected_count: 2 },
      ]);
      const [dismissed] = await s.query<{ impact_value: string }>('select impact_value from public.opportunities where id = $1', [third!.id]);
      expect(dismissed!.impact_value).toBe('250.00');

      const total = await s.query('select count(*)::int as n from public.opportunities where organization_id = $1', [orgs.a]);
      expect(total).toEqual([{ n: 3 }]);

      const history = await s.query<{ event: string; from_status: string | null; to_status: string | null }>(
        `select e.event, e.from_status, e.to_status from public.opportunity_events e where e.opportunity_id = (select id from public.opportunities where entity_id = $1) order by e.id`,
        [p.P2],
      );
      expect(history).toEqual([
        { event: 'detected', from_status: null, to_status: 'new' },
        { event: 'auto_resolved', from_status: 'new', to_status: 'resolved' },
        { event: 'redetected', from_status: 'resolved', to_status: 'new' },
      ]);

      const runs = await s.query('select created_count, updated_count, reopened_count, resolved_count from public.analysis_runs order by created_at, id');
      expect(runs).toHaveLength(3);
    });
  });

  it('uma execução sem nada detectado resolve as novas e não inventa nada', async () => {
    await asUser(users.analystA, async (s) => {
      const p = await setup(s);
      await run(s, [item(p.P1, 'Produto 1')]);
      expect(await run(s, [])).toMatchObject({ detected: 0, created: 0, resolved: 1 });
      expect(await state(s)).toEqual([{ entity_label: 'Produto 1', status: 'resolved', active: false, detected_count: 1 }]);
    });
  });

  it('duas oportunidades com a mesma chave na mesma execução são recusadas', async () => {
    await asUser(users.analystA, async (s) => {
      const p = await setup(s);
      await s.become('service_role');
      const outcome = await s.attempt(SYNC, [orgs.a, users.analystA, JSON.stringify([item(p.P1, 'A'), item(p.P1, 'A')])]);
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.error.message).toBe('solus:invalid_opportunities');
    });
  });
});

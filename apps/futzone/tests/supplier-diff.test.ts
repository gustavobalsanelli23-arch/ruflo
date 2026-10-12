import { describe, expect, it } from 'vitest';
import type { Size } from '@/types/catalog';
import type { IntegrationSettings, SupplierModel } from '@/types/supplier';
import { DEFAULT_INTEGRATION_SETTINGS } from '@/types/supplier';
import { DEFAULT_PRICE_RULES } from '@/lib/pricing';
import { teams } from '@/data/teams';
import { buildProduct } from '@/data/products';
import { checkCoverage, diffCatalog, type CurrentRecord, type DiffInput } from '@/server/supplier/diff';
import { parseModel } from '@/server/supplier/catalogopro.client';
import { categoryOf, seasonOf } from '@/server/supplier/mapping';

/**
 * Cenários da sincronização com o fornecedor, sem banco nem rede: a função pura
 * diz o que mudar e o teste confere cada regra.
 */

const FLA = 'team-fla';
const teamMap = new Map<string, string | null>([[FLA, 'flamengo']]);

function model(id: string, sizes: string[], extra: Partial<SupplierModel> = {}): SupplierModel {
  return {
    id,
    name: `Camisa Flamengo Teste ${id} 26/27`,
    supplierTeamId: FLA,
    category: 'Camisas',
    kids: false,
    sizes,
    photos: [`https://base44.app/f/${id}-1.jpg`, `https://base44.app/f/${id}-2.jpg`],
    archived: false,
    createdAt: '2026-10-01T10:00:00',
    updatedAt: '2026-10-01T10:00:00',
    ...extra,
  };
}

function record(id: string, available: Size[], extra: Partial<CurrentRecord> = {}): CurrentRecord {
  const m = model(id, available);
  const product = buildProduct(
    { sourceId: id, name: m.name, slug: `camisa-${id}`, teamId: 'flamengo', category: 'clubes', kids: false, season: '26/27', availableSizes: available, photos: 2, tags: [], order: 0, createdAt: '2026-10-01' },
    { tags: [], salesCount: 0 },
  );
  const stock: CurrentRecord['stock'] = {};
  for (const s of product.sizes) stock[s] = { supplierAvailable: available.includes(s), cap: 12, committed: 0, manualCap: false };
  return { id: product.id, supplierId: id, product, priceSource: 'rule', manualFields: [], supplierActive: true, supplierPhotos: m.photos, reviewState: 'none', stock, ...extra };
}

function run(current: CurrentRecord[], models: SupplierModel[], settings: Partial<IntegrationSettings> = {}, pending = new Map<string, unknown>()) {
  const input: DiffInput = { current, models, teamMap, teams, rules: DEFAULT_PRICE_RULES, settings: { ...DEFAULT_INTEGRATION_SETTINGS, ...settings }, pending };
  return diffCatalog(input);
}

describe('sincronização com o fornecedor', () => {
  it('1. produto novo entra aguardando aprovação, com preço da tabela e tamanhos do fornecedor', () => {
    const r = run([record('a1', ['M', 'G'])], [model('a1', ['M', 'G']), model('n1', ['P', 'GG'])]);
    expect(r.inserts).toHaveLength(1);
    const { record: rec } = r.inserts[0];
    expect(rec.id).toBe('fz-n1');
    expect(rec.reviewState).toBe('pending');
    expect(rec.product.status).toBe('draft');
    expect(rec.product.price).toBe(DEFAULT_PRICE_RULES.nacional);
    expect(rec.stock.P?.supplierAvailable).toBe(true);
    expect(rec.stock.M?.supplierAvailable).toBe(false);
    expect(rec.product.images).toEqual([]); // fotos só são copiadas na aprovação
    expect(r.counts.created).toBe(1);
    expect(r.changes.find((c) => c.kind === 'novo')?.state).toBe('pending');
  });

  it('1b. sem aprovação obrigatória, o produto novo já entra publicado', () => {
    const r = run([], [model('n1', ['M'])], { approveNew: false });
    expect(r.inserts[0].record.product.status).toBe('published');
    expect(r.inserts[0].record.reviewState).toBe('none');
  });

  it('2. mudança de preço pela tabela: pendente com aprovação, aplicada sem; preço manual nunca muda', () => {
    const cheap = { ...record('a1', ['M']), product: { ...record('a1', ['M']).product, price: 29990 } };
    const pendingRun = run([cheap], [model('a1', ['M'])]);
    const price = pendingRun.changes.find((c) => c.kind === 'preco');
    expect(price).toMatchObject({ state: 'pending', before: 29990, after: DEFAULT_PRICE_RULES.nacional });
    expect(pendingRun.updates.find((u) => u.product?.price === DEFAULT_PRICE_RULES.nacional)).toBeUndefined();

    const applied = run([cheap], [model('a1', ['M'])], { approvePriceChanges: false });
    expect(applied.updates.find((u) => u.id === cheap.id)?.product?.price).toBe(DEFAULT_PRICE_RULES.nacional);

    const manual = run([{ ...cheap, priceSource: 'manual' }], [model('a1', ['M'])], { approvePriceChanges: false });
    expect(manual.changes.some((c) => c.kind === 'preco')).toBe(false);
  });

  it('3. produto esgotado ou retirado do fornecedor fica indisponível, sem ser apagado', () => {
    const r = run([record('a1', ['M', 'G']), record('a2', ['P'])], [model('a1', []), model('a2', ['P'], { archived: true })]);
    expect(r.counts.unavailable).toBe(2);
    expect(r.stock.filter((w) => w.mode === 'unavailable').map((w) => `${w.productId}:${w.size}`).sort()).toEqual(['fz-a1:G', 'fz-a1:M', 'fz-a2:P']);
    expect(r.updates.find((u) => u.id === 'fz-a2')?.supplierActive).toBe(false);
    expect(r.inserts).toHaveLength(0);
  });

  it('3b. produto que some da lista do fornecedor também fica indisponível', () => {
    const r = run([record('a1', ['M']), record('a2', ['G'])], [model('a1', ['M'])]);
    expect(r.counts.unavailable).toBe(1);
    expect(r.stock).toEqual([expect.objectContaining({ productId: 'fz-a2', size: 'G', mode: 'unavailable' })]);
  });

  it('4. só o tamanho que acabou fica indisponível', () => {
    const r = run([record('a1', ['P', 'M', 'G'])], [model('a1', ['P', 'G'])]);
    expect(r.stock).toEqual([expect.objectContaining({ productId: 'fz-a1', size: 'M', mode: 'unavailable' })]);
    expect(r.counts.unavailable).toBe(0);
    expect(r.changes[0]).toMatchObject({ kind: 'tamanhos', summary: 'Esgotou: M' });
  });

  it('5. reposição: o produto volta e o limite de venda renova (vendido volta a zero)', () => {
    const rec = record('a1', []);
    rec.stock.M = { supplierAvailable: false, cap: 12, committed: 12, manualCap: false };
    const r = run([rec], [model('a1', ['M'])]);
    expect(r.counts.restocked).toBe(1);
    expect(r.stock).toEqual([{ productId: 'fz-a1', size: 'M', mode: 'restock', state: { supplierAvailable: true, cap: 12, committed: 0, manualCap: false } }]);
    expect(r.changes[0].kind).toBe('reposicao');
  });

  it('5b. reposição respeita um limite definido à mão', () => {
    const rec = record('a1', []);
    rec.stock.G = { supplierAvailable: false, cap: 3, committed: 3, manualCap: true };
    const r = run([rec], [model('a1', ['G'])]);
    expect(r.stock[0].state).toMatchObject({ cap: 3, committed: 0, manualCap: true });
  });

  it('7. sincronização repetida não duplica nem muda nada', () => {
    const models = [model('a1', ['M', 'G']), model('n1', ['P'])];
    const first = run([record('a1', ['M', 'G'])], models);
    const afterFirst = [record('a1', ['M', 'G']), first.inserts[0].record];
    const pending = new Map(first.changes.filter((c) => c.state === 'pending').map((c) => [`${c.productId}:${c.kind}`, c.after]));
    const second = run(afterFirst, models, {}, pending);
    expect(second.inserts).toHaveLength(0);
    expect(second.changes).toHaveLength(0);
    expect(second.stock).toHaveLength(0);
    expect(second.updates).toHaveLength(0);
    // O mesmo id do fornecedor repetido na resposta também não duplica.
    expect(run([], [model('n2', ['M']), model('n2', ['M'])]).inserts).toHaveLength(1);
  });

  it('campos editados à mão não são sobrescritos (nome)', () => {
    const rec = { ...record('a1', ['M']), manualFields: ['name'] };
    const r = run([rec], [model('a1', ['M'], { name: 'Outro nome' })]);
    expect(r.changes.some((c) => c.kind === 'nome')).toBe(false);
    const free = run([record('a1', ['M'])], [model('a1', ['M'], { name: 'Outro nome 26/27' })]);
    expect(free.updates[0].product?.name).toBe('Outro nome 26/27');
  });

  it('fotos trocadas no fornecedor viram pendência; produto com time desconhecido vai para revisão', () => {
    const r = run([record('a1', ['M'])], [model('a1', ['M'], { photos: ['https://base44.app/f/novo.jpg'] }), model('x1', ['M'], { supplierTeamId: 'team-desconhecido' })]);
    expect(r.changes.find((c) => c.kind === 'fotos')?.state).toBe('pending');
    expect(r.inserts).toHaveLength(0);
    expect(r.unmappedTeams.get('team-desconhecido')).toBe(1);
  });

  it('6. resposta truncada do fornecedor é recusada antes de qualquer mudança', () => {
    const current = ['a1', 'a2', 'a3', 'a4'].map((id) => record(id, ['M']));
    expect(checkCoverage(current, [model('a1', ['M'])])).toMatch(/incompleta/);
    expect(checkCoverage(current, current.map((c) => model(c.supplierId!, ['M'])))).toBeNull();
  });
});

describe('leitura do formato do fornecedor', () => {
  it('normaliza um modelo e descarta dados internos', () => {
    const m = parseModel({ id: '6abd2327b0e38c97bd843e20', name: ' Camisa X ', team_id: 't', sizes: ['P'], photos: ['https://base44.app/a.jpg', 'javascript:alert(1)'], is_archived: false, created_by: 'alguem@exemplo.com', shopify_product_id: 'gid://x' });
    expect(m).toEqual(expect.objectContaining({ id: '6abd2327b0e38c97bd843e20', name: 'Camisa X', photos: ['https://base44.app/a.jpg'] }));
    expect(JSON.stringify(m)).not.toMatch(/created_by|shopify|exemplo/);
    expect(parseModel({ id: 'x', name: '' })).toBeNull();
    expect(parseModel({ id: '6abd2327b0e38c97bd843e20', name: 'Sem grade' })).toBeNull();
  });

  it('classifica como o catálogo importado', () => {
    const fla = teams.find((t) => t.id === 'flamengo')!;
    const bra = teams.find((t) => t.id === 'brasil')!;
    expect(categoryOf({ name: 'Kit Infantil Flamengo I 26/27', kids: true }, fla)).toBe('kits');
    expect(categoryOf({ name: 'Camisa Retrô Flamengo 1995', kids: false }, fla)).toBe('retro');
    expect(categoryOf({ name: 'Camisa Feminina Flamengo I 26/27', kids: false }, fla)).toBe('femininas');
    expect(categoryOf({ name: 'Camisa Brasil I 2026', kids: false }, bra)).toBe('selecoes');
    expect(seasonOf('Camisa Retro Arsenal Vinho 2005/06')).toBe('2005/06');
    expect(seasonOf('Camisa Retro Japão Azul 1998')).toBe('1998');
  });
});

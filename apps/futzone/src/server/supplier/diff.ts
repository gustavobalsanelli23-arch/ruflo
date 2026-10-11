import type { Product, Size, Team } from '@/types/catalog';
import { ALL_SIZES } from '@/types/catalog';
import type { ChangeKind, IntegrationSettings, SupplierModel } from '@/types/supplier';
import { rulePrice, type PriceRules } from '@/lib/pricing';
import { buildProduct } from '@/data/products';
import { entryFor, knownSizes, slugify, uniqueSlug } from './mapping';

/**
 * Motor da sincronização: compara o catálogo da loja com o do fornecedor e diz o
 * que mudar. Função pura (sem banco nem rede), por isso testável cenário a cenário.
 *
 * Regras:
 * - cada produto é reconhecido pelo id estável do fornecedor, nunca pelo nome;
 * - nada é apagado: produto que some ou é arquivado fica indisponível;
 * - campos editados à mão (`manualFields`) e preço manual não são sobrescritos;
 * - tamanho que volta a ficar disponível é reposição: o limite de venda renova.
 */

export interface StockState {
  supplierAvailable: boolean;
  cap: number;
  committed: number;
  manualCap: boolean;
}

export interface CurrentRecord {
  id: string;
  supplierId: string | null;
  product: Product;
  priceSource: 'rule' | 'manual';
  manualFields: string[];
  supplierActive: boolean;
  supplierPhotos: string[];
  reviewState: 'none' | 'pending' | 'rejected';
  stock: Partial<Record<Size, StockState>>;
}

export interface PlannedChange {
  productId: string;
  kind: ChangeKind;
  summary: string;
  before: unknown;
  after: unknown;
  state: 'applied' | 'pending';
}

export interface ProductInsert {
  record: CurrentRecord;
  reviewReason: string | null;
}

export interface ProductUpdate {
  id: string;
  product?: Product;
  supplierActive?: boolean;
  supplierPhotos?: string[];
}

/**
 * Escrita de estoque. `unavailable` só desliga a disponibilidade (não mexe no que
 * já foi vendido); `restock` renova o limite; `insert` cria o tamanho.
 */
export interface StockWrite {
  productId: string;
  size: Size;
  mode: 'insert' | 'restock' | 'unavailable';
  state: StockState;
}

export interface DiffInput {
  current: CurrentRecord[];
  models: SupplierModel[];
  teamMap: Map<string, string | null>;
  teams: Team[];
  rules: PriceRules;
  settings: IntegrationSettings;
  /** Mudanças pendentes já registradas: chave `produto:tipo` → valor proposto. */
  pending: Map<string, unknown>;
}

export interface DiffCounts {
  found: number;
  created: number;
  updated: number;
  unavailable: number;
  restocked: number;
  pending: number;
}

export interface DiffResult {
  inserts: ProductInsert[];
  updates: ProductUpdate[];
  stock: StockWrite[];
  changes: PlannedChange[];
  counts: DiffCounts;
  /** Modelos ativos sem time correspondente na loja (aparecem para revisão manual). */
  unmappedTeams: Map<string, number>;
  warnings: string[];
}

/** Abaixo disso a resposta do fornecedor é tratada como incompleta e nada é aplicado. */
export const MIN_LINKED_COVERAGE = 0.5;

const PHOTOS_PER_PRODUCT = 3;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function priceSubject(p: Product, teams: Team[]) {
  return {
    name: p.name,
    category: p.category,
    kids: p.gender === 'infantil',
    teamCountry: teams.find((t) => t.id === p.teamId)?.country ?? '',
  };
}

function sizesLabel(sizes: string[]): string {
  return sizes.join(', ');
}

/** Valida a cobertura da resposta: protege o catálogo de uma resposta truncada. */
export function checkCoverage(current: CurrentRecord[], models: SupplierModel[]): string | null {
  const linked = current.filter((r) => r.supplierId);
  if (!linked.length) return null;
  const ids = new Set(models.map((m) => m.id));
  const seen = linked.filter((r) => ids.has(r.supplierId!)).length;
  if (seen / linked.length < MIN_LINKED_COVERAGE) {
    return `Resposta do fornecedor incompleta: só ${seen} de ${linked.length} produtos vinculados vieram na lista. Nada foi alterado.`;
  }
  return null;
}

export function diffCatalog(input: DiffInput): DiffResult {
  const { current, teams, rules, settings, pending } = input;
  const result: DiffResult = {
    inserts: [],
    updates: [],
    stock: [],
    changes: [],
    counts: { found: 0, created: 0, updated: 0, unavailable: 0, restocked: 0, pending: 0 },
    unmappedTeams: new Map(),
    warnings: [],
  };

  // Um id do fornecedor aparece uma vez só (vale a versão mais recente).
  const models = new Map<string, SupplierModel>();
  for (const m of input.models) {
    const prev = models.get(m.id);
    if (!prev || prev.updatedAt < m.updatedAt) models.set(m.id, m);
  }
  result.counts.found = [...models.values()].filter((m) => !m.archived).length;

  const bySupplier = new Map(current.filter((r) => r.supplierId).map((r) => [r.supplierId!, r]));
  const takenSlugs = new Set(current.map((r) => r.product.slug));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const updatedIds = new Set<string>();

  const change = (c: PlannedChange) => {
    if (c.state === 'pending') {
      const key = `${c.productId}:${c.kind}`;
      if (pending.has(key) && same(pending.get(key), c.after)) return; // já está aguardando aprovação
      result.counts.pending++;
    }
    result.changes.push(c);
  };

  // 1. Modelos do fornecedor
  for (const model of models.values()) {
    const { known, unknown } = knownSizes(model.archived ? [] : model.sizes, ALL_SIZES);
    if (unknown.length) result.warnings.push(`${model.name}: tamanhos não reconhecidos (${unknown.join(', ')}) foram ignorados.`);
    const rec = bySupplier.get(model.id);

    if (!rec) {
      if (model.archived) continue; // arquivado e nunca importado: nada a fazer
      const teamId = input.teamMap.get(model.supplierTeamId) ?? null;
      const team = teamId ? teamById.get(teamId) : undefined;
      if (!team) {
        result.unmappedTeams.set(model.supplierTeamId, (result.unmappedTeams.get(model.supplierTeamId) ?? 0) + 1);
        continue;
      }
      const slug = uniqueSlug(slugify(model.name), takenSlugs);
      const entry = entryFor(model, team, slug, known, 0);
      const product = buildProduct(entry, { tags: ['lancamento'], salesCount: 0, images: [], cap: settings.defaultCap });
      product.price = rulePrice(priceSubject(product, teams), rules);
      const review = settings.approveNew;
      product.status = review ? 'draft' : 'published';
      const reasons: string[] = [];
      if (!model.photos.length) reasons.push('Sem fotos no fornecedor');
      if (unknown.length) reasons.push(`Tamanhos não reconhecidos: ${unknown.join(', ')}`);
      const stock: CurrentRecord['stock'] = {};
      for (const s of product.sizes) {
        stock[s] = { supplierAvailable: known.includes(s), cap: settings.defaultCap, committed: 0, manualCap: false };
      }
      const record: CurrentRecord = {
        id: product.id,
        supplierId: model.id,
        product,
        priceSource: 'rule',
        manualFields: [],
        supplierActive: true,
        supplierPhotos: model.photos.slice(0, PHOTOS_PER_PRODUCT),
        reviewState: review ? 'pending' : 'none',
        stock,
      };
      result.inserts.push({ record, reviewReason: reasons.length ? reasons.join(' · ') : null });
      result.counts.created++;
      change({
        productId: product.id,
        kind: 'novo',
        summary: review ? `Novo no fornecedor, aguardando aprovação (${known.length ? sizesLabel(known) : 'sem tamanhos'})` : 'Novo no fornecedor, publicado',
        before: null,
        after: { name: product.name, price: product.price, sizes: known },
        state: review ? 'pending' : 'applied',
      });
      continue;
    }

    // Produto já existente
    let touched = false;
    let product = rec.product;
    const available = new Set<string>(known);
    const wasSellable = Object.values(rec.stock).some((s) => s?.supplierAvailable);
    const nowSellable = available.size > 0;
    const went: string[] = [];
    const came: string[] = [];

    const sizes = ALL_SIZES.filter((s) => product.sizes.includes(s) || available.has(s));
    if (!same(sizes, product.sizes)) product = { ...product, sizes };

    for (const size of sizes) {
      const prev = rec.stock[size];
      const now = available.has(size);
      if (!prev) {
        result.stock.push({ productId: rec.id, size, mode: 'insert', state: { supplierAvailable: now, cap: settings.defaultCap, committed: 0, manualCap: false } });
        if (now) came.push(size);
        continue;
      }
      if (prev.supplierAvailable === now) continue;
      if (now) {
        // Reposição: o fornecedor voltou a ter o tamanho, o limite de venda renova.
        result.stock.push({
          productId: rec.id,
          size,
          mode: 'restock',
          state: { supplierAvailable: true, committed: 0, cap: prev.manualCap ? prev.cap : settings.defaultCap, manualCap: prev.manualCap },
        });
        came.push(size);
      } else {
        result.stock.push({ productId: rec.id, size, mode: 'unavailable', state: { ...prev, supplierAvailable: false } });
        went.push(size);
      }
    }

    if (wasSellable && !nowSellable) {
      result.counts.unavailable++;
      change({
        productId: rec.id,
        kind: 'indisponivel',
        summary: model.archived ? 'Retirado do catálogo do fornecedor: indisponível na loja' : 'Esgotado no fornecedor: todos os tamanhos indisponíveis',
        before: { sizes: Object.entries(rec.stock).filter(([, s]) => s?.supplierAvailable).map(([k]) => k) },
        after: { sizes: [] },
        state: 'applied',
      });
    } else if (!wasSellable && nowSellable) {
      result.counts.restocked++;
      change({ productId: rec.id, kind: 'reposicao', summary: `Voltou ao estoque do fornecedor (${sizesLabel(came)})`, before: { sizes: [] }, after: { sizes: came }, state: 'applied' });
    } else if (went.length || came.length) {
      touched = true;
      const parts = [went.length ? `Esgotou: ${sizesLabel(went)}` : '', came.length ? `Voltou: ${sizesLabel(came)}` : ''].filter(Boolean);
      change({ productId: rec.id, kind: 'tamanhos', summary: parts.join(' · '), before: { esgotou: went }, after: { voltou: came }, state: 'applied' });
    }

    const name = model.name.trim();
    if (name && name !== product.name && !rec.manualFields.includes('name')) {
      touched = true;
      change({ productId: rec.id, kind: 'nome', summary: `Nome: "${product.name}" → "${name}"`, before: product.name, after: name, state: 'applied' });
      product = {
        ...product,
        name,
        images: product.images.map((img, i) => ({ ...img, alt: i === 0 ? name : `${name}, foto ${i + 1}` })),
        description: rec.manualFields.includes('description') ? product.description : `${name}. Produto do catálogo FutZone.`,
      };
    }

    const photos = model.photos.slice(0, PHOTOS_PER_PRODUCT);
    let supplierPhotos: string[] | undefined;
    if (!rec.supplierPhotos.length) {
      if (photos.length) supplierPhotos = photos; // primeira leitura: só registra a referência
    } else if (photos.length && !same(photos, rec.supplierPhotos) && !rec.manualFields.includes('images')) {
      touched = true;
      change({ productId: rec.id, kind: 'fotos', summary: 'O fornecedor trocou as fotos: aprove para atualizar', before: rec.supplierPhotos, after: photos, state: 'pending' });
    }

    const supplierActive = !model.archived;

    if (product !== rec.product || supplierPhotos || supplierActive !== rec.supplierActive) {
      result.updates.push({
        id: rec.id,
        ...(product !== rec.product ? { product } : {}),
        ...(supplierPhotos ? { supplierPhotos } : {}),
        ...(supplierActive !== rec.supplierActive ? { supplierActive } : {}),
      });
    }
    if (touched) updatedIds.add(rec.id);
  }

  // 2. Produtos vinculados que sumiram do fornecedor: indisponíveis, nunca apagados.
  for (const rec of current) {
    if (!rec.supplierId || models.has(rec.supplierId)) continue;
    const availableSizes = Object.entries(rec.stock).filter(([, s]) => s?.supplierAvailable);
    if (!availableSizes.length && !rec.supplierActive) continue;
    for (const [size, s] of availableSizes) result.stock.push({ productId: rec.id, size: size as Size, mode: 'unavailable', state: { ...s!, supplierAvailable: false } });
    if (rec.supplierActive) result.updates.push({ id: rec.id, supplierActive: false });
    if (availableSizes.length) {
      result.counts.unavailable++;
      change({ productId: rec.id, kind: 'indisponivel', summary: 'Não aparece mais no fornecedor: indisponível na loja', before: { sizes: availableSizes.map(([k]) => k) }, after: { sizes: [] }, state: 'applied' });
    }
  }

  // 3. Preços pela tabela (o fornecedor não informa preço).
  const priceChanges = diffPrices(
    current.filter((r) => r.reviewState !== 'rejected'),
    teams,
    rules,
    settings,
  );
  for (const c of priceChanges) {
    change(c);
    if (c.state === 'applied') {
      const upd = result.updates.find((u) => u.id === c.productId);
      const base = upd?.product ?? current.find((r) => r.id === c.productId)!.product;
      const product = { ...base, price: c.after as number };
      if (upd) upd.product = product;
      else result.updates.push({ id: c.productId, product });
      updatedIds.add(c.productId);
    }
  }
  result.counts.updated = updatedIds.size;

  return result;
}

/** Produtos com preço da tabela cujo valor mudou (ao salvar a tabela ou numa sincronização). */
export function diffPrices(current: CurrentRecord[], teams: Team[], rules: PriceRules, settings: IntegrationSettings): PlannedChange[] {
  const out: PlannedChange[] = [];
  for (const rec of current) {
    if (rec.priceSource !== 'rule' || rec.manualFields.includes('price')) continue;
    const expected = rulePrice(priceSubject(rec.product, teams), rules);
    if (expected === rec.product.price) continue;
    const fmt = (c: number) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;
    out.push({
      productId: rec.id,
      kind: 'preco',
      summary: `Preço pela tabela: ${fmt(rec.product.price)} → ${fmt(expected)}`,
      before: rec.product.price,
      after: expected,
      state: settings.approvePriceChanges ? 'pending' : 'applied',
    });
  }
  return out;
}

import type { CategoryId, Team } from '@/types/catalog';
import type { SupplierModel, SupplierTeam } from '@/types/supplier';
import type { CatalogEntry } from '@/data/products';

/**
 * Tradução de um modelo do fornecedor para os dados da loja (categoria, temporada,
 * slug, time). Funções puras: as mesmas regras do catálogo importado.
 */

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(s: string): string {
  return normalizeName(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/** Temporada a partir do nome: "26/27", "2026/27", "2001/02" ou um ano ("1998"). */
export function seasonOf(name: string): string {
  const pair = name.match(/\b(\d{2}|\d{4})\/(\d{2}|\d{4})\b/);
  if (pair) return pair[0];
  const year = name.match(/\b(19\d{2}|20\d{2})\b/);
  return year ? year[0] : '';
}

export function categoryOf(model: Pick<SupplierModel, 'name' | 'kids'>, team: Team): CategoryId {
  const n = normalizeName(model.name);
  if (model.kids || n.startsWith('kit ')) return 'kits';
  if (/\bretro\b/.test(n)) return 'retro';
  if (/\bfeminin[ao]\b/.test(n)) return 'femininas';
  if (team.kind === 'selecao') return 'selecoes';
  return 'clubes';
}

/**
 * Liga os times do fornecedor aos times da loja pelo nome (sem acento, sem caixa).
 * Mapeamentos já salvos (inclusive os feitos à mão no painel) são mantidos.
 */
export function autoMapTeams(
  supplierTeams: SupplierTeam[],
  storeTeams: Team[],
  existing: Map<string, string | null>,
): Map<string, string | null> {
  const byName = new Map(storeTeams.map((t) => [normalizeName(t.name), t.id]));
  const out = new Map(existing);
  for (const st of supplierTeams) {
    if (out.get(st.id)) continue;
    out.set(st.id, byName.get(normalizeName(st.name)) ?? null);
  }
  return out;
}

/** Tamanhos do fornecedor que a loja conhece, na ordem da grade. */
export function knownSizes(sizes: readonly string[], all: readonly string[]): { known: string[]; unknown: string[] } {
  const set = new Set(sizes.map((s) => s.trim().toUpperCase()));
  return { known: all.filter((s) => set.has(s)), unknown: [...set].filter((s) => !all.includes(s)) };
}

/** Linha de catálogo (mesmo formato do catálogo importado) para um modelo novo. */
export function entryFor(
  model: SupplierModel,
  team: Team,
  slug: string,
  availableSizes: string[],
  photos: number,
): CatalogEntry {
  return {
    sourceId: model.id,
    name: model.name.trim(),
    slug,
    teamId: team.id,
    category: categoryOf(model, team),
    kids: model.kids,
    season: seasonOf(model.name),
    availableSizes,
    photos,
    tags: [],
    order: 0,
    createdAt: (model.createdAt || new Date().toISOString()).slice(0, 10),
  };
}

/** Slug livre: acrescenta -2, -3... se já existir. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || 'camisa';
  let slug = root;
  for (let i = 2; taken.has(slug); i++) slug = `${root}-${i}`;
  taken.add(slug);
  return slug;
}

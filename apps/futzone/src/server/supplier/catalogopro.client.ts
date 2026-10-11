import type { SupplierModel, SupplierTeam } from '@/types/supplier';

/**
 * Conector do catalogopro (fornecedor). O catálogo dele é um app Base44 cuja lista
 * de entidades é pública (é o que o próprio site do fornecedor lê). Não é uma API
 * oficial: o formato é validado a cada leitura e, se mudar, a sincronização falha
 * sem tocar no catálogo da loja.
 *
 * Só roda no servidor. Nenhum dado interno do fornecedor (e-mails, ids da Shopify,
 * URLs de origem) é repassado à loja pública.
 */

export interface SupplierCatalogSource {
  fetchModels(): Promise<SupplierModel[]>;
  fetchTeams(): Promise<SupplierTeam[]>;
}

export class SupplierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupplierError';
  }
}

const DEFAULT_APP_ID = '69386f6ce9fe29121d66f65f';
const BASE_URL = 'https://catalogopro.app/api/apps';
const TIMEOUT_MS = 20_000;

export function supplierAppId(): string {
  const id = process.env.SUPPLIER_CATALOGOPRO_APP_ID?.trim() || DEFAULT_APP_ID;
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new SupplierError('SUPPLIER_CATALOGOPRO_APP_ID inválido.');
  return id;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Valida e normaliza um modelo. Devolve null se faltar o essencial. */
export function parseModel(raw: unknown): SupplierModel | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const name = str(r.name).trim();
  if (!/^[a-zA-Z0-9_-]{6,64}$/.test(id) || !name) return null;
  if (r.is_sample === true) return null;
  const sizes = Array.isArray(r.sizes) ? r.sizes.filter((s): s is string => typeof s === 'string') : null;
  if (!sizes) return null;
  const photos = Array.isArray(r.photos)
    ? r.photos.filter((u): u is string => typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u))
    : [];
  return {
    id,
    name: name.slice(0, 160),
    supplierTeamId: str(r.team_id),
    category: str(r.category),
    kids: r.is_kids_kit === true,
    sizes,
    photos,
    archived: r.is_archived === true,
    createdAt: str(r.created_date),
    updatedAt: str(r.updated_date),
  };
}

export function parseTeam(raw: unknown): SupplierTeam | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const name = str(r.name).trim();
  if (!id || !name || r.is_sample === true) return null;
  return { id, name: name.slice(0, 120) };
}

async function fetchJson(entity: string): Promise<unknown[]> {
  const appId = supplierAppId();
  const url = `${BASE_URL}/${appId}/entities/${entity}?limit=5000`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'X-App-Id': appId, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });
      if (!res.ok) throw new SupplierError(`Fornecedor respondeu ${res.status} ao listar ${entity}.`);
      const data: unknown = await res.json();
      if (!Array.isArray(data)) throw new SupplierError(`Formato inesperado do fornecedor em ${entity} (não é uma lista).`);
      return data;
    } catch (err) {
      lastError = err;
      if (err instanceof SupplierError && !/respondeu 5\d\d/.test(err.message)) break;
    }
  }
  if (lastError instanceof SupplierError) throw lastError;
  console.error(`[fornecedor] falha de rede ao listar ${entity}`, lastError);
  const reason = lastError instanceof Error && lastError.name === 'TimeoutError' ? 'tempo esgotado' : 'sem conexão';
  throw new SupplierError(`Não foi possível acessar o fornecedor (${reason}).`);
}

function parseAll<T>(rows: unknown[], parse: (r: unknown) => T | null, entity: string): T[] {
  const out = rows.map(parse).filter((x): x is T => x !== null);
  const rejected = rows.length - out.length;
  // Uma lista que quase não se deixa ler indica mudança de formato: melhor parar.
  if (rows.length && out.length < rows.length * 0.5) {
    throw new SupplierError(`Formato do fornecedor mudou em ${entity}: ${rejected} de ${rows.length} registros ilegíveis.`);
  }
  return out;
}

export const catalogoProSource: SupplierCatalogSource = {
  async fetchModels() {
    return parseAll(await fetchJson('Model'), parseModel, 'Model');
  },
  async fetchTeams() {
    return parseAll(await fetchJson('Team'), parseTeam, 'Team');
  },
};

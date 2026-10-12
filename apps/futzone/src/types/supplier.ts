import type { Cents, Product, Size } from './catalog';
import type { PriceRules } from '@/lib/pricing';

/**
 * Tipos da integração com o fornecedor (catalogopro). Usados pelo servidor e pelo
 * painel. Nada daqui chega à loja pública.
 */

/** Modelo do fornecedor já normalizado (só os campos que a FutZone usa). */
export interface SupplierModel {
  id: string;
  name: string;
  supplierTeamId: string;
  /** "Camisas", "Kits", "Todos"... */
  category: string;
  kids: boolean;
  /** Tamanhos disponíveis agora no fornecedor. */
  sizes: string[];
  photos: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierTeam {
  id: string;
  name: string;
}

export interface IntegrationSettings {
  /** Sincronização diária automática (agendada na Vercel). */
  autoSync: boolean;
  /** Produtos novos ficam aguardando aprovação antes de aparecer na loja. */
  approveNew: boolean;
  /** Mudanças de preço vindas da tabela ficam aguardando aprovação. */
  approvePriceChanges: boolean;
  /** Limite de venda por tamanho disponível no fornecedor. */
  defaultCap: number;
}

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  autoSync: true,
  approveNew: true,
  approvePriceChanges: true,
  defaultCap: 12,
};

export type ChangeKind = 'novo' | 'tamanhos' | 'indisponivel' | 'reposicao' | 'nome' | 'fotos' | 'preco' | 'revisao';
export type ChangeState = 'applied' | 'pending' | 'approved' | 'rejected';

export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = {
  novo: 'Produto novo',
  tamanhos: 'Tamanhos',
  indisponivel: 'Indisponível',
  reposicao: 'Reposição',
  nome: 'Nome',
  fotos: 'Fotos',
  preco: 'Preço',
  revisao: 'Revisão manual',
};

export interface SyncChange {
  id: number;
  runId: number | null;
  productId: string;
  productName: string;
  kind: ChangeKind;
  summary: string;
  before: unknown;
  after: unknown;
  state: ChangeState;
  createdAt: string;
}

export interface SyncRun {
  id: number;
  trigger: 'manual' | 'cron';
  status: 'running' | 'ok' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  found: number;
  created: number;
  updated: number;
  unavailable: number;
  restocked: number;
  pending: number;
  errors: string[];
}

/** Produto aguardando revisão no painel (novo do fornecedor ou com pendência). */
export interface ReviewItem {
  productId: string;
  name: string;
  teamId: string;
  price: Cents;
  reason: string | null;
  /** Fotos do fornecedor (só para o admin conferir antes de aprovar). */
  supplierPhotos: string[];
  sizes: Size[];
  availableSizes: Size[];
}

export interface TeamMapRow {
  supplierTeamId: string;
  supplierName: string;
  teamId: string | null;
  /** Produtos ativos do fornecedor com este time. */
  models: number;
}

export interface IntegrationStatus {
  database: boolean;
  supplierReachable: boolean | null;
  lastRun: SyncRun | null;
  lastSuccessAt: string | null;
  settings: IntegrationSettings;
  priceRules: PriceRules;
  cronConfigured: boolean;
  counts: { products: number; supplierLinked: number; pendingReview: number; pendingChanges: number; unavailable: number };
}

/** Produto como o painel vê (inclui o que a loja pública não mostra). */
export interface AdminProductMeta {
  supplierLinked: boolean;
  supplierActive: boolean;
  reviewState: 'none' | 'pending' | 'rejected';
  manualFields: string[];
  priceSource: 'rule' | 'manual';
}

export type AdminProduct = Product & { meta?: AdminProductMeta };

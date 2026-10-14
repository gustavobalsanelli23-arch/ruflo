/**
 * Esquema do banco da FutZone. Idempotente: pode rodar a cada deploy.
 * Nada aqui apaga dados existentes.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS app_kv (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Catálogo da loja. O fornecedor é referência de disponibilidade; o produto é da FutZone.
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  supplier_id text UNIQUE,
  slug text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  price_source text NOT NULL DEFAULT 'rule' CHECK (price_source IN ('rule', 'manual')),
  manual_fields text[] NOT NULL DEFAULT '{}',
  supplier_active boolean NOT NULL DEFAULT true,
  supplier_photos text[] NOT NULL DEFAULT '{}',
  review_state text NOT NULL DEFAULT 'none' CHECK (review_state IN ('none', 'pending', 'rejected')),
  review_reason text,
  supplier_seen_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Estoque por produto e tamanho. Vendável = supplier_available ? cap - committed : 0.
CREATE TABLE IF NOT EXISTS product_stock (
  product_id text NOT NULL REFERENCES products(id),
  size text NOT NULL,
  supplier_available boolean NOT NULL DEFAULT true,
  cap integer NOT NULL DEFAULT 0 CHECK (cap >= 0),
  committed integer NOT NULL DEFAULT 0 CHECK (committed >= 0),
  manual_cap boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, size),
  CHECK (committed <= cap)
);

-- Fotos de produtos novos do fornecedor (as fotos já existentes ficam em /public/produtos).
CREATE TABLE IF NOT EXISTS product_images (
  product_id text NOT NULL REFERENCES products(id),
  n integer NOT NULL,
  bytes bytea NOT NULL,
  etag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, n)
);

-- Times do fornecedor ligados aos times da loja.
CREATE TABLE IF NOT EXISTS supplier_teams (
  supplier_team_id text PRIMARY KEY,
  supplier_name text NOT NULL,
  team_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id bigserial PRIMARY KEY,
  trigger text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'ok', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  found integer NOT NULL DEFAULT 0,
  created integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  unavailable integer NOT NULL DEFAULT 0,
  restocked integer NOT NULL DEFAULT 0,
  pending integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS sync_changes (
  id bigserial PRIMARY KEY,
  run_id bigint REFERENCES sync_runs(id),
  product_id text NOT NULL REFERENCES products(id),
  kind text NOT NULL,
  summary text NOT NULL,
  before jsonb,
  after jsonb,
  state text NOT NULL CHECK (state IN ('applied', 'pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE INDEX IF NOT EXISTS sync_changes_state_idx ON sync_changes (state, kind);
CREATE INDEX IF NOT EXISTS sync_changes_run_idx ON sync_changes (run_id);

-- Baixa de estoque por pedido confirmado (idempotente pelo id do pedido).
CREATE TABLE IF NOT EXISTS stock_commits (
  order_id text PRIMARY KEY,
  lines jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stock_commit_lines (
  order_id text NOT NULL REFERENCES stock_commits(order_id),
  product_id text NOT NULL REFERENCES products(id),
  size text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id, size)
);
-- Pedido cancelado devolve o estoque uma única vez.
ALTER TABLE stock_commits ADD COLUMN IF NOT EXISTS released_at timestamptz;

-- Pedidos da loja (pagos pelos links da Stripe). data = o Order do site.
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10001;
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  number text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  status text NOT NULL,
  payment_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
`;

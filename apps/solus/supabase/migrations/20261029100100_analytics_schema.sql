-- SOLUS · Parte 04 · 2/6 — Modelo analítico, Storage e RLS
--
-- Cadastros (categorias, fornecedores, produtos), fatos (vendas, itens de
-- venda, posições de estoque), o controle das importações e as oportunidades
-- do motor de inteligência.
--
-- Decisões (detalhes em docs/modelo-analitico.md):
--   * Dinheiro e quantidades em NUMERIC, nunca em ponto flutuante.
--   * Os valores de cada item de venda (bruto, líquido, custo) são colunas
--     geradas: existe uma única fórmula para eles, no banco.
--   * O custo unitário do item é gravado no momento da importação. Mudar o
--     custo do produto depois não recalcula o CMV de vendas passadas.
--   * Toda tabela tem organization_id e as chaves estrangeiras entre tabelas
--     da organização são compostas (organization_id, id): o banco recusa uma
--     venda que aponte para o produto de outra organização.
--   * Todo fato guarda a importação e a linha do arquivo de onde veio.
--   * O cliente só lê. Toda escrita passa pelas funções das migrations
--     seguintes, que conferem o papel no banco.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.sale_line_kind as enum ('sale', 'return');
create type public.issue_severity as enum ('error', 'warning');
create type public.opportunity_type as enum (
  'low_margin',
  'negative_margin',
  'stalled_stock',
  'rupture_risk',
  'tied_up_capital',
  'performance_drop',
  'profitability'
);
create type public.opportunity_status as enum ('new', 'reviewing', 'in_progress', 'resolved', 'dismissed');
create type public.opportunity_priority as enum ('low', 'medium', 'high', 'critical');
create type public.impact_kind as enum ('monthly_profit', 'one_off_profit', 'capital');

-- ---------------------------------------------------------------------------
-- Importações (tabela da Parte 03, ampliada)
-- ---------------------------------------------------------------------------

alter table public.data_imports
  add column storage_path text,
  add column file_format text,
  add column file_size bigint,
  add column file_sha256 text,
  add column sheet_name text,
  add column mapping jsonb not null default '{}'::jsonb,
  add column options jsonb not null default '{}'::jsonb,
  add column summary jsonb not null default '{}'::jsonb,
  add column total_rows integer not null default 0,
  add column valid_rows integer not null default 0,
  add column warning_count integer not null default 0,
  add column duplicate_rows integer not null default 0,
  add column skipped_rows integer not null default 0,
  add column batch_count integer,
  add column duplicate_policy text,
  add column period_start date,
  add column period_end date,
  add column file_verified_at timestamptz,
  add column validated_at timestamptz,
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column reverted_at timestamptz,
  add column reverted_by uuid references public.profiles (id) on delete set null,
  add column failure_reason text,
  add constraint data_imports_org_id_key unique (organization_id, id),
  add constraint data_imports_file_format check (file_format is null or file_format in ('csv', 'xlsx')),
  add constraint data_imports_file_size check (file_size is null or file_size between 1 and 26214400),
  add constraint data_imports_file_sha256 check (file_sha256 is null or file_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint data_imports_sheet_name check (sheet_name is null or char_length(sheet_name) <= 120),
  add constraint data_imports_more_counts check (
    total_rows >= 0 and valid_rows >= 0 and warning_count >= 0 and duplicate_rows >= 0 and skipped_rows >= 0
  ),
  add constraint data_imports_duplicate_policy check (duplicate_policy is null or duplicate_policy in ('skip', 'keep', 'replace', 'update')),
  add constraint data_imports_failure_reason check (failure_reason is null or char_length(failure_reason) <= 200);

create index data_imports_org_sha_idx on public.data_imports (organization_id, file_sha256);
create index data_imports_org_status_idx on public.data_imports (organization_id, status);

comment on table public.data_imports is
  'Importações de planilhas: arquivo original no Storage, mapeamento, contagens, estado e período coberto.';

-- ---------------------------------------------------------------------------
-- Cadastros
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  name_key text not null,
  source_import_id uuid,
  created_at timestamptz not null default now(),
  constraint categories_org_id_key unique (organization_id, id),
  constraint categories_name_key unique (organization_id, name_key),
  constraint categories_name_length check (char_length(name) between 1 and 120 and char_length(name_key) between 1 and 120),
  constraint categories_source_import_fkey foreign key (organization_id, source_import_id)
    references public.data_imports (organization_id, id) on delete set null (source_import_id)
);
comment on table public.categories is 'Categorias de produto. Criadas pela importação de produtos; o nome é comparado sem acentos e sem diferenciar maiúsculas.';

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  name_key text not null,
  code text,
  lead_time_days integer,
  source_import_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_org_id_key unique (organization_id, id),
  constraint suppliers_name_key unique (organization_id, name_key),
  constraint suppliers_name_length check (char_length(name) between 1 and 160 and char_length(name_key) between 1 and 160),
  constraint suppliers_code_length check (code is null or char_length(code) between 1 and 64),
  constraint suppliers_lead_time check (lead_time_days is null or lead_time_days between 0 and 365),
  constraint suppliers_source_import_fkey foreign key (organization_id, source_import_id)
    references public.data_imports (organization_id, id) on delete set null (source_import_id)
);
comment on table public.suppliers is 'Fornecedores. O prazo de entrega (dias) alimenta o risco de ruptura quando o produto não tem prazo próprio.';

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sku text not null,
  sku_key text not null,
  name text not null,
  category_id uuid,
  supplier_id uuid,
  unit text,
  current_cost numeric(14, 4),
  current_price numeric(14, 4),
  lead_time_days integer,
  perishable boolean,
  active boolean not null default true,
  catalog_complete boolean not null default true,
  created_import_id uuid,
  updated_import_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_org_id_key unique (organization_id, id),
  constraint products_sku_key unique (organization_id, sku_key),
  constraint products_sku_length check (char_length(sku) between 1 and 64 and char_length(sku_key) between 1 and 64),
  constraint products_name_length check (char_length(name) between 1 and 200),
  constraint products_unit_length check (unit is null or char_length(unit) between 1 and 20),
  constraint products_cost check (current_cost is null or current_cost >= 0),
  constraint products_price check (current_price is null or current_price >= 0),
  constraint products_lead_time check (lead_time_days is null or lead_time_days between 0 and 365),
  constraint products_category_fkey foreign key (organization_id, category_id)
    references public.categories (organization_id, id) on delete set null (category_id),
  constraint products_supplier_fkey foreign key (organization_id, supplier_id)
    references public.suppliers (organization_id, id) on delete set null (supplier_id),
  constraint products_created_import_fkey foreign key (organization_id, created_import_id)
    references public.data_imports (organization_id, id) on delete set null (created_import_id),
  constraint products_updated_import_fkey foreign key (organization_id, updated_import_id)
    references public.data_imports (organization_id, id) on delete set null (updated_import_id)
);
create index products_org_category_idx on public.products (organization_id, category_id);
create index products_org_supplier_idx on public.products (organization_id, supplier_id);
comment on table public.products is
  'Produtos, identificados pelo SKU (sku_key: maiúsculas, sem espaços). catalog_complete = false quando o produto nasceu de uma venda ou posição de estoque sem cadastro.';
comment on column public.products.current_cost is
  'Custo unitário atual. Usado só para vendas importadas sem custo, e congelado no item no momento da importação.';

-- ---------------------------------------------------------------------------
-- Fatos
-- ---------------------------------------------------------------------------

-- Um documento de venda identificado (pedido, cupom ou nota). Linhas sem
-- número de documento não ganham um registro aqui: sem identificador não há
-- como contar vendas nem calcular ticket médio com honestidade.
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  external_id text not null,
  sold_at date not null,
  channel text,
  import_id uuid not null,
  created_at timestamptz not null default now(),
  constraint sales_org_id_key unique (organization_id, id),
  constraint sales_external_key unique (organization_id, external_id),
  constraint sales_external_length check (char_length(external_id) between 1 and 64),
  constraint sales_channel_length check (channel is null or char_length(channel) between 1 and 60),
  constraint sales_import_fkey foreign key (organization_id, import_id)
    references public.data_imports (organization_id, id) on delete cascade
);
comment on table public.sales is 'Documentos de venda identificados (pedido/cupom). A importação que criou o documento fica em import_id.';

create table public.sale_items (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  import_id uuid not null,
  row_number integer not null,
  sale_id uuid,
  order_ref text,
  product_id uuid not null,
  sold_at date not null,
  kind public.sale_line_kind not null default 'sale',
  quantity numeric(14, 3) not null,
  unit_price numeric(14, 4) not null,
  discount numeric(14, 2) not null default 0,
  unit_cost numeric(14, 4),
  cost_source text not null,
  channel text,
  fingerprint bytea not null,
  gross_amount numeric generated always as (quantity * unit_price) stored,
  net_amount numeric generated always as (quantity * unit_price - discount) stored,
  cost_amount numeric generated always as (quantity * unit_cost) stored,
  created_at timestamptz not null default now(),
  constraint sale_items_row_key unique (import_id, row_number),
  constraint sale_items_row_number check (row_number between 1 and 2000000),
  constraint sale_items_quantity check (quantity > 0),
  constraint sale_items_unit_price check (unit_price >= 0),
  constraint sale_items_discount check (discount >= 0 and discount <= quantity * unit_price),
  constraint sale_items_unit_cost check (unit_cost is null or unit_cost >= 0),
  constraint sale_items_cost_source check (
    (cost_source = 'none' and unit_cost is null) or (cost_source in ('file', 'catalog') and unit_cost is not null)
  ),
  constraint sale_items_order_ref_length check (order_ref is null or char_length(order_ref) between 1 and 64),
  constraint sale_items_channel_length check (channel is null or char_length(channel) between 1 and 60),
  constraint sale_items_import_fkey foreign key (organization_id, import_id)
    references public.data_imports (organization_id, id) on delete cascade,
  constraint sale_items_product_fkey foreign key (organization_id, product_id)
    references public.products (organization_id, id),
  constraint sale_items_sale_fkey foreign key (organization_id, sale_id)
    references public.sales (organization_id, id) on delete set null (sale_id)
);
create index sale_items_org_date_idx on public.sale_items (organization_id, sold_at);
create index sale_items_org_product_date_idx on public.sale_items (organization_id, product_id, sold_at);
create index sale_items_org_fingerprint_idx on public.sale_items (organization_id, fingerprint);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_import_idx on public.sale_items (import_id);
comment on table public.sale_items is
  'Itens de venda e devolução. Quantidades sempre positivas; o tipo (kind) define o sinal. gross_amount, net_amount e cost_amount são calculados pelo banco.';
comment on column public.sale_items.unit_cost is
  'Custo unitário histórico: o do arquivo (cost_source = file) ou o do cadastro no momento da importação (catalog). Nunca é recalculado.';
comment on column public.sale_items.fingerprint is
  'SHA-256 do conteúdo da linha (data, documento, SKU, tipo, quantidade, preço, desconto) e da ocorrência no arquivo. Detecta reimportações.';

create table public.inventory_snapshots (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  import_id uuid not null,
  row_number integer not null,
  product_id uuid not null,
  snapshot_date date not null,
  quantity numeric(14, 3) not null,
  unit_cost numeric(14, 4),
  cost_source text not null,
  created_at timestamptz not null default now(),
  constraint inventory_snapshots_key unique (import_id, product_id, snapshot_date),
  constraint inventory_snapshots_row_number check (row_number between 1 and 2000000),
  constraint inventory_snapshots_quantity check (quantity between -99999999999 and 99999999999),
  constraint inventory_snapshots_unit_cost check (unit_cost is null or unit_cost >= 0),
  constraint inventory_snapshots_cost_source check (
    (cost_source = 'none' and unit_cost is null) or (cost_source in ('file', 'catalog') and unit_cost is not null)
  ),
  constraint inventory_snapshots_import_fkey foreign key (organization_id, import_id)
    references public.data_imports (organization_id, id) on delete cascade,
  constraint inventory_snapshots_product_fkey foreign key (organization_id, product_id)
    references public.products (organization_id, id)
);
create index inventory_snapshots_position_idx
  on public.inventory_snapshots (organization_id, product_id, snapshot_date desc, created_at desc);
create index inventory_snapshots_import_idx on public.inventory_snapshots (import_id);
comment on table public.inventory_snapshots is
  'Posição de estoque por produto e data. Uma nova importação da mesma data não apaga a anterior: vale a mais recente, e desfazer a nova traz a anterior de volta.';

-- ---------------------------------------------------------------------------
-- Controle da importação
-- ---------------------------------------------------------------------------

create table public.import_batches (
  import_id uuid not null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  batch_index integer not null,
  row_count integer not null,
  rejected_count integer not null,
  warning_count integer not null,
  payload_sha256 text not null,
  staged_at timestamptz not null default now(),
  committed_at timestamptz,
  inserted_count integer,
  skipped_count integer,
  primary key (import_id, batch_index),
  constraint import_batches_index check (batch_index between 0 and 999),
  constraint import_batches_counts check (row_count >= 0 and rejected_count >= 0 and warning_count >= 0),
  constraint import_batches_import_fkey foreign key (organization_id, import_id)
    references public.data_imports (organization_id, id) on delete cascade
);
comment on table public.import_batches is 'Lotes de uma importação. Reenviar um lote já recebido não grava nada de novo (idempotência).';

create table public.import_errors (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  import_id uuid not null,
  row_number integer,
  field text,
  code text not null,
  severity public.issue_severity not null,
  message text not null,
  raw_value text,
  created_at timestamptz not null default now(),
  constraint import_errors_row_number check (row_number is null or row_number between 1 and 2000000),
  constraint import_errors_field_length check (field is null or char_length(field) <= 64),
  constraint import_errors_code_format check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint import_errors_message_length check (char_length(message) between 1 and 300),
  constraint import_errors_raw_length check (raw_value is null or char_length(raw_value) <= 200),
  constraint import_errors_import_fkey foreign key (organization_id, import_id)
    references public.data_imports (organization_id, id) on delete cascade
);
create index import_errors_import_idx on public.import_errors (import_id, severity, row_number);
comment on table public.import_errors is
  'Problemas encontrados por linha: error rejeita a linha; warning importa a linha e registra o ajuste feito.';

-- Linhas validadas aguardando a confirmação. Fora da API (schema private):
-- só as funções de importação leem e escrevem aqui.
create table private.import_rows (
  import_id uuid not null references public.data_imports (id) on delete cascade,
  row_number integer not null,
  organization_id uuid not null,
  batch_index integer not null,
  data jsonb not null,
  content_key text,
  fingerprint bytea,
  duplicate text,
  primary key (import_id, row_number),
  constraint import_rows_duplicate check (duplicate is null or duplicate in ('exact', 'order', 'possible', 'existing'))
);
create index import_rows_batch_idx on private.import_rows (import_id, batch_index);
alter table private.import_rows enable row level security;
revoke all on table private.import_rows from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Parâmetros das análises e oportunidades
-- ---------------------------------------------------------------------------

create table public.analysis_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  min_margin numeric(5, 4) not null default 0.20,
  max_discount_rate numeric(5, 4) not null default 0.15,
  stalled_days integer not null default 60,
  velocity_window_days integer not null default 90,
  default_lead_time_days integer not null default 7,
  high_turnover_days integer not null default 30,
  low_turnover_days integer not null default 90,
  excess_coverage_days integer not null default 120,
  target_coverage_days integer not null default 45,
  drop_threshold numeric(5, 4) not null default 0.30,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint analysis_settings_min_margin check (min_margin between 0 and 0.9),
  constraint analysis_settings_discount check (max_discount_rate between 0.01 and 0.9),
  constraint analysis_settings_stalled check (stalled_days between 14 and 365),
  constraint analysis_settings_window check (velocity_window_days between 28 and 365),
  constraint analysis_settings_lead_time check (default_lead_time_days between 0 and 180),
  constraint analysis_settings_turnover check (
    high_turnover_days between 1 and 365 and low_turnover_days between 2 and 730 and high_turnover_days < low_turnover_days
  ),
  constraint analysis_settings_coverage check (
    target_coverage_days between 1 and 365 and excess_coverage_days between 2 and 730 and target_coverage_days < excess_coverage_days
  ),
  constraint analysis_settings_drop check (drop_threshold between 0.05 and 0.9)
);
comment on table public.analysis_settings is
  'Parâmetros das análises por organização. Sem linha, valem os padrões (os mesmos das colunas).';

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  trigger text not null,
  import_id uuid,
  triggered_by uuid references public.profiles (id) on delete set null,
  engine_version text not null,
  period_start date,
  period_end date,
  detected_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  reopened_count integer not null default 0,
  resolved_count integer not null default 0,
  limitations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint analysis_runs_trigger check (trigger in ('import', 'manual', 'revert', 'settings')),
  constraint analysis_runs_engine_version check (char_length(engine_version) between 1 and 32),
  constraint analysis_runs_limitations check (jsonb_typeof(limitations) = 'array'),
  constraint analysis_runs_org_id_key unique (organization_id, id),
  constraint analysis_runs_import_fkey foreign key (organization_id, import_id)
    references public.data_imports (organization_id, id) on delete set null (import_id)
);
create index analysis_runs_org_created_idx on public.analysis_runs (organization_id, created_at desc);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type public.opportunity_type not null,
  dedupe_key text not null,
  entity_type text not null,
  entity_id uuid,
  entity_label text not null,
  title text not null,
  summary text not null,
  priority public.opportunity_priority not null,
  confidence numeric(3, 2) not null,
  impact_value numeric(14, 2) not null,
  impact_kind public.impact_kind not null,
  impact_method text not null,
  facts jsonb not null,
  hypotheses jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  series jsonb,
  period_start date not null,
  period_end date not null,
  status public.opportunity_status not null default 'new',
  active boolean not null default true,
  detected_count integer not null default 1,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  last_run_id uuid,
  status_changed_at timestamptz,
  status_changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_org_id_key unique (organization_id, id),
  constraint opportunities_dedupe_key unique (organization_id, dedupe_key),
  constraint opportunities_dedupe_format check (char_length(dedupe_key) between 3 and 200),
  constraint opportunities_entity_type check (entity_type in ('product', 'category', 'supplier', 'organization')),
  constraint opportunities_texts check (
    char_length(entity_label) between 1 and 200 and char_length(title) between 1 and 200
    and char_length(summary) between 1 and 600 and char_length(impact_method) between 1 and 600
  ),
  constraint opportunities_confidence check (confidence between 0 and 1),
  constraint opportunities_impact check (impact_value >= 0),
  constraint opportunities_facts check (jsonb_typeof(facts) = 'array' and jsonb_array_length(facts) between 1 and 20),
  constraint opportunities_hypotheses check (jsonb_typeof(hypotheses) = 'array' and jsonb_array_length(hypotheses) <= 10),
  constraint opportunities_recommendations check (jsonb_typeof(recommendations) = 'array' and jsonb_array_length(recommendations) <= 10),
  constraint opportunities_series check (series is null or (jsonb_typeof(series) = 'array' and jsonb_array_length(series) <= 120)),
  constraint opportunities_period check (period_start <= period_end),
  constraint opportunities_run_fkey foreign key (organization_id, last_run_id)
    references public.analysis_runs (organization_id, id) on delete set null (last_run_id)
);
create index opportunities_org_status_idx on public.opportunities (organization_id, status, priority);
comment on table public.opportunities is
  'Oportunidades do motor determinístico. dedupe_key (tipo + entidade) impede duplicatas entre execuções. facts são fatos medidos; hypotheses são explicações possíveis, nunca afirmações.';

create table public.opportunity_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  opportunity_id uuid not null,
  event text not null,
  from_status public.opportunity_status,
  to_status public.opportunity_status,
  actor_id uuid references public.profiles (id) on delete set null,
  run_id uuid,
  note text,
  created_at timestamptz not null default now(),
  constraint opportunity_events_event check (event in ('detected', 'redetected', 'status_changed', 'auto_resolved')),
  constraint opportunity_events_note_length check (note is null or char_length(note) between 1 and 500),
  constraint opportunity_events_opportunity_fkey foreign key (organization_id, opportunity_id)
    references public.opportunities (organization_id, id) on delete cascade,
  constraint opportunity_events_run_fkey foreign key (organization_id, run_id)
    references public.analysis_runs (organization_id, id) on delete set null (run_id)
);
create index opportunity_events_opportunity_idx on public.opportunity_events (opportunity_id, created_at);
comment on table public.opportunity_events is 'Histórico de cada oportunidade: detecções e mudanças de status (actor_id nulo = sistema).';

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------

create trigger suppliers_touch before update on public.suppliers
  for each row execute function private.touch_updated_at();
create trigger products_touch before update on public.products
  for each row execute function private.touch_updated_at();
create trigger analysis_settings_touch before update on public.analysis_settings
  for each row execute function private.touch_updated_at();
create trigger opportunities_touch before update on public.opportunities
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Privilégios: o cliente só lê. Escritas pelas funções do banco.
-- ---------------------------------------------------------------------------

revoke all on table
  public.categories,
  public.suppliers,
  public.products,
  public.sales,
  public.sale_items,
  public.inventory_snapshots,
  public.import_batches,
  public.import_errors,
  public.analysis_settings,
  public.analysis_runs,
  public.opportunities,
  public.opportunity_events
from anon, authenticated;

grant select on
  public.categories,
  public.suppliers,
  public.products,
  public.sales,
  public.sale_items,
  public.inventory_snapshots,
  public.import_batches,
  public.import_errors,
  public.analysis_settings,
  public.analysis_runs,
  public.opportunities,
  public.opportunity_events
to authenticated;

grant all on
  public.categories,
  public.suppliers,
  public.products,
  public.sales,
  public.sale_items,
  public.inventory_snapshots,
  public.import_batches,
  public.import_errors,
  public.analysis_settings,
  public.analysis_runs,
  public.opportunities,
  public.opportunity_events
to service_role;

-- A criação de importações passa a ser só por public.create_import(), que
-- valida o arquivo e devolve o caminho no Storage.
drop policy data_imports_insert_analyst on public.data_imports;
revoke insert on public.data_imports from authenticated;

-- Excluir do histórico só o que não tem dados nos painéis. Uma importação
-- concluída é desfeita com public.revert_import() antes.
drop policy data_imports_delete_admin on public.data_imports;
create policy data_imports_delete_admin on public.data_imports
  for delete to authenticated
  using (
    organization_id in (select private.user_org_ids('admin'))
    and status in ('failed', 'canceled', 'reverted')
  );

-- ---------------------------------------------------------------------------
-- RLS: leitura para membros da organização (viewer ou superior)
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.inventory_snapshots enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_errors enable row level security;
alter table public.analysis_settings enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_events enable row level security;

create policy categories_select_member on public.categories
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy suppliers_select_member on public.suppliers
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy products_select_member on public.products
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy sales_select_member on public.sales
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy sale_items_select_member on public.sale_items
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy inventory_snapshots_select_member on public.inventory_snapshots
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy import_batches_select_member on public.import_batches
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy import_errors_select_member on public.import_errors
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy analysis_settings_select_member on public.analysis_settings
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy analysis_runs_select_member on public.analysis_runs
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy opportunities_select_member on public.opportunities
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));
create policy opportunity_events_select_member on public.opportunity_events
  for select to authenticated using (organization_id in (select private.user_org_ids('viewer')));

-- ---------------------------------------------------------------------------
-- Storage: bucket privado `imports`, um diretório por organização
--
--   imports/<organization_id>/<import_id>/original.<csv|xlsx>
--
-- O envio usa uma URL assinada criada pelo servidor com a sessão do usuário;
-- a política de INSERT é conferida na criação da URL. Só é aceito o caminho
-- de uma importação pendente, criada pela própria pessoa, sem arquivo ainda.
-- Não há UPDATE: o original nunca é sobrescrito.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imports',
  'imports',
  false,
  26214400,
  array['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create function private.import_object_org(object_name text, minimum public.org_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/original\.(csv|xlsx)$'
    and split_part(object_name, '/', 1)::uuid in (select private.user_org_ids(minimum))
$$;

create function private.can_upload_import(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.import_object_org(object_name, 'analyst')
    and exists (
      select 1
      from public.data_imports d
      where d.id = split_part(object_name, '/', 2)::uuid
        and d.organization_id = split_part(object_name, '/', 1)::uuid
        and d.storage_path = object_name
        and d.status = 'pending'
        and d.file_verified_at is null
        and d.created_by = (select auth.uid())
    )
$$;

revoke all on function
  private.import_object_org(text, public.org_role),
  private.can_upload_import(text)
from public, anon;
grant execute on function
  private.import_object_org(text, public.org_role),
  private.can_upload_import(text)
to authenticated;

create policy imports_insert_own_pending on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imports' and private.can_upload_import(name));

create policy imports_select_analyst on storage.objects
  for select to authenticated
  using (bucket_id = 'imports' and private.import_object_org(name, 'analyst'));

create policy imports_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'imports' and private.import_object_org(name, 'admin'));

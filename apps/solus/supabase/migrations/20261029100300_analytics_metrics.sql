-- SOLUS · Parte 04 · 5/6 — Camada de métricas
--
-- Fonte única dos números: os painéis, o Intelligence Engine e os testes
-- usam estas funções. Todas são SECURITY INVOKER: rodam com a sessão de quem
-- chama, então o RLS das tabelas vale aqui também. Só entram dados de
-- importações concluídas (private.active_import_ids).
--
-- Fórmulas (período fechado [p_start, p_end]):
--   receita bruta      Σ quantidade × preço unitário             (itens de venda)
--   descontos          Σ desconto                                 (itens de venda)
--   devoluções         Σ quantidade × preço − desconto            (itens de devolução)
--   receita líquida    receita bruta − descontos − devoluções
--   CMV                Σ quantidade × custo histórico (vendas) − Σ idem (devoluções)
--   receita com custo  receita líquida só dos itens com custo conhecido
--   lucro bruto        receita com custo − CMV
--   margem bruta       lucro bruto ÷ receita com custo; indisponível (null)
--                      quando a receita líquida ou a receita com custo é ≤ 0
--   cobertura de custo receita com custo ÷ receita líquida
--   vendas             documentos distintos com itens de venda (linhas sem
--                      número de documento não contam)
--   ticket médio       receita líquida dos documentos identificados ÷ vendas
--   unidades           Σ quantidade vendida − Σ quantidade devolvida
--
-- Lucro bruto não é lucro líquido: impostos sobre a venda (quando não
-- descontados no preço), frete, comissões e despesas fixas não entram.

-- Parâmetros da organização com os padrões (os mesmos das colunas).
create function public.analysis_parameters(p_organization_id uuid)
returns table (
  min_margin numeric,
  max_discount_rate numeric,
  stalled_days integer,
  velocity_window_days integer,
  default_lead_time_days integer,
  high_turnover_days integer,
  low_turnover_days integer,
  excess_coverage_days integer,
  target_coverage_days integer,
  drop_threshold numeric,
  customized boolean
)
language sql
stable
set search_path = ''
as $$
  select
    coalesce(s.min_margin, 0.20),
    coalesce(s.max_discount_rate, 0.15),
    coalesce(s.stalled_days, 60),
    coalesce(s.velocity_window_days, 90),
    coalesce(s.default_lead_time_days, 7),
    coalesce(s.high_turnover_days, 30),
    coalesce(s.low_turnover_days, 90),
    coalesce(s.excess_coverage_days, 120),
    coalesce(s.target_coverage_days, 45),
    coalesce(s.drop_threshold, 0.30),
    s.organization_id is not null
  from (select 1) as one
  left join public.analysis_settings s on s.organization_id = p_organization_id
$$;

-- O que existe de dados: base para o período padrão e os avisos de limitação.
-- Usa os metadados das importações (rápido mesmo com milhões de itens).
create function public.analytics_coverage(p_organization_id uuid)
returns table (
  first_sale date,
  last_sale date,
  sales_imports bigint,
  last_snapshot date,
  inventory_imports bigint,
  products bigint,
  incomplete_products bigint,
  products_with_cost bigint,
  last_import_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    (select min(d.period_start) from public.data_imports d
      where d.organization_id = p_organization_id and d.dataset = 'sales' and d.status in ('completed', 'with_errors')),
    (select max(d.period_end) from public.data_imports d
      where d.organization_id = p_organization_id and d.dataset = 'sales' and d.status in ('completed', 'with_errors')),
    (select count(*) from public.data_imports d
      where d.organization_id = p_organization_id and d.dataset = 'sales' and d.status in ('completed', 'with_errors')),
    (select max(d.period_end) from public.data_imports d
      where d.organization_id = p_organization_id and d.dataset = 'inventory' and d.status in ('completed', 'with_errors')),
    (select count(*) from public.data_imports d
      where d.organization_id = p_organization_id and d.dataset = 'inventory' and d.status in ('completed', 'with_errors')),
    (select count(*) from public.products p where p.organization_id = p_organization_id),
    (select count(*) from public.products p where p.organization_id = p_organization_id and not p.catalog_complete),
    (select count(*) from public.products p where p.organization_id = p_organization_id and p.current_cost is not null),
    (select max(d.completed_at) from public.data_imports d
      where d.organization_id = p_organization_id and d.status in ('completed', 'with_errors'))
$$;

-- Totais do período.
create function public.analytics_summary(p_organization_id uuid, p_start date, p_end date)
returns table (
  gross_revenue numeric,
  discounts numeric,
  returns numeric,
  net_revenue numeric,
  costed_net_revenue numeric,
  cogs numeric,
  gross_profit numeric,
  gross_margin numeric,
  cost_coverage numeric,
  orders bigint,
  identified_net_revenue numeric,
  average_ticket numeric,
  units_sold numeric,
  sale_lines bigint,
  return_lines bigint,
  active_days bigint,
  catalog_cost_lines bigint,
  uncosted_lines bigint
)
language sql
stable
set search_path = ''
as $$
  with totals as (
    select
      coalesce(sum(i.gross_amount) filter (where i.kind = 'sale'), 0) as gross,
      coalesce(sum(i.discount) filter (where i.kind = 'sale'), 0) as disc,
      coalesce(sum(i.net_amount) filter (where i.kind = 'return'), 0) as ret,
      coalesce(sum(i.net_amount) filter (where i.kind = 'sale' and i.unit_cost is not null), 0)
        - coalesce(sum(i.net_amount) filter (where i.kind = 'return' and i.unit_cost is not null), 0) as costed,
      coalesce(sum(i.cost_amount) filter (where i.kind = 'sale'), 0)
        - coalesce(sum(i.cost_amount) filter (where i.kind = 'return'), 0) as cogs,
      count(distinct i.sale_id) filter (where i.kind = 'sale') as orders,
      coalesce(sum(i.net_amount) filter (where i.kind = 'sale' and i.sale_id is not null), 0)
        - coalesce(sum(i.net_amount) filter (where i.kind = 'return' and i.sale_id is not null), 0) as identified,
      coalesce(sum(i.quantity) filter (where i.kind = 'sale'), 0)
        - coalesce(sum(i.quantity) filter (where i.kind = 'return'), 0) as units,
      count(*) filter (where i.kind = 'sale') as sale_lines,
      count(*) filter (where i.kind = 'return') as return_lines,
      count(distinct i.sold_at) as active_days,
      count(*) filter (where i.cost_source = 'catalog') as catalog_lines,
      count(*) filter (where i.cost_source = 'none') as uncosted_lines
    from public.sale_items i
    where i.organization_id = p_organization_id
      and i.sold_at between p_start and p_end
      and i.import_id in (select private.active_import_ids(p_organization_id))
  )
  select
    t.gross,
    t.disc,
    t.ret,
    t.gross - t.disc - t.ret,
    t.costed,
    t.cogs,
    t.costed - t.cogs,
    case when t.gross - t.disc - t.ret > 0 and t.costed > 0 then (t.costed - t.cogs) / t.costed end,
    case when t.gross - t.disc - t.ret > 0 then least(t.costed / (t.gross - t.disc - t.ret), 1) end,
    t.orders,
    t.identified,
    case when t.orders > 0 then t.identified / t.orders end,
    t.units,
    t.sale_lines,
    t.return_lines,
    t.active_days,
    t.catalog_lines,
    t.uncosted_lines
  from totals t
$$;

-- Evolução diária (no máximo 1.100 dias por chamada).
create function public.analytics_daily(p_organization_id uuid, p_start date, p_end date)
returns table (
  day date,
  gross_revenue numeric,
  net_revenue numeric,
  costed_net_revenue numeric,
  cogs numeric,
  gross_profit numeric,
  orders bigint,
  units_sold numeric
)
language sql
stable
set search_path = ''
as $$
  with agg as (
    select
      i.sold_at,
      coalesce(sum(i.gross_amount) filter (where i.kind = 'sale'), 0) as gross,
      coalesce(sum(i.discount) filter (where i.kind = 'sale'), 0) as disc,
      coalesce(sum(i.net_amount) filter (where i.kind = 'return'), 0) as ret,
      coalesce(sum(i.net_amount) filter (where i.kind = 'sale' and i.unit_cost is not null), 0)
        - coalesce(sum(i.net_amount) filter (where i.kind = 'return' and i.unit_cost is not null), 0) as costed,
      coalesce(sum(i.cost_amount) filter (where i.kind = 'sale'), 0)
        - coalesce(sum(i.cost_amount) filter (where i.kind = 'return'), 0) as cogs,
      count(distinct i.sale_id) filter (where i.kind = 'sale') as orders,
      coalesce(sum(i.quantity) filter (where i.kind = 'sale'), 0)
        - coalesce(sum(i.quantity) filter (where i.kind = 'return'), 0) as units
    from public.sale_items i
    where i.organization_id = p_organization_id
      and i.sold_at between p_start and p_end
      and i.import_id in (select private.active_import_ids(p_organization_id))
    group by i.sold_at
  )
  select
    d::date,
    coalesce(a.gross, 0),
    coalesce(a.gross - a.disc - a.ret, 0),
    coalesce(a.costed, 0),
    coalesce(a.cogs, 0),
    coalesce(a.costed - a.cogs, 0),
    coalesce(a.orders, 0),
    coalesce(a.units, 0)
  from generate_series(p_start, least(p_end, p_start + 1099), interval '1 day') as d
  left join agg a on a.sold_at = d::date
  order by 1
$$;

-- Métricas por produto no período (só produtos com movimento).
create function public.analytics_products(p_organization_id uuid, p_start date, p_end date)
returns table (
  product_id uuid,
  sku text,
  product_name text,
  category_id uuid,
  category_name text,
  supplier_id uuid,
  supplier_name text,
  catalog_complete boolean,
  gross_revenue numeric,
  discounts numeric,
  returns numeric,
  net_revenue numeric,
  costed_net_revenue numeric,
  cogs numeric,
  gross_profit numeric,
  gross_margin numeric,
  cost_coverage numeric,
  discount_rate numeric,
  units_sold numeric,
  orders bigint,
  sale_days bigint,
  file_cost_lines bigint,
  catalog_cost_lines bigint,
  uncosted_lines bigint,
  average_price numeric,
  average_cost numeric,
  first_sale date,
  last_sale date
)
language sql
stable
set search_path = ''
as $$
  with agg as (
    select
      i.product_id,
      coalesce(sum(i.gross_amount) filter (where i.kind = 'sale'), 0) as gross,
      coalesce(sum(i.discount) filter (where i.kind = 'sale'), 0) as disc,
      coalesce(sum(i.net_amount) filter (where i.kind = 'return'), 0) as ret,
      coalesce(sum(i.net_amount) filter (where i.kind = 'sale' and i.unit_cost is not null), 0)
        - coalesce(sum(i.net_amount) filter (where i.kind = 'return' and i.unit_cost is not null), 0) as costed,
      coalesce(sum(i.cost_amount) filter (where i.kind = 'sale'), 0)
        - coalesce(sum(i.cost_amount) filter (where i.kind = 'return'), 0) as cogs,
      coalesce(sum(i.quantity) filter (where i.kind = 'sale'), 0)
        - coalesce(sum(i.quantity) filter (where i.kind = 'return'), 0) as units,
      coalesce(sum(i.quantity) filter (where i.kind = 'sale'), 0) as sold_qty,
      coalesce(sum(i.quantity) filter (where i.kind = 'sale' and i.unit_cost is not null), 0) as costed_qty,
      coalesce(sum(i.cost_amount) filter (where i.kind = 'sale'), 0) as sale_cost,
      count(distinct i.sale_id) filter (where i.kind = 'sale') as orders,
      count(distinct i.sold_at) filter (where i.kind = 'sale') as sale_days,
      count(*) filter (where i.cost_source = 'file') as file_lines,
      count(*) filter (where i.cost_source = 'catalog') as catalog_lines,
      count(*) filter (where i.cost_source = 'none') as uncosted_lines,
      min(i.sold_at) filter (where i.kind = 'sale') as first_sale,
      max(i.sold_at) filter (where i.kind = 'sale') as last_sale
    from public.sale_items i
    where i.organization_id = p_organization_id
      and i.sold_at between p_start and p_end
      and i.import_id in (select private.active_import_ids(p_organization_id))
    group by i.product_id
  )
  select
    a.product_id,
    p.sku,
    p.name,
    p.category_id,
    c.name,
    p.supplier_id,
    s.name,
    p.catalog_complete,
    a.gross,
    a.disc,
    a.ret,
    a.gross - a.disc - a.ret,
    a.costed,
    a.cogs,
    a.costed - a.cogs,
    case when a.gross - a.disc - a.ret > 0 and a.costed > 0 then (a.costed - a.cogs) / a.costed end,
    case when a.gross - a.disc - a.ret > 0 then least(a.costed / (a.gross - a.disc - a.ret), 1) end,
    case when a.gross > 0 then a.disc / a.gross end,
    a.units,
    a.orders,
    a.sale_days,
    a.file_lines,
    a.catalog_lines,
    a.uncosted_lines,
    case when a.sold_qty > 0 then (a.gross - a.disc) / a.sold_qty end,
    case when a.costed_qty > 0 then a.sale_cost / a.costed_qty end,
    a.first_sale,
    a.last_sale
  from agg a
  join public.products p on p.id = a.product_id
  left join public.categories c on c.id = p.category_id
  left join public.suppliers s on s.id = p.supplier_id
$$;

-- Agregações de analytics_products: mesma fórmula, outro agrupamento.
create function public.analytics_categories(p_organization_id uuid, p_start date, p_end date)
returns table (
  category_id uuid,
  category_name text,
  products bigint,
  gross_revenue numeric,
  discounts numeric,
  returns numeric,
  net_revenue numeric,
  costed_net_revenue numeric,
  cogs numeric,
  gross_profit numeric,
  gross_margin numeric,
  cost_coverage numeric,
  units_sold numeric
)
language sql
stable
set search_path = ''
as $$
  select
    x.category_id,
    x.category_name,
    count(*),
    sum(x.gross_revenue),
    sum(x.discounts),
    sum(x.returns),
    sum(x.net_revenue),
    sum(x.costed_net_revenue),
    sum(x.cogs),
    sum(x.gross_profit),
    case when sum(x.net_revenue) > 0 and sum(x.costed_net_revenue) > 0 then sum(x.gross_profit) / sum(x.costed_net_revenue) end,
    case when sum(x.net_revenue) > 0 then least(sum(x.costed_net_revenue) / sum(x.net_revenue), 1) end,
    sum(x.units_sold)
  from public.analytics_products(p_organization_id, p_start, p_end) x
  group by x.category_id, x.category_name
$$;

create function public.analytics_suppliers(p_organization_id uuid, p_start date, p_end date)
returns table (
  supplier_id uuid,
  supplier_name text,
  products bigint,
  gross_revenue numeric,
  discounts numeric,
  returns numeric,
  net_revenue numeric,
  costed_net_revenue numeric,
  cogs numeric,
  gross_profit numeric,
  gross_margin numeric,
  cost_coverage numeric,
  units_sold numeric
)
language sql
stable
set search_path = ''
as $$
  select
    x.supplier_id,
    x.supplier_name,
    count(*),
    sum(x.gross_revenue),
    sum(x.discounts),
    sum(x.returns),
    sum(x.net_revenue),
    sum(x.costed_net_revenue),
    sum(x.cogs),
    sum(x.gross_profit),
    case when sum(x.net_revenue) > 0 and sum(x.costed_net_revenue) > 0 then sum(x.gross_profit) / sum(x.costed_net_revenue) end,
    case when sum(x.net_revenue) > 0 then least(sum(x.costed_net_revenue) / sum(x.net_revenue), 1) end,
    sum(x.units_sold)
  from public.analytics_products(p_organization_id, p_start, p_end) x
  group by x.supplier_id, x.supplier_name
$$;

-- Estoque por produto na data p_as_of.
--
--   posição          última posição importada até p_as_of (a importação mais
--                    recente vale quando há duas na mesma data)
--   custo unitário   o da posição; sem ele, o custo atual do cadastro
--   capital          max(quantidade, 0) × custo unitário
--   janela           últimos velocity_window_days dias até p_as_of, limitada
--                    ao início do histórico de vendas
--   venda média/dia  unidades líquidas na janela ÷ dias da janela
--   cobertura (dias) estoque ÷ venda média/dia
--   giro anual       365 ÷ cobertura (equivalente a vendas anualizadas ÷ estoque)
--
-- Classificação, nesta ordem:
--   rupture            sem estoque e com vendas na janela
--   no-stock           sem estoque e sem vendas na janela
--   insufficient-data  menos de 14 dias de histórico de vendas
--   stalled            sem venda há stalled_days dias ou mais
--   rupture-risk       cobertura menor que o prazo de reposição
--   high-turnover      cobertura ≤ high_turnover_days
--   medium-turnover    cobertura ≤ low_turnover_days
--   low-turnover       acima disso, ou vendas líquidas ≤ 0 na janela
create function public.inventory_position(p_organization_id uuid, p_as_of date)
returns table (
  product_id uuid,
  sku text,
  product_name text,
  category_id uuid,
  category_name text,
  supplier_id uuid,
  supplier_name text,
  perishable boolean,
  snapshot_date date,
  snapshot_age_days integer,
  on_hand numeric,
  unit_cost numeric,
  cost_source text,
  stock_value numeric,
  window_start date,
  window_days integer,
  history_days integer,
  units_window numeric,
  avg_daily_units numeric,
  coverage_days numeric,
  annual_turnover numeric,
  last_sale_date date,
  days_since_last_sale integer,
  lead_time_days integer,
  stock_status text
)
language sql
stable
set search_path = ''
as $$
  with params as (
    select * from public.analysis_parameters(p_organization_id)
  ),
  history as (
    select min(d.period_start) as first_sale
    from public.data_imports d
    where d.organization_id = p_organization_id and d.dataset = 'sales' and d.status in ('completed', 'with_errors')
  ),
  bounds as (
    select
      greatest(p_as_of - pr.velocity_window_days + 1, h.first_sale) as window_start,
      case when h.first_sale <= p_as_of then p_as_of - h.first_sale + 1 end as history_days
    from params pr, history h
  ),
  snap as (
    select distinct on (s.product_id) s.product_id, s.snapshot_date, s.quantity, s.unit_cost, s.cost_source
    from public.inventory_snapshots s
    where s.organization_id = p_organization_id
      and s.snapshot_date <= p_as_of
      and s.import_id in (select private.active_import_ids(p_organization_id))
    order by s.product_id, s.snapshot_date desc, s.created_at desc, s.id desc
  ),
  movement as (
    select i.product_id,
      coalesce(sum(i.quantity) filter (where i.kind = 'sale'), 0)
        - coalesce(sum(i.quantity) filter (where i.kind = 'return'), 0) as units
    from public.sale_items i, bounds b
    where i.organization_id = p_organization_id
      and i.sold_at between b.window_start and p_as_of
      and i.import_id in (select private.active_import_ids(p_organization_id))
    group by i.product_id
  ),
  base as (
    select
      sn.product_id,
      p.sku,
      p.name,
      p.category_id,
      c.name as category_name,
      p.supplier_id,
      su.name as supplier_name,
      p.perishable,
      sn.snapshot_date,
      p_as_of - sn.snapshot_date as snapshot_age_days,
      sn.quantity as on_hand,
      coalesce(sn.unit_cost, p.current_cost) as unit_cost,
      case when sn.unit_cost is not null then sn.cost_source when p.current_cost is not null then 'catalog' else 'none' end as cost_source,
      b.window_start,
      case when b.window_start <= p_as_of then p_as_of - b.window_start + 1 end as window_days,
      b.history_days,
      coalesce(m.units, 0) as units_window,
      ls.last_sale_date,
      coalesce(p.lead_time_days, su.lead_time_days, pr.default_lead_time_days) as lead_time_days,
      pr.stalled_days,
      pr.high_turnover_days,
      pr.low_turnover_days
    from snap sn
    join public.products p on p.id = sn.product_id
    left join public.categories c on c.id = p.category_id
    left join public.suppliers su on su.id = p.supplier_id
    left join movement m on m.product_id = sn.product_id
    cross join bounds b
    cross join params pr
    left join lateral (
      select max(i.sold_at) as last_sale_date
      from public.sale_items i
      where i.organization_id = p_organization_id
        and i.product_id = sn.product_id
        and i.kind = 'sale'
        and i.sold_at <= p_as_of
        and i.import_id in (select private.active_import_ids(p_organization_id))
    ) ls on true
  ),
  measured as (
    select
      b.*,
      case when b.window_days > 0 then greatest(b.units_window, 0) / b.window_days end as avg_daily_units
    from base b
  ),
  covered as (
    select
      m.*,
      case when m.avg_daily_units > 0 then greatest(m.on_hand, 0) / m.avg_daily_units end as coverage_days
    from measured m
  )
  select
    x.product_id,
    x.sku,
    x.name,
    x.category_id,
    x.category_name,
    x.supplier_id,
    x.supplier_name,
    x.perishable,
    x.snapshot_date,
    x.snapshot_age_days,
    x.on_hand,
    x.unit_cost,
    x.cost_source,
    greatest(x.on_hand, 0) * x.unit_cost,
    x.window_start,
    x.window_days,
    x.history_days,
    x.units_window,
    x.avg_daily_units,
    x.coverage_days,
    case when x.coverage_days > 0 then 365 / x.coverage_days end,
    x.last_sale_date,
    p_as_of - x.last_sale_date,
    x.lead_time_days,
    case
      when x.on_hand <= 0 and x.units_window > 0 then 'rupture'
      when x.on_hand <= 0 then 'no-stock'
      when x.history_days is null or x.history_days < 14 then 'insufficient-data'
      when (x.last_sale_date is null and x.history_days >= x.stalled_days)
        or (p_as_of - x.last_sale_date >= x.stalled_days) then 'stalled'
      when x.last_sale_date is null then 'insufficient-data'
      when x.coverage_days is null then 'low-turnover'
      when x.coverage_days < x.lead_time_days then 'rupture-risk'
      when x.coverage_days <= x.high_turnover_days then 'high-turnover'
      when x.coverage_days <= x.low_turnover_days then 'medium-turnover'
      else 'low-turnover'
    end
  from covered x
$$;

-- Resumo do estoque: totais, por classe e o giro agregado (CMV anualizado da
-- janela ÷ capital em estoque).
create function public.inventory_summary(p_organization_id uuid, p_as_of date)
returns table (
  products bigint,
  stock_value numeric,
  uncosted_products bigint,
  last_snapshot date,
  oldest_snapshot date,
  window_days integer,
  window_cogs numeric,
  annual_turnover numeric,
  sold_without_position bigint,
  by_status jsonb
)
language sql
stable
set search_path = ''
as $$
  with positions as (
    select * from public.inventory_position(p_organization_id, p_as_of)
  ),
  window_bounds as (
    select min(p.window_start) as window_start, max(p.window_days) as window_days from positions p
  ),
  window_cost as (
    select
      coalesce(sum(i.cost_amount) filter (where i.kind = 'sale'), 0)
        - coalesce(sum(i.cost_amount) filter (where i.kind = 'return'), 0) as cogs
    from public.sale_items i, window_bounds w
    where i.organization_id = p_organization_id
      and i.sold_at between w.window_start and p_as_of
      and i.product_id in (select p.product_id from positions p where p.unit_cost is not null)
      and i.import_id in (select private.active_import_ids(p_organization_id))
  ),
  statuses as (
    select p.stock_status, count(*) as products, coalesce(sum(p.stock_value), 0) as value
    from positions p
    group by p.stock_status
  )
  select
    (select count(*) from positions),
    (select coalesce(sum(p.stock_value), 0) from positions p),
    (select count(*) from positions p where p.unit_cost is null and p.on_hand > 0),
    (select max(p.snapshot_date) from positions p),
    (select min(p.snapshot_date) from positions p),
    w.window_days,
    wc.cogs,
    case
      when w.window_days > 0 and (select sum(p.stock_value) from positions p) > 0
        then wc.cogs * 365 / w.window_days / (select sum(p.stock_value) from positions p)
    end,
    (
      select count(distinct i.product_id)
      from public.sale_items i, window_bounds wb
      where i.organization_id = p_organization_id
        and i.sold_at between wb.window_start and p_as_of
        and i.import_id in (select private.active_import_ids(p_organization_id))
        and not exists (select 1 from positions p where p.product_id = i.product_id)
    ),
    coalesce((select jsonb_agg(jsonb_build_object('status', s.stock_status, 'products', s.products, 'value', s.value)) from statuses s), '[]'::jsonb)
  from window_bounds w, window_cost wc
$$;

revoke all on function
  public.analysis_parameters(uuid),
  public.analytics_coverage(uuid),
  public.analytics_summary(uuid, date, date),
  public.analytics_daily(uuid, date, date),
  public.analytics_products(uuid, date, date),
  public.analytics_categories(uuid, date, date),
  public.analytics_suppliers(uuid, date, date),
  public.inventory_position(uuid, date),
  public.inventory_summary(uuid, date)
from public, anon;
grant execute on function
  public.analysis_parameters(uuid),
  public.analytics_coverage(uuid),
  public.analytics_summary(uuid, date, date),
  public.analytics_daily(uuid, date, date),
  public.analytics_products(uuid, date, date),
  public.analytics_categories(uuid, date, date),
  public.analytics_suppliers(uuid, date, date),
  public.inventory_position(uuid, date),
  public.inventory_summary(uuid, date)
to authenticated, service_role;

-- SOLUS · Parte 04 · 4/6 — Gravação, cancelamento e reversão das importações
--
-- Continuação de analytics_ingestion: depois da validação, o usuário
-- confirma (start_import) e o servidor grava lote a lote
-- (commit_import_batch) até concluir (finalize_import). Uma importação pode
-- ser cancelada antes de concluir e, se for de vendas ou estoque, desfeita
-- depois.

-- ---------------------------------------------------------------------------
-- Confirmação e gravação
-- ---------------------------------------------------------------------------

create function public.start_import(p_import_id uuid, p_duplicate_policy text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.data_imports;
  policy text;
begin
  target := private.lock_import(p_import_id, 'analyst');
  if target.status <> 'validated' then
    raise exception 'solus:invalid_import_state' using errcode = 'P0001';
  end if;

  policy := case target.dataset
    when 'sales' then case when p_duplicate_policy in ('skip', 'keep') then p_duplicate_policy end
    when 'inventory' then case when p_duplicate_policy in ('skip', 'replace') then p_duplicate_policy end
    else 'update'
  end;
  if policy is null then
    raise exception 'solus:invalid_duplicate_policy' using errcode = '22023';
  end if;

  perform private.lock_organization_imports(target.organization_id);
  if exists (
    select 1 from public.data_imports d
    where d.organization_id = target.organization_id and d.status = 'processing' and d.id <> target.id
  ) then
    raise exception 'solus:import_in_progress' using errcode = 'P0001';
  end if;

  update public.data_imports
  set status = 'processing', started_at = now(), duplicate_policy = policy
  where id = target.id;
end
$$;

-- Cria, sem cadastro completo, os produtos citados por vendas ou estoque que
-- ainda não existem (o nome vem do arquivo, ou o próprio SKU).
create function private.ensure_products(target public.data_imports, p_batch_index integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.products (organization_id, sku, sku_key, name, catalog_complete, created_import_id, updated_import_id)
  select distinct on (r.data ->> 'sku_key')
    target.organization_id, r.data ->> 'sku', r.data ->> 'sku_key',
    left(coalesce(r.data ->> 'product_name', r.data ->> 'sku'), 200), false, target.id, target.id
  from private.import_rows r
  where r.import_id = target.id and r.batch_index = p_batch_index
  order by r.data ->> 'sku_key', r.row_number
  on conflict (organization_id, sku_key) do nothing
$$;

create function public.commit_import_batch(p_import_id uuid, p_batch_index integer)
returns table (inserted_rows integer, skipped_rows integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.data_imports;
  batch public.import_batches;
  inserted integer := 0;
begin
  target := private.lock_import(p_import_id, 'analyst');
  perform private.lock_organization_imports(target.organization_id);
  if target.status <> 'processing' then
    raise exception 'solus:invalid_import_state' using errcode = 'P0001';
  end if;

  select * into batch from public.import_batches b where b.import_id = target.id and b.batch_index = p_batch_index for update;
  if not found then
    raise exception 'solus:invalid_batch' using errcode = '22023';
  end if;
  if batch.committed_at is not null then
    inserted_rows := batch.inserted_count;
    skipped_rows := batch.skipped_count;
    return next;
    return;
  end if;

  if target.dataset = 'sales' then
    -- Reavalia contra o que foi concluído desde a validação.
    perform private.classify_sales(target.id, p_batch_index);
    perform private.ensure_products(target, p_batch_index);

    insert into public.sales (organization_id, external_id, sold_at, channel, import_id)
    select target.organization_id, r.data ->> 'order_id', min((r.data ->> 'sold_at')::date),
      (array_agg(r.data ->> 'channel' order by r.row_number) filter (where r.data ->> 'channel' is not null))[1],
      target.id
    from private.import_rows r
    where r.import_id = target.id and r.batch_index = p_batch_index and r.data ->> 'order_id' is not null
      and (r.duplicate is null or (r.duplicate = 'possible' and target.duplicate_policy = 'keep'))
    group by r.data ->> 'order_id'
    on conflict (organization_id, external_id) do nothing;

    insert into public.sale_items (
      organization_id, import_id, row_number, sale_id, order_ref, product_id, sold_at, kind,
      quantity, unit_price, discount, unit_cost, cost_source, channel, fingerprint
    )
    select target.organization_id, target.id, r.row_number, s.id, r.data ->> 'order_id', p.id,
      (r.data ->> 'sold_at')::date, (r.data ->> 'kind')::public.sale_line_kind,
      (r.data ->> 'quantity')::numeric, (r.data ->> 'unit_price')::numeric, (r.data ->> 'discount')::numeric,
      coalesce((r.data ->> 'unit_cost')::numeric, p.current_cost),
      case
        when r.data ->> 'unit_cost' is not null then 'file'
        when p.current_cost is not null then 'catalog'
        else 'none'
      end,
      r.data ->> 'channel', r.fingerprint
    from private.import_rows r
    join public.products p on p.organization_id = target.organization_id and p.sku_key = r.data ->> 'sku_key'
    left join public.sales s on s.organization_id = target.organization_id and s.external_id = r.data ->> 'order_id'
    where r.import_id = target.id and r.batch_index = p_batch_index
      and (r.duplicate is null or (r.duplicate = 'possible' and target.duplicate_policy = 'keep'));
    get diagnostics inserted = row_count;

  elsif target.dataset = 'inventory' then
    perform private.classify_inventory(target.id, p_batch_index);
    perform private.ensure_products(target, p_batch_index);

    -- O mesmo produto e data repetidos no arquivo (inclusive em lotes
    -- diferentes) têm as quantidades somadas.
    insert into public.inventory_snapshots (
      organization_id, import_id, row_number, product_id, snapshot_date, quantity, unit_cost, cost_source
    )
    select target.organization_id, target.id, min(r.row_number), p.id, (r.data ->> 'snapshot_date')::date,
      sum((r.data ->> 'quantity')::numeric),
      coalesce(round(avg((r.data ->> 'unit_cost')::numeric), 4), p.current_cost),
      case
        when count(r.data ->> 'unit_cost') > 0 then 'file'
        when p.current_cost is not null then 'catalog'
        else 'none'
      end
    from private.import_rows r
    join public.products p on p.organization_id = target.organization_id and p.sku_key = r.data ->> 'sku_key'
    where r.import_id = target.id and r.batch_index = p_batch_index
      and (r.duplicate is null or target.duplicate_policy = 'replace')
    group by p.id, p.current_cost, (r.data ->> 'snapshot_date')::date
    on conflict (import_id, product_id, snapshot_date) do update
    set quantity = public.inventory_snapshots.quantity + excluded.quantity,
        row_number = least(public.inventory_snapshots.row_number, excluded.row_number);

    select count(*) into inserted
    from private.import_rows r
    where r.import_id = target.id and r.batch_index = p_batch_index
      and (r.duplicate is null or target.duplicate_policy = 'replace');

  elsif target.dataset = 'products' then
    insert into public.categories (organization_id, name, name_key, source_import_id)
    select distinct on (r.data ->> 'category_key') target.organization_id, r.data ->> 'category', r.data ->> 'category_key', target.id
    from private.import_rows r
    where r.import_id = target.id and r.batch_index = p_batch_index and r.data ->> 'category_key' is not null
    order by r.data ->> 'category_key', r.row_number
    on conflict (organization_id, name_key) do nothing;

    insert into public.suppliers (organization_id, name, name_key, source_import_id)
    select distinct on (r.data ->> 'supplier_key') target.organization_id, r.data ->> 'supplier', r.data ->> 'supplier_key', target.id
    from private.import_rows r
    where r.import_id = target.id and r.batch_index = p_batch_index and r.data ->> 'supplier_key' is not null
    order by r.data ->> 'supplier_key', r.row_number
    on conflict (organization_id, name_key) do nothing;

    -- Campos vazios no arquivo não apagam o que já existe. A última linha de
    -- um SKU repetido vale.
    with latest as (
      select distinct on (r.data ->> 'sku_key') r.data
      from private.import_rows r
      where r.import_id = target.id and r.batch_index = p_batch_index
      order by r.data ->> 'sku_key', r.row_number desc
    )
    update public.products p
    set sku = l.data ->> 'sku',
        name = l.data ->> 'name',
        category_id = coalesce(c.id, p.category_id),
        supplier_id = coalesce(s.id, p.supplier_id),
        unit = coalesce(l.data ->> 'unit', p.unit),
        current_cost = coalesce((l.data ->> 'cost')::numeric, p.current_cost),
        current_price = coalesce((l.data ->> 'price')::numeric, p.current_price),
        lead_time_days = coalesce((l.data ->> 'lead_time_days')::integer, p.lead_time_days),
        perishable = coalesce((l.data ->> 'perishable')::boolean, p.perishable),
        active = coalesce((l.data ->> 'active')::boolean, p.active),
        catalog_complete = true,
        updated_import_id = target.id
    from latest l
    left join public.categories c on c.organization_id = target.organization_id and c.name_key = l.data ->> 'category_key'
    left join public.suppliers s on s.organization_id = target.organization_id and s.name_key = l.data ->> 'supplier_key'
    where p.organization_id = target.organization_id and p.sku_key = l.data ->> 'sku_key';
    get diagnostics inserted = row_count;

    with latest as (
      select distinct on (r.data ->> 'sku_key') r.data
      from private.import_rows r
      where r.import_id = target.id and r.batch_index = p_batch_index
      order by r.data ->> 'sku_key', r.row_number desc
    ), created as (
      insert into public.products (
        organization_id, sku, sku_key, name, category_id, supplier_id, unit, current_cost, current_price,
        lead_time_days, perishable, active, catalog_complete, created_import_id, updated_import_id
      )
      select target.organization_id, l.data ->> 'sku', l.data ->> 'sku_key', l.data ->> 'name', c.id, s.id,
        l.data ->> 'unit', (l.data ->> 'cost')::numeric, (l.data ->> 'price')::numeric,
        (l.data ->> 'lead_time_days')::integer, (l.data ->> 'perishable')::boolean,
        coalesce((l.data ->> 'active')::boolean, true), true, target.id, target.id
      from latest l
      left join public.categories c on c.organization_id = target.organization_id and c.name_key = l.data ->> 'category_key'
      left join public.suppliers s on s.organization_id = target.organization_id and s.name_key = l.data ->> 'supplier_key'
      on conflict (organization_id, sku_key) do nothing
      returning 1
    )
    select inserted + count(*) into inserted from created;

  else -- suppliers
    with latest as (
      select distinct on (r.data ->> 'name_key') r.data
      from private.import_rows r
      where r.import_id = target.id and r.batch_index = p_batch_index
      order by r.data ->> 'name_key', r.row_number desc
    )
    update public.suppliers s
    set name = l.data ->> 'name',
        code = coalesce(l.data ->> 'code', s.code),
        lead_time_days = coalesce((l.data ->> 'lead_time_days')::integer, s.lead_time_days)
    from latest l
    where s.organization_id = target.organization_id and s.name_key = l.data ->> 'name_key';
    get diagnostics inserted = row_count;

    with latest as (
      select distinct on (r.data ->> 'name_key') r.data
      from private.import_rows r
      where r.import_id = target.id and r.batch_index = p_batch_index
      order by r.data ->> 'name_key', r.row_number desc
    ), created as (
      insert into public.suppliers (organization_id, name, name_key, code, lead_time_days, source_import_id)
      select target.organization_id, l.data ->> 'name', l.data ->> 'name_key', l.data ->> 'code',
        (l.data ->> 'lead_time_days')::integer, target.id
      from latest l
      on conflict (organization_id, name_key) do nothing
      returning 1
    )
    select inserted + count(*) into inserted from created;
  end if;

  update public.import_batches
  set committed_at = now(), inserted_count = inserted, skipped_count = greatest(batch.row_count - inserted, 0)
  where import_id = target.id and batch_index = p_batch_index;

  inserted_rows := inserted;
  skipped_rows := greatest(batch.row_count - inserted, 0);
  return next;
end
$$;

create function public.finalize_import(p_import_id uuid)
returns table (final_status public.import_status, inserted_rows integer, skipped_rows integer, rejected_rows integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.data_imports;
  inserted integer;
  skipped integer;
  first_date date;
  last_date date;
  next_status public.import_status;
begin
  target := private.lock_import(p_import_id, 'analyst');
  if target.status <> 'processing' then
    raise exception 'solus:invalid_import_state' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.import_batches b where b.import_id = target.id and b.committed_at is null) then
    raise exception 'solus:batches_pending' using errcode = 'P0001';
  end if;

  select coalesce(sum(b.inserted_count), 0), coalesce(sum(b.skipped_count), 0)
  into inserted, skipped
  from public.import_batches b where b.import_id = target.id;

  if target.dataset = 'sales' then
    select min(i.sold_at), max(i.sold_at) into first_date, last_date from public.sale_items i where i.import_id = target.id;
  elsif target.dataset = 'inventory' then
    select min(i.snapshot_date), max(i.snapshot_date) into first_date, last_date from public.inventory_snapshots i where i.import_id = target.id;
  else
    first_date := null;
    last_date := null;
  end if;

  next_status := case when target.error_count > 0 then 'with_errors' else 'completed' end;

  delete from private.import_rows r where r.import_id = target.id;

  update public.data_imports
  set status = next_status,
      record_count = inserted,
      skipped_rows = skipped,
      completed_at = now(),
      period_start = coalesce(first_date, period_start),
      period_end = coalesce(last_date, period_end)
  where id = target.id;

  final_status := next_status;
  inserted_rows := inserted;
  skipped_rows := skipped;
  rejected_rows := target.error_count;
  return next;
end
$$;

-- ---------------------------------------------------------------------------
-- Cancelar e desfazer
-- ---------------------------------------------------------------------------

-- Remove os fatos gravados por uma importação e o que ficou órfão por causa
-- dela (documentos de venda sem itens, produtos criados sem cadastro e que
-- não são mais citados).
create function private.remove_import_facts(target public.data_imports)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer := 0;
  snapshots integer := 0;
begin
  delete from public.sale_items i where i.import_id = target.id;
  get diagnostics removed = row_count;

  -- Documentos criados por esta importação que ainda têm itens de outras
  -- passam a apontar para a importação mais antiga entre elas.
  update public.sales s
  set import_id = x.import_id
  from (
    select distinct on (i.sale_id) i.sale_id, i.import_id
    from public.sale_items i
    join public.sales o on o.id = i.sale_id
    where o.organization_id = target.organization_id and o.import_id = target.id
    order by i.sale_id, i.id
  ) x
  where s.id = x.sale_id;

  delete from public.sales s
  where s.organization_id = target.organization_id and s.import_id = target.id;

  delete from public.inventory_snapshots i where i.import_id = target.id;
  get diagnostics snapshots = row_count;

  delete from public.products p
  where p.organization_id = target.organization_id
    and p.created_import_id = target.id
    and not p.catalog_complete
    and not exists (select 1 from public.sale_items i where i.organization_id = p.organization_id and i.product_id = p.id)
    and not exists (select 1 from public.inventory_snapshots s where s.organization_id = p.organization_id and s.product_id = p.id);

  return removed + snapshots;
end
$$;

create function public.cancel_import(p_import_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.data_imports;
begin
  target := private.lock_import(p_import_id, 'analyst');
  if target.status not in ('pending', 'validated', 'processing', 'failed') then
    raise exception 'solus:invalid_import_state' using errcode = 'P0001';
  end if;

  perform private.lock_organization_imports(target.organization_id);
  if target.status = 'processing' then
    perform private.remove_import_facts(target);
  end if;
  delete from private.import_rows r where r.import_id = target.id;

  update public.data_imports set status = 'canceled' where id = target.id;
end
$$;

-- Desfaz uma importação concluída de vendas ou estoque. Cadastros (produtos e
-- fornecedores) não são desfeitos: corrigem-se importando o arquivo certo.
create function public.revert_import(p_import_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.data_imports;
  removed integer;
begin
  target := private.lock_import(p_import_id, 'analyst');
  if target.status not in ('completed', 'with_errors') then
    raise exception 'solus:invalid_import_state' using errcode = 'P0001';
  end if;
  if target.dataset not in ('sales', 'inventory') then
    raise exception 'solus:import_not_revertable' using errcode = 'P0001';
  end if;

  perform private.lock_organization_imports(target.organization_id);
  removed := private.remove_import_facts(target);

  update public.data_imports
  set status = 'reverted', reverted_at = now(), reverted_by = (select auth.uid())
  where id = target.id;

  return removed;
end
$$;

-- ---------------------------------------------------------------------------
-- Parâmetros das análises
-- ---------------------------------------------------------------------------

create function public.save_analysis_settings(p_organization_id uuid, p_settings jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
begin
  actor := private.require_member(p_organization_id, 'admin');
  if jsonb_typeof(p_settings) is distinct from 'object' then
    raise exception 'solus:invalid_settings' using errcode = '22023';
  end if;

  insert into public.analysis_settings (organization_id) values (p_organization_id)
  on conflict (organization_id) do nothing;

  begin
    update public.analysis_settings s
    set min_margin = coalesce((p_settings ->> 'min_margin')::numeric, s.min_margin),
        max_discount_rate = coalesce((p_settings ->> 'max_discount_rate')::numeric, s.max_discount_rate),
        stalled_days = coalesce((p_settings ->> 'stalled_days')::integer, s.stalled_days),
        velocity_window_days = coalesce((p_settings ->> 'velocity_window_days')::integer, s.velocity_window_days),
        default_lead_time_days = coalesce((p_settings ->> 'default_lead_time_days')::integer, s.default_lead_time_days),
        high_turnover_days = coalesce((p_settings ->> 'high_turnover_days')::integer, s.high_turnover_days),
        low_turnover_days = coalesce((p_settings ->> 'low_turnover_days')::integer, s.low_turnover_days),
        excess_coverage_days = coalesce((p_settings ->> 'excess_coverage_days')::integer, s.excess_coverage_days),
        target_coverage_days = coalesce((p_settings ->> 'target_coverage_days')::integer, s.target_coverage_days),
        drop_threshold = coalesce((p_settings ->> 'drop_threshold')::numeric, s.drop_threshold),
        updated_by = actor
    where s.organization_id = p_organization_id;
  exception
    when check_violation or invalid_text_representation or numeric_value_out_of_range then
      raise exception 'solus:invalid_settings' using errcode = '22023';
  end;
end
$$;

-- ---------------------------------------------------------------------------
-- Privilégios de execução
-- ---------------------------------------------------------------------------

revoke all on function
  private.ensure_products(public.data_imports, integer),
  private.remove_import_facts(public.data_imports)
from public, anon, authenticated;

revoke all on function
  public.start_import(uuid, text),
  public.commit_import_batch(uuid, integer),
  public.finalize_import(uuid),
  public.cancel_import(uuid),
  public.revert_import(uuid),
  public.save_analysis_settings(uuid, jsonb)
from public, anon;
grant execute on function
  public.start_import(uuid, text),
  public.commit_import_batch(uuid, integer),
  public.finalize_import(uuid),
  public.cancel_import(uuid),
  public.revert_import(uuid),
  public.save_analysis_settings(uuid, jsonb)
to authenticated;

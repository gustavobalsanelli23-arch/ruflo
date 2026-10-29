-- SOLUS · Parte 04 · 6/6 — Persistência das oportunidades
--
-- O Intelligence Engine roda no servidor da aplicação (TypeScript,
-- determinístico) sobre as funções de métricas. O resultado é gravado por
-- public.sync_opportunities(), que só a chave secreta (service_role) executa:
-- nenhum navegador consegue criar ou editar o conteúdo de uma oportunidade.
-- O servidor confere o papel do usuário antes; o banco confere de novo.
--
-- Regras de cada execução:
--   * a chave (tipo + entidade) identifica a oportunidade: a mesma condição
--     detectada de novo atualiza a existente, nunca cria outra;
--   * resolvida e detectada de novo: volta para "nova" (evento redetected);
--   * descartada pelo usuário: continua descartada, só os fatos são
--     atualizados;
--   * nova e não detectada mais: resolvida pelo sistema (auto_resolved);
--   * em análise ou em andamento e não detectada mais: o status é do usuário;
--     ela só deixa de estar ativa (active = false).

-- Itens enviados pelo motor, já tipados.
create function private.opportunity_items(p_items jsonb)
returns table (
  type public.opportunity_type,
  dedupe_key text,
  entity_type text,
  entity_id uuid,
  entity_label text,
  title text,
  summary text,
  priority public.opportunity_priority,
  confidence numeric,
  impact_value numeric,
  impact_kind public.impact_kind,
  impact_method text,
  facts jsonb,
  hypotheses jsonb,
  recommendations jsonb,
  series jsonb,
  period_start date,
  period_end date
)
language sql
immutable
set search_path = ''
as $$
  select * from jsonb_to_recordset(p_items) as x(
    type public.opportunity_type,
    dedupe_key text,
    entity_type text,
    entity_id uuid,
    entity_label text,
    title text,
    summary text,
    priority public.opportunity_priority,
    confidence numeric,
    impact_value numeric,
    impact_kind public.impact_kind,
    impact_method text,
    facts jsonb,
    hypotheses jsonb,
    recommendations jsonb,
    series jsonb,
    period_start date,
    period_end date
  )
$$;

create function public.sync_opportunities(
  p_organization_id uuid,
  p_actor uuid,
  p_trigger text,
  p_import_id uuid,
  p_engine_version text,
  p_period_start date,
  p_period_end date,
  p_limitations jsonb,
  p_items jsonb
)
returns table (
  run_id uuid,
  detected integer,
  created integer,
  updated integer,
  reopened integer,
  resolved integer
)
language plpgsql
set search_path = ''
as $$
declare
  new_run uuid;
  total integer;
  created_total integer := 0;
  updated_total integer := 0;
  reopened_total integer := 0;
  resolved_total integer := 0;
begin
  if p_actor is null or not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = p_actor
      and private.org_role_rank(m.role) >= private.org_role_rank('analyst')
  ) then
    raise exception 'solus:forbidden' using errcode = '42501';
  end if;
  -- Duas análises simultâneas da mesma organização: uma espera a outra.
  perform pg_advisory_xact_lock(hashtextextended('solus:opportunities:' || p_organization_id::text, 0));

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 1000
    or jsonb_typeof(p_limitations) is distinct from 'array' then
    raise exception 'solus:invalid_opportunities' using errcode = '22023';
  end if;

  total := (select count(*) from private.opportunity_items(p_items));

  if (select count(distinct i.dedupe_key) from private.opportunity_items(p_items) i) <> total
    or exists (
      select 1 from private.opportunity_items(p_items) i
      where i.type is null or i.priority is null or i.impact_kind is null
        or i.dedupe_key is null or i.dedupe_key not like i.type::text || ':%'
        or i.facts is null or jsonb_typeof(i.facts) <> 'array' or jsonb_array_length(i.facts) = 0
        -- a entidade precisa ser desta organização
        or (i.entity_type = 'product' and not exists (
          select 1 from public.products p where p.organization_id = p_organization_id and p.id = i.entity_id))
        or (i.entity_type = 'category' and not exists (
          select 1 from public.categories c where c.organization_id = p_organization_id and c.id = i.entity_id))
        or (i.entity_type = 'supplier' and not exists (
          select 1 from public.suppliers s where s.organization_id = p_organization_id and s.id = i.entity_id))
        or (i.entity_type = 'organization' and i.entity_id is not null)
    ) then
    raise exception 'solus:invalid_opportunities' using errcode = '22023';
  end if;

  begin
    insert into public.analysis_runs (
      organization_id, trigger, import_id, triggered_by, engine_version, period_start, period_end, detected_count, limitations
    )
    values (p_organization_id, p_trigger, p_import_id, p_actor, p_engine_version, p_period_start, p_period_end, total, p_limitations)
    returning id into new_run;

    -- Detectadas de novo e abertas (ou descartadas): atualiza os fatos.
    update public.opportunities o
    set title = i.title, summary = i.summary, entity_label = i.entity_label, priority = i.priority,
        confidence = i.confidence, impact_value = i.impact_value, impact_kind = i.impact_kind,
        impact_method = i.impact_method, facts = i.facts, hypotheses = coalesce(i.hypotheses, '[]'::jsonb),
        recommendations = coalesce(i.recommendations, '[]'::jsonb), series = i.series,
        period_start = i.period_start, period_end = i.period_end,
        active = true, detected_count = o.detected_count + 1, last_detected_at = now(), last_run_id = new_run
    from private.opportunity_items(p_items) i
    where o.organization_id = p_organization_id and o.dedupe_key = i.dedupe_key
      and o.status in ('new', 'reviewing', 'in_progress', 'dismissed');
    get diagnostics updated_total = row_count;

    -- Resolvidas que voltaram a acontecer: reabertas.
    with reopened_rows as (
      update public.opportunities o
      set title = i.title, summary = i.summary, entity_label = i.entity_label, priority = i.priority,
          confidence = i.confidence, impact_value = i.impact_value, impact_kind = i.impact_kind,
          impact_method = i.impact_method, facts = i.facts, hypotheses = coalesce(i.hypotheses, '[]'::jsonb),
          recommendations = coalesce(i.recommendations, '[]'::jsonb), series = i.series,
          period_start = i.period_start, period_end = i.period_end,
          status = 'new', status_changed_at = now(), status_changed_by = null,
          active = true, detected_count = o.detected_count + 1, last_detected_at = now(), last_run_id = new_run
      from private.opportunity_items(p_items) i
      where o.organization_id = p_organization_id and o.dedupe_key = i.dedupe_key and o.status = 'resolved'
      returning o.id
    )
    insert into public.opportunity_events (organization_id, opportunity_id, event, from_status, to_status, run_id)
    select p_organization_id, r.id, 'redetected', 'resolved', 'new', new_run from reopened_rows r;
    get diagnostics reopened_total = row_count;

    -- Novas.
    with created_rows as (
      insert into public.opportunities (
        organization_id, type, dedupe_key, entity_type, entity_id, entity_label, title, summary, priority,
        confidence, impact_value, impact_kind, impact_method, facts, hypotheses, recommendations, series,
        period_start, period_end, last_run_id
      )
      select p_organization_id, i.type, i.dedupe_key, i.entity_type, i.entity_id, i.entity_label, i.title, i.summary,
        i.priority, i.confidence, i.impact_value, i.impact_kind, i.impact_method, i.facts,
        coalesce(i.hypotheses, '[]'::jsonb), coalesce(i.recommendations, '[]'::jsonb), i.series,
        i.period_start, i.period_end, new_run
      from private.opportunity_items(p_items) i
      where not exists (
        select 1 from public.opportunities o where o.organization_id = p_organization_id and o.dedupe_key = i.dedupe_key
      )
      returning id
    )
    insert into public.opportunity_events (organization_id, opportunity_id, event, to_status, run_id)
    select p_organization_id, c.id, 'detected', 'new', new_run from created_rows c;
    get diagnostics created_total = row_count;

    -- Não detectadas nesta execução.
    with stale as (
      update public.opportunities o
      set active = false,
          status = case when prev.status = 'new' then 'resolved'::public.opportunity_status else o.status end,
          status_changed_at = case when prev.status = 'new' then now() else o.status_changed_at end,
          status_changed_by = case when prev.status = 'new' then null else o.status_changed_by end
      from (
        select p.id, p.status
        from public.opportunities p
        where p.organization_id = p_organization_id
          and p.active
          and not exists (select 1 from private.opportunity_items(p_items) i where i.dedupe_key = p.dedupe_key)
      ) prev
      where o.id = prev.id
      returning o.id, prev.status as previous_status
    )
    insert into public.opportunity_events (organization_id, opportunity_id, event, from_status, to_status, run_id, note)
    select p_organization_id, s.id, 'auto_resolved', 'new', 'resolved', new_run, 'Condição não detectada na análise mais recente.'
    from stale s
    where s.previous_status = 'new';
    get diagnostics resolved_total = row_count;
  exception
    when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range
      or string_data_right_truncation then
      raise exception 'solus:invalid_opportunities' using errcode = '22023';
  end;

  update public.analysis_runs
  set created_count = created_total, updated_count = updated_total,
      reopened_count = reopened_total, resolved_count = resolved_total
  where id = new_run;

  run_id := new_run;
  detected := total;
  created := created_total;
  updated := updated_total;
  reopened := reopened_total;
  resolved := resolved_total;
  return next;
end
$$;

-- Mudança de status pelo usuário (analyst ou superior), com nota opcional.
create function public.set_opportunity_status(p_opportunity_id uuid, p_status public.opportunity_status, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.opportunities;
  clean_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if actor is null then
    raise exception 'solus:not_authenticated' using errcode = '28000';
  end if;

  select * into target from public.opportunities o where o.id = p_opportunity_id for update;
  if not found or not exists (
    select 1 from public.organization_members m where m.organization_id = target.organization_id and m.user_id = actor
  ) then
    raise exception 'solus:opportunity_not_found' using errcode = 'P0002';
  end if;
  perform private.require_member(target.organization_id, 'analyst');

  if p_status is null then
    raise exception 'solus:invalid_status' using errcode = '22023';
  end if;
  if clean_note is not null and char_length(clean_note) > 500 then
    raise exception 'solus:invalid_note' using errcode = '22023';
  end if;
  if p_status = target.status and clean_note is null then
    return;
  end if;

  update public.opportunities
  set status = p_status, status_changed_at = now(), status_changed_by = actor
  where id = target.id;

  insert into public.opportunity_events (organization_id, opportunity_id, event, from_status, to_status, actor_id, note)
  values (target.organization_id, target.id, 'status_changed', target.status, p_status, actor, clean_note);
end
$$;

revoke all on function private.opportunity_items(jsonb) from public, anon, authenticated;
grant execute on function private.opportunity_items(jsonb) to service_role;
-- sync_opportunities roda como service_role e confere o papel de quem disparou.
grant execute on function private.org_role_rank(public.org_role) to service_role;

revoke all on function
  public.sync_opportunities(uuid, uuid, text, uuid, text, date, date, jsonb, jsonb),
  public.set_opportunity_status(uuid, public.opportunity_status, text)
from public, anon, authenticated;
grant execute on function public.sync_opportunities(uuid, uuid, text, uuid, text, date, date, jsonb, jsonb) to service_role;
grant execute on function public.set_opportunity_status(uuid, public.opportunity_status, text) to authenticated;

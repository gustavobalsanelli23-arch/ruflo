-- SOLUS · Parte 05 — Analista de IA: conversas, uso e resumos
--
-- O modelo roda no servidor da aplicação e lê os dados só pelas funções de
-- métricas, com a sessão da pessoa (RLS). Aqui ficam:
--
--   analyst_threads    conversas, visíveis só para quem as criou
--   analyst_messages   perguntas e respostas (com as consultas feitas e a
--                      checagem dos números), da mesma pessoa
--   ai_requests        cada chamada ao modelo: quem, quando, tokens e status.
--                      Criada e fechada só pelas funções abaixo, que aplicam
--                      os limites de uso
--   ai_summaries       resumo executivo da Visão geral por período, visível
--                      para toda a organização
--
-- Limites: 30 perguntas por pessoa por hora e 300 por organização por dia
-- (fuso de São Paulo). Usar o analista exige papel analyst ou superior.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.analyst_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null,
  opportunity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analyst_threads_org_id_key unique (organization_id, id),
  constraint analyst_threads_title check (char_length(title) between 1 and 200),
  constraint analyst_threads_opportunity_fkey foreign key (organization_id, opportunity_id)
    references public.opportunities (organization_id, id) on delete set null (opportunity_id)
);
create index analyst_threads_owner_idx on public.analyst_threads (organization_id, user_id, updated_at desc);
comment on table public.analyst_threads is 'Conversas com o analista de IA. Cada pessoa vê só as próprias.';

create table public.analyst_messages (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  thread_id uuid not null,
  role text not null,
  question text,
  answer jsonb,
  answer_text text,
  status text not null default 'answered',
  failure text,
  tool_calls jsonb not null default '[]'::jsonb,
  grounding jsonb,
  created_at timestamptz not null default now(),
  constraint analyst_messages_thread_fkey foreign key (organization_id, thread_id)
    references public.analyst_threads (organization_id, id) on delete cascade,
  constraint analyst_messages_role check (role in ('user', 'analyst')),
  constraint analyst_messages_status check (status in ('answered', 'partial', 'refused', 'failed')),
  constraint analyst_messages_question check (
    (role = 'user' and question is not null and char_length(question) between 1 and 2000 and answer is null)
    or (role = 'analyst' and question is null)
  ),
  constraint analyst_messages_answer check (answer is null or (jsonb_typeof(answer) = 'array' and pg_column_size(answer) <= 200000)),
  constraint analyst_messages_answer_text check (answer_text is null or char_length(answer_text) <= 8000),
  constraint analyst_messages_failure check (failure is null or char_length(failure) <= 500),
  constraint analyst_messages_tool_calls check (jsonb_typeof(tool_calls) = 'array' and pg_column_size(tool_calls) <= 20000),
  constraint analyst_messages_grounding check (grounding is null or (jsonb_typeof(grounding) = 'object' and pg_column_size(grounding) <= 20000))
);
create index analyst_messages_thread_idx on public.analyst_messages (thread_id, id);
comment on table public.analyst_messages is 'Perguntas e respostas do analista. answer guarda os blocos exibidos; tool_calls e grounding, as consultas e a checagem dos números.';

create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null,
  status text not null default 'started',
  model text,
  requests integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint ai_requests_kind check (kind in ('chat', 'summary')),
  constraint ai_requests_status check (status in ('started', 'answered', 'partial', 'refused', 'failed')),
  constraint ai_requests_model check (model is null or char_length(model) between 1 and 64),
  constraint ai_requests_counts check (
    requests between 0 and 50 and input_tokens >= 0 and output_tokens >= 0 and cache_read_tokens >= 0 and cache_write_tokens >= 0
  )
);
create index ai_requests_org_created_idx on public.ai_requests (organization_id, created_at);
comment on table public.ai_requests is 'Uso do modelo de IA por organização e pessoa. Só as funções begin/finish_ai_request escrevem aqui.';

create table public.ai_summaries (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_key text not null,
  data_signature text not null,
  content jsonb not null,
  model text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (organization_id, period_key),
  constraint ai_summaries_period check (period_key in ('7d', '30d', '90d', '12m', 'ytd')),
  constraint ai_summaries_signature check (char_length(data_signature) between 1 and 200),
  constraint ai_summaries_content check (jsonb_typeof(content) = 'array' and pg_column_size(content) <= 100000),
  constraint ai_summaries_model check (model is null or char_length(model) between 1 and 64)
);
comment on table public.ai_summaries is 'Resumo executivo gerado pela IA para a Visão geral, por período. data_signature identifica os dados usados.';

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------

revoke all on public.analyst_threads, public.analyst_messages, public.ai_requests, public.ai_summaries from anon, authenticated;
grant select, delete on public.analyst_threads to authenticated;
grant insert (organization_id, title, opportunity_id) on public.analyst_threads to authenticated;
grant update (title) on public.analyst_threads to authenticated;
grant select on public.analyst_messages to authenticated;
grant insert (organization_id, thread_id, role, question, answer, answer_text, status, failure, tool_calls, grounding)
  on public.analyst_messages to authenticated;
grant select on public.ai_requests, public.ai_summaries to authenticated;
grant all on public.analyst_threads, public.analyst_messages, public.ai_requests, public.ai_summaries to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.analyst_threads enable row level security;
alter table public.analyst_messages enable row level security;
alter table public.ai_requests enable row level security;
alter table public.ai_summaries enable row level security;

create policy analyst_threads_select_own on public.analyst_threads
  for select to authenticated
  using (user_id = (select auth.uid()) and organization_id in (select private.user_org_ids('analyst')));
create policy analyst_threads_insert_own on public.analyst_threads
  for insert to authenticated
  with check (user_id = (select auth.uid()) and organization_id in (select private.user_org_ids('analyst')));
create policy analyst_threads_update_own on public.analyst_threads
  for update to authenticated
  using (user_id = (select auth.uid()) and organization_id in (select private.user_org_ids('analyst')))
  with check (user_id = (select auth.uid()));
create policy analyst_threads_delete_own on public.analyst_threads
  for delete to authenticated
  using (user_id = (select auth.uid()) and organization_id in (select private.user_org_ids('analyst')));

create policy analyst_messages_select_own on public.analyst_messages
  for select to authenticated
  using (
    organization_id in (select private.user_org_ids('analyst'))
    and exists (select 1 from public.analyst_threads t where t.id = thread_id and t.user_id = (select auth.uid()))
  );
create policy analyst_messages_insert_own on public.analyst_messages
  for insert to authenticated
  with check (
    organization_id in (select private.user_org_ids('analyst'))
    and exists (
      select 1 from public.analyst_threads t
      where t.id = thread_id and t.organization_id = analyst_messages.organization_id and t.user_id = (select auth.uid())
    )
  );

-- Cada pessoa vê o próprio uso; owner e admin, o da organização.
create policy ai_requests_select on public.ai_requests
  for select to authenticated
  using (
    (user_id = (select auth.uid()) and organization_id in (select private.user_org_ids('analyst')))
    or organization_id in (select private.user_org_ids('admin'))
  );

create policy ai_summaries_select_member on public.ai_summaries
  for select to authenticated
  using (organization_id in (select private.user_org_ids('viewer')));

-- Nova mensagem atualiza a data da conversa (a pessoa não altera updated_at).
create function private.touch_analyst_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.analyst_threads set updated_at = now() where id = new.thread_id;
  return new;
end
$$;
revoke all on function private.touch_analyst_thread() from public, anon, authenticated;

create trigger analyst_messages_touch_thread
  after insert on public.analyst_messages
  for each row execute function private.touch_analyst_thread();

-- ---------------------------------------------------------------------------
-- Uso do modelo
-- ---------------------------------------------------------------------------

-- Registra o início de uma chamada ao modelo, aplicando os limites. O
-- servidor da aplicação chama antes de cada pergunta ou resumo.
create function public.begin_ai_request(p_organization_id uuid, p_kind text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_member(p_organization_id, 'analyst');
  day_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  used integer;
  request_id uuid;
begin
  if p_kind is null or p_kind not in ('chat', 'summary') then
    raise exception 'solus:invalid_ai_request' using errcode = '22023';
  end if;
  perform private.enforce_rate_limit('ai:user:' || actor::text, 30, 3600);

  -- Serializa por organização para o limite diário não ser ultrapassado em paralelo.
  perform pg_advisory_xact_lock(hashtextextended('ai:' || p_organization_id::text, 0));
  select count(*) into used from public.ai_requests r
  where r.organization_id = p_organization_id and r.created_at >= day_start;
  if used >= 300 then
    raise exception 'solus:ai_daily_limit' using errcode = 'P0001';
  end if;

  insert into public.ai_requests (organization_id, user_id, kind)
  values (p_organization_id, actor, p_kind)
  returning id into request_id;
  return request_id;
end
$$;

-- Fecha a chamada com o resultado e o consumo informados pelo servidor.
create function public.finish_ai_request(
  p_request_id uuid,
  p_status text,
  p_model text,
  p_requests integer,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cache_read_tokens integer,
  p_cache_write_tokens integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.ai_requests;
begin
  if actor is null then
    raise exception 'solus:not_authenticated' using errcode = '28000';
  end if;
  select * into target from public.ai_requests r where r.id = p_request_id for update;
  if target.id is null or target.user_id is distinct from actor or target.status <> 'started' then
    raise exception 'solus:ai_request_not_found' using errcode = 'P0002';
  end if;
  if p_status is null or p_status not in ('answered', 'partial', 'refused', 'failed') then
    raise exception 'solus:invalid_ai_request' using errcode = '22023';
  end if;
  update public.ai_requests
  set status = p_status,
      model = left(p_model, 64),
      requests = least(greatest(coalesce(p_requests, 0), 0), 50),
      input_tokens = greatest(coalesce(p_input_tokens, 0), 0),
      output_tokens = greatest(coalesce(p_output_tokens, 0), 0),
      cache_read_tokens = greatest(coalesce(p_cache_read_tokens, 0), 0),
      cache_write_tokens = greatest(coalesce(p_cache_write_tokens, 0), 0),
      finished_at = now()
  where id = target.id;
end
$$;

-- Grava (ou substitui) o resumo de um período. Analyst ou superior.
create function public.save_ai_summary(p_organization_id uuid, p_period_key text, p_data_signature text, p_content jsonb, p_model text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_member(p_organization_id, 'analyst');
begin
  insert into public.ai_summaries (organization_id, period_key, data_signature, content, model, created_by)
  values (p_organization_id, p_period_key, p_data_signature, p_content, left(p_model, 64), actor)
  on conflict (organization_id, period_key) do update
  set data_signature = excluded.data_signature,
      content = excluded.content,
      model = excluded.model,
      created_by = excluded.created_by,
      created_at = now();
end
$$;

revoke all on function
  public.begin_ai_request(uuid, text),
  public.finish_ai_request(uuid, text, text, integer, integer, integer, integer, integer),
  public.save_ai_summary(uuid, text, text, jsonb, text)
from public, anon;
grant execute on function
  public.begin_ai_request(uuid, text),
  public.finish_ai_request(uuid, text, text, integer, integer, integer, integer, integer),
  public.save_ai_summary(uuid, text, text, jsonb, text)
to authenticated;

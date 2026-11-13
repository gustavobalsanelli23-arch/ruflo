-- Planos: Free, Basic, Pro e Premium.
--
-- O plano é da organização e só muda pelo servidor ou pelo painel (a coluna
-- não tem grant de update para usuários). Os limites valem no banco, também
-- para chamadas diretas à API:
--   * membros + convites pendentes;
--   * linhas guardadas (vendas e estoque) mais as linhas em validação;
--   * perguntas e resumos à IA por dia (horário de Brasília).
-- Mantenha os números iguais aos de src/config/plans.ts.

create type public.org_plan as enum ('free', 'basic', 'pro', 'premium');

alter table public.organizations add column plan public.org_plan not null default 'free';

-- Organizações criadas antes dos planos ficam no Premium, para nada que já
-- funciona parar. Troque pelo painel quando definir o plano de cada uma.
update public.organizations set plan = 'premium';

create function private.plan_limit(p_plan public.org_plan, p_kind text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_kind
    when 'members' then case p_plan when 'free' then 1 when 'basic' then 3 when 'pro' then 10 else 30 end
    when 'rows' then case p_plan when 'free' then 5000 when 'basic' then 50000 when 'pro' then 200000 else 1000000 end
    when 'ai_per_day' then case p_plan when 'free' then 5 when 'basic' then 30 when 'pro' then 100 else 300 end
  end
$$;

create function private.org_plan_of(p_organization_id uuid)
returns public.org_plan
language sql
stable
security definer
set search_path = ''
as $$
  select o.plan from public.organizations o where o.id = p_organization_id
$$;

-- Membros: quem entra (convite aceito) conta contra o limite.
create function private.enforce_member_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('members:' || new.organization_id::text, 0));
  select count(*) into used from public.organization_members m where m.organization_id = new.organization_id;
  if used >= private.plan_limit(private.org_plan_of(new.organization_id), 'members') then
    raise exception 'solus:plan_member_limit' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger organization_members_plan_limit
before insert on public.organization_members
for each row execute function private.enforce_member_limit();

-- Convites: membros + convites pendentes não passam do limite.
create function private.enforce_invitation_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('members:' || new.organization_id::text, 0));
  select
    (select count(*) from public.organization_members m where m.organization_id = new.organization_id)
    + (select count(*) from public.organization_invitations i
       where i.organization_id = new.organization_id and i.accepted_at is null and i.expires_at > now()
         and lower(i.email) <> lower(new.email))
  into used;
  if used >= private.plan_limit(private.org_plan_of(new.organization_id), 'members') then
    raise exception 'solus:plan_member_limit' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger organization_invitations_plan_limit
before insert on public.organization_invitations
for each row execute function private.enforce_invitation_limit();

-- Linhas: o que já está guardado + o que está em validação + o lote novo.
create function private.enforce_row_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  used bigint;
begin
  select
    (select count(*) from public.sale_items s where s.organization_id = new.organization_id)
    + (select count(*) from public.inventory_snapshots s where s.organization_id = new.organization_id)
    + (select count(*) from private.import_rows r where r.organization_id = new.organization_id)
  into used;
  if used + new.row_count > private.plan_limit(private.org_plan_of(new.organization_id), 'rows') then
    raise exception 'solus:plan_row_limit' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger import_batches_plan_limit
before insert on public.import_batches
for each row execute function private.enforce_row_limit();

-- IA: pedidos do dia (horário de Brasília). begin_ai_request já serializa por organização.
create function private.enforce_ai_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  used integer;
begin
  select count(*) into used from public.ai_requests r
  where r.organization_id = new.organization_id and r.created_at >= day_start;
  if used >= private.plan_limit(private.org_plan_of(new.organization_id), 'ai_per_day') then
    raise exception 'solus:ai_daily_limit' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger ai_requests_plan_limit
before insert on public.ai_requests
for each row execute function private.enforce_ai_limit();

revoke all on function
  private.plan_limit(public.org_plan, text),
  private.org_plan_of(uuid),
  private.enforce_member_limit(),
  private.enforce_invitation_limit(),
  private.enforce_row_limit(),
  private.enforce_ai_limit()
from public, anon, authenticated;

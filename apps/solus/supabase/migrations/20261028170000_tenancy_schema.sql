-- SOLUS · Parte 03 · 1/3 — Esquema multi-tenant
--
-- Tabelas de organizações, perfis, membros, convites e importações, mais as
-- funções auxiliares usadas pelas políticas RLS (migration seguinte).
--
-- Decisões de segurança (detalhes em docs/seguranca-rls.md):
--   * Funções auxiliares vivem no schema `private`, que não é exposto pela API
--     (PostgREST só publica `public`). São SECURITY DEFINER para consultar
--     organization_members sem disparar RLS de novo (evita recursão), têm
--     search_path vazio e nomes totalmente qualificados.
--   * Nenhuma tabela recebe privilégios amplos: depois do CREATE, os grants
--     padrão do Supabase são revogados e só as colunas necessárias são
--     liberadas (proteção contra mass assignment no próprio banco).

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
-- Funções criadas em `private` não ficam executáveis por PUBLIC por padrão.
alter default privileges in schema private revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.org_role as enum ('owner', 'admin', 'analyst', 'viewer');
create type public.import_dataset as enum ('sales', 'products', 'inventory', 'suppliers');
create type public.import_status as enum ('pending', 'processing', 'completed', 'with_errors', 'failed');

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (full_name is null or char_length(full_name) between 1 and 120),
  constraint profiles_avatar_url_format check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 2048))
);
comment on table public.profiles is 'Perfil público de cada usuário do Supabase Auth. Criado por gatilho; o e-mail é espelhado de auth.users e não é editável pelo cliente.';

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(name) between 2 and 80 and name = btrim(name)),
  constraint organizations_slug_format check (char_length(slug) between 3 and 48 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint organizations_slug_key unique (slug)
);
comment on table public.organizations is 'Empresas (tenants). Criadas somente por public.create_organization().';

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_unique unique (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);
comment on table public.organization_members is 'Vínculo usuário ↔ organização com papel. Um usuário pode pertencer a várias organizações.';

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.org_role not null default 'viewer',
  token_hash bytea not null,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint organization_invitations_token_key unique (token_hash),
  constraint organization_invitations_role check (role <> 'owner'),
  constraint organization_invitations_email_format check (
    char_length(email) <= 254 and email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);
create unique index organization_invitations_pending_email
  on public.organization_invitations (organization_id, email) where accepted_at is null;
comment on table public.organization_invitations is 'Convites por link. Só o hash SHA-256 do token é guardado; o token aparece uma única vez para quem convidou.';

create table public.data_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  dataset public.import_dataset not null,
  file_name text not null,
  status public.import_status not null default 'pending',
  record_count integer not null default 0,
  error_count integer not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_imports_file_name_length check (char_length(file_name) between 1 and 255),
  constraint data_imports_counts check (record_count >= 0 and error_count >= 0)
);
create index data_imports_org_created_idx on public.data_imports (organization_id, created_at desc);
comment on table public.data_imports is 'Histórico de importações de planilhas. O processamento chega com o motor analítico (Parte 04).';

-- ---------------------------------------------------------------------------
-- Privilégios: revoga os grants padrão do Supabase e libera só o necessário.
-- service_role mantém acesso total (ignora RLS) para tarefas do servidor.
-- ---------------------------------------------------------------------------

revoke all on table
  public.profiles,
  public.organizations,
  public.organization_members,
  public.organization_invitations,
  public.data_imports
from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

grant select on public.organizations to authenticated;
grant update (name) on public.organizations to authenticated;
grant delete on public.organizations to authenticated;

grant select on public.organization_members to authenticated;
grant update (role) on public.organization_members to authenticated;
grant delete on public.organization_members to authenticated;

-- token_hash nunca é legível pelo cliente.
grant select (id, organization_id, email, role, invited_by, expires_at, accepted_at, accepted_by, created_at)
  on public.organization_invitations to authenticated;
grant delete on public.organization_invitations to authenticated;

grant select on public.data_imports to authenticated;
grant insert (organization_id, dataset, file_name) on public.data_imports to authenticated;
grant delete on public.data_imports to authenticated;

grant all on table
  public.profiles,
  public.organizations,
  public.organization_members,
  public.organization_invitations,
  public.data_imports
to service_role;

-- ---------------------------------------------------------------------------
-- Funções auxiliares (usadas pelas políticas RLS)
-- ---------------------------------------------------------------------------

create function private.org_role_rank(role public.org_role)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case role
    when 'owner' then 4
    when 'admin' then 3
    when 'analyst' then 2
    when 'viewer' then 1
  end
$$;

-- Organizações em que o usuário da requisição tem pelo menos o papel pedido.
create function private.user_org_ids(minimum public.org_role default 'viewer')
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.organization_members m
  where m.user_id = (select auth.uid())
    and private.org_role_rank(m.role) >= private.org_role_rank(minimum)
$$;

-- Perfis visíveis: o próprio e os de quem divide alguma organização.
create function private.visible_profile_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid())
  union
  select colleague.user_id
  from public.organization_members mine
  join public.organization_members colleague on colleague.organization_id = mine.organization_id
  where mine.user_id = (select auth.uid())
$$;

-- Papel do usuário da requisição em uma organização (null se não for membro).
create function private.member_role(org uuid)
returns public.org_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = org and m.user_id = (select auth.uid())
$$;

revoke all on function
  private.org_role_rank(public.org_role),
  private.user_org_ids(public.org_role),
  private.visible_profile_ids(),
  private.member_role(uuid)
from public;
grant execute on function
  private.org_role_rank(public.org_role),
  private.user_org_ids(public.org_role),
  private.visible_profile_ids(),
  private.member_role(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger organizations_touch before update on public.organizations
  for each row execute function private.touch_updated_at();
create trigger organization_members_touch before update on public.organization_members
  for each row execute function private.touch_updated_at();
create trigger data_imports_touch before update on public.data_imports
  for each row execute function private.touch_updated_at();

-- Cria o perfil quando o Supabase Auth registra um usuário. O nome vem dos
-- metadados do cadastro (controlados pelo usuário), então é aparado e cortado.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), '')
  )
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Mantém o e-mail do perfil igual ao da conta quando ele muda no Auth.
create function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- Usuários que já existiam antes desta migration também ganham perfil.
insert into public.profiles (id, email)
select u.id, lower(u.email) from auth.users u
on conflict (id) do nothing;

-- Invariantes de papéis que uma política RLS não consegue expressar sozinha.
-- As políticas decidem QUEM pode tocar uma linha; este gatilho decide QUAL
-- mudança é permitida:
--   * owner: altera ou remove qualquer membro;
--   * admin: só altera ou remove analistas e leitores, e só para esses papéis;
--   * qualquer membro pode sair da organização;
--   * a organização nunca fica sem owner;
--   * organização e usuário de um vínculo são imutáveis.
create function private.guard_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role public.org_role;
  remaining_owners integer;
begin
  -- Contexto de sistema (service_role, migrations, exclusão de conta pelo
  -- painel): não há usuário na requisição e o RLS não se aplica.
  if actor is null then
    return coalesce(new, old);
  end if;

  -- Exclusão em cascata da própria organização.
  if tg_op = 'DELETE' and not exists (select 1 from public.organizations o where o.id = old.organization_id) then
    return old;
  end if;

  if tg_op = 'UPDATE' and (new.organization_id <> old.organization_id or new.user_id <> old.user_id) then
    raise exception 'solus:membership_immutable' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.role = old.role then
    return new;
  end if;

  select m.role into actor_role
  from public.organization_members m
  where m.organization_id = old.organization_id and m.user_id = actor;

  if tg_op = 'DELETE' and old.user_id = actor then
    null; -- sair da organização é sempre permitido (exceto último owner, abaixo)
  elsif actor_role = 'owner' then
    null;
  elsif actor_role = 'admin'
    and old.role in ('analyst', 'viewer')
    and (tg_op = 'DELETE' or new.role in ('analyst', 'viewer')) then
    null;
  elsif actor_role = 'admin' then
    raise exception 'solus:role_requires_owner' using errcode = '42501';
  else
    raise exception 'solus:forbidden' using errcode = '42501';
  end if;

  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    -- Serializa mudanças de owner na mesma organização (evita que dois owners
    -- se rebaixem ao mesmo tempo e a organização fique sem nenhum).
    perform 1 from public.organizations o where o.id = old.organization_id for update;
    select count(*) into remaining_owners
    from public.organization_members m
    where m.organization_id = old.organization_id and m.role = 'owner' and m.id <> old.id;
    if remaining_owners = 0 then
      raise exception 'solus:last_owner' using errcode = 'P0001';
    end if;
  end if;

  return coalesce(new, old);
end
$$;

create trigger organization_members_guard before update or delete on public.organization_members
  for each row execute function private.guard_membership_change();

revoke all on function
  private.touch_updated_at(),
  private.handle_new_user(),
  private.handle_user_email_change(),
  private.guard_membership_change()
from public, anon, authenticated;

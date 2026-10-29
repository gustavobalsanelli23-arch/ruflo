-- SOLUS · Parte 03 · 3/3 — Limite de requisições e operações de organização
--
-- Operações que precisam de várias escritas atômicas, de segredos gerados no
-- banco ou de validações que o RLS não expressa ficam em funções RPC
-- SECURITY DEFINER. Toda função:
--   * identifica o usuário só por auth.uid() (nunca por parâmetro);
--   * confere o papel na organização dentro do banco, mesmo que o servidor
--     já tenha conferido;
--   * tem search_path vazio e nomes totalmente qualificados;
--   * só pode ser executada pelo papel indicado (nunca por anon).
-- Erros de negócio usam mensagens `solus:<código>`, traduzidas pela aplicação.

-- ---------------------------------------------------------------------------
-- Limite de requisições (compartilhado entre instâncias: vive no Postgres)
-- ---------------------------------------------------------------------------

create table private.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start),
  constraint rate_limits_bucket_length check (char_length(bucket) between 1 and 200)
);
revoke all on table private.rate_limits from public, anon, authenticated;

-- Janela fixa. Devolve true enquanto o número de tentativas cabe no limite.
create function private.hit_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'solus:invalid_rate_limit' using errcode = '22023';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Limpeza oportunista das janelas antigas.
  if random() < 0.02 then
    delete from private.rate_limits r where r.window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end
$$;

create function private.enforce_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.hit_rate_limit(p_bucket, p_limit, p_window_seconds) then
    raise exception 'solus:rate_limited' using errcode = 'P0001';
  end if;
end
$$;

-- Usada pelo servidor (com a chave secreta) para limitar login, cadastro e
-- recuperação de senha antes de existir sessão. Nunca exposta a anon.
create function public.check_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.hit_rate_limit(p_bucket, p_limit, p_window_seconds)
$$;

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------

create function private.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(value), 'áàâãäåéèêëíìîïóòôõöúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+', '-', 'g'
  ))
$$;

create function private.mask_email(email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(split_part(email, '@', 1), 1) || '•••@' || split_part(email, '@', 2)
$$;

create function private.invitation_token_hash(token text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(token, 'UTF8'))
$$;

-- ---------------------------------------------------------------------------
-- Organizações
-- ---------------------------------------------------------------------------

-- Cria a organização e torna quem a criou owner, na mesma transação.
create function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  clean_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  base_slug text;
  candidate text;
  new_org uuid;
begin
  if actor is null then
    raise exception 'solus:not_authenticated' using errcode = '28000';
  end if;
  if char_length(clean_name) not between 2 and 80 then
    raise exception 'solus:invalid_name' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = actor) then
    raise exception 'solus:profile_missing' using errcode = 'P0002';
  end if;

  perform private.enforce_rate_limit('org-create:' || actor::text, 5, 3600);

  base_slug := trim(both '-' from left(private.slugify(clean_name), 40));
  if char_length(base_slug) < 3 then
    base_slug := rtrim('org-' || base_slug, '-');
  end if;

  candidate := base_slug;
  while exists (select 1 from public.organizations o where o.slug = candidate) loop
    candidate := base_slug || '-' || left(encode(extensions.gen_random_bytes(4), 'hex'), 6);
  end loop;

  insert into public.organizations (name, slug, created_by)
  values (clean_name, candidate, actor)
  returning id into new_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org, actor, 'owner');

  return new_org;
end
$$;

-- ---------------------------------------------------------------------------
-- Convites por link
-- ---------------------------------------------------------------------------

-- Gera um convite. O token (256 bits) é devolvido uma única vez; o banco
-- guarda só o hash. Convidar de novo o mesmo e-mail substitui o anterior.
--   * owner convida admin, analyst ou viewer;
--   * admin convida analyst ou viewer;
--   * ninguém convida owner (a propriedade é concedida depois, pelo owner).
create function public.create_invitation(p_organization_id uuid, p_email text, p_role public.org_role)
returns table (invitation_id uuid, invitation_token text, invitation_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role public.org_role;
  normalized text := lower(btrim(coalesce(p_email, '')));
  raw_token text;
begin
  if actor is null then
    raise exception 'solus:not_authenticated' using errcode = '28000';
  end if;

  select m.role into actor_role
  from public.organization_members m
  where m.organization_id = p_organization_id and m.user_id = actor;

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'solus:forbidden' using errcode = '42501';
  end if;
  if p_role is null or p_role = 'owner' then
    raise exception 'solus:invalid_role' using errcode = '22023';
  end if;
  if p_role = 'admin' and actor_role <> 'owner' then
    raise exception 'solus:role_requires_owner' using errcode = '42501';
  end if;
  if char_length(normalized) > 254 or normalized !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'solus:invalid_email' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.organization_members m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id and p.email = normalized
  ) then
    raise exception 'solus:already_member' using errcode = '23505';
  end if;

  perform private.enforce_rate_limit('invite:' || actor::text, 30, 3600);

  delete from public.organization_invitations i
  where i.organization_id = p_organization_id and i.email = normalized and i.accepted_at is null;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.organization_invitations as i (organization_id, email, role, token_hash, invited_by)
  values (p_organization_id, normalized, p_role, private.invitation_token_hash(raw_token), actor)
  returning i.id, i.expires_at into invitation_id, invitation_expires_at;

  invitation_token := raw_token;
  return next;
end
$$;

-- Prévia do convite para a tela de aceite: organização, papel, e-mail
-- mascarado e se ele coincide com a conta conectada.
create function public.get_invitation(p_token text)
returns table (
  organization_name text,
  invited_role public.org_role,
  email_hint text,
  email_matches boolean,
  invitation_status text,
  invitation_expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  user_email text;
begin
  if actor is null then
    raise exception 'solus:not_authenticated' using errcode = '28000';
  end if;
  if coalesce(p_token, '') !~ '^[0-9a-f]{64}$' then
    return;
  end if;

  select lower(u.email) into user_email from auth.users u where u.id = actor;

  return query
  select
    o.name,
    i.role,
    private.mask_email(i.email),
    i.email = user_email,
    case
      when i.accepted_at is not null then 'accepted'
      when i.expires_at <= now() then 'expired'
      else 'pending'
    end,
    i.expires_at
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token_hash = private.invitation_token_hash(p_token);
end
$$;

-- Aceita o convite: exige e-mail confirmado e igual ao convidado. Devolve o
-- id da organização. Quem já é membro mantém o papel atual.
create function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  user_email text;
  user_confirmed timestamptz;
  invitation public.organization_invitations;
begin
  if actor is null then
    raise exception 'solus:not_authenticated' using errcode = '28000';
  end if;
  if coalesce(p_token, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'solus:invitation_not_found' using errcode = 'P0002';
  end if;

  select lower(u.email), u.email_confirmed_at into user_email, user_confirmed
  from auth.users u where u.id = actor;

  select * into invitation
  from public.organization_invitations i
  where i.token_hash = private.invitation_token_hash(p_token)
  for update;

  if not found then
    raise exception 'solus:invitation_not_found' using errcode = 'P0002';
  end if;
  if invitation.accepted_at is not null then
    raise exception 'solus:invitation_used' using errcode = 'P0001';
  end if;
  if invitation.expires_at <= now() then
    raise exception 'solus:invitation_expired' using errcode = 'P0001';
  end if;
  if user_confirmed is null then
    raise exception 'solus:email_not_confirmed' using errcode = '42501';
  end if;
  if user_email is distinct from invitation.email then
    raise exception 'solus:invitation_email_mismatch' using errcode = '42501';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (invitation.organization_id, actor, invitation.role)
  on conflict (organization_id, user_id) do nothing;

  update public.organization_invitations
  set accepted_at = now(), accepted_by = actor
  where id = invitation.id;

  return invitation.organization_id;
end
$$;

-- ---------------------------------------------------------------------------
-- Privilégios de execução
-- ---------------------------------------------------------------------------

revoke all on function
  private.hit_rate_limit(text, integer, integer),
  private.enforce_rate_limit(text, integer, integer),
  private.slugify(text),
  private.mask_email(text),
  private.invitation_token_hash(text)
from public, anon, authenticated;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

revoke all on function
  public.create_organization(text),
  public.create_invitation(uuid, text, public.org_role),
  public.get_invitation(text),
  public.accept_invitation(text)
from public, anon;
grant execute on function
  public.create_organization(text),
  public.create_invitation(uuid, text, public.org_role),
  public.get_invitation(text),
  public.accept_invitation(text)
to authenticated;

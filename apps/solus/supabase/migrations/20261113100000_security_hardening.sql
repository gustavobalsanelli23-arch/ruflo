-- Correções da auditoria de segurança de 2026-11-12 (run-1).
--
-- 1. Convites deixam de valer quando quem os emitiu perde o direito de
--    convidar (saiu, foi removido ou rebaixado): accept_invitation reconfere
--    o emissor, e a remoção/rebaixamento apaga os convites pendentes dele.
-- 2. save_ai_summary deixa de ser chamável pelo usuário (que gravava qualquer
--    conteúdo como "Resumo da IA"): só o servidor, com a chave secreta, grava,
--    depois de rodar o modelo e conferir os números; o banco reconfere o papel.
-- 3. Importação: o banco passa a aceitar no máximo 200 lotes por importação,
--    como o app (antes 1000, o que permitia 2 milhões de linhas em staging).
-- 4. Importações abandonadas (pendentes ou validadas há mais de 48 horas) são
--    canceladas e suas linhas em staging apagadas por private.purge_stale_imports(),
--    agendada com pg_cron quando a extensão está ligada.

-- ---------------------------------------------------------------------------
-- 1. Convites presos à autoridade atual de quem convidou
-- ---------------------------------------------------------------------------

-- Pode o emissor, hoje, conceder este papel? Admin convida analyst/viewer;
-- só owner convida admin (as mesmas regras de create_invitation).
create function private.invitation_issuer_valid(p_organization_id uuid, p_issuer uuid, p_role public.org_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = p_issuer
      and private.org_role_rank(m.role) >= case
        when p_role = 'admin' then private.org_role_rank('owner')
        else private.org_role_rank('admin')
      end
  )
$$;

create or replace function public.accept_invitation(p_token text)
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
  -- O convite vale só enquanto quem o emitiu ainda pode conceder esse papel.
  if invitation.invited_by is null
    or not private.invitation_issuer_valid(invitation.organization_id, invitation.invited_by, invitation.role) then
    raise exception 'solus:invitation_not_found' using errcode = 'P0002';
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

-- Quem sai, é removido ou rebaixado perde os convites pendentes que emitiu
-- e que já não poderia emitir.
create function private.revoke_issuer_invitations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.organization_invitations i
  where i.organization_id = old.organization_id
    and i.invited_by = old.user_id
    and i.accepted_at is null
    and not private.invitation_issuer_valid(i.organization_id, i.invited_by, i.role);
  return null;
end
$$;

create trigger organization_members_revoke_invitations
after delete or update of role on public.organization_members
for each row execute function private.revoke_issuer_invitations();

revoke all on function
  private.invitation_issuer_valid(uuid, uuid, public.org_role),
  private.revoke_issuer_invitations()
from public, anon, authenticated;

-- Convites já pendentes de quem hoje não poderia emiti-los.
delete from public.organization_invitations i
where i.accepted_at is null
  and (i.invited_by is null or not private.invitation_issuer_valid(i.organization_id, i.invited_by, i.role));

-- ---------------------------------------------------------------------------
-- 2. Resumo da IA gravado só pelo servidor
-- ---------------------------------------------------------------------------

drop function public.save_ai_summary(uuid, text, text, jsonb, text);

create function public.save_ai_summary(p_actor uuid, p_organization_id uuid, p_period_key text, p_data_signature text, p_content jsonb, p_model text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor is null or not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = p_actor
      and private.org_role_rank(m.role) >= private.org_role_rank('analyst')
  ) then
    raise exception 'solus:forbidden' using errcode = '42501';
  end if;

  insert into public.ai_summaries (organization_id, period_key, data_signature, content, model, created_by)
  values (p_organization_id, p_period_key, p_data_signature, p_content, left(p_model, 64), p_actor)
  on conflict (organization_id, period_key) do update
  set data_signature = excluded.data_signature,
      content = excluded.content,
      model = excluded.model,
      created_by = excluded.created_by,
      created_at = now();
end
$$;

revoke all on function public.save_ai_summary(uuid, uuid, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.save_ai_summary(uuid, uuid, text, text, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. No máximo 200 lotes por importação (MAX_BATCHES do app)
-- ---------------------------------------------------------------------------

alter table public.import_batches drop constraint import_batches_index;
alter table public.import_batches add constraint import_batches_index check (batch_index between 0 and 199);

-- ---------------------------------------------------------------------------
-- 4. Limpeza de importações abandonadas
-- ---------------------------------------------------------------------------

create function private.purge_stale_imports(p_older_than interval default interval '48 hours')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged integer;
begin
  with stale as (
    update public.data_imports d
    set status = 'canceled'
    where d.status in ('pending', 'validated')
      and d.created_at < now() - p_older_than
    returning d.id
  )
  delete from private.import_rows r
  using stale
  where r.import_id = stale.id;
  get diagnostics purged = row_count;
  return purged;
end
$$;

revoke all on function private.purge_stale_imports(interval) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('solus-purge-stale-imports', '17 * * * *', 'select private.purge_stale_imports()');
  end if;
end
$$;

-- Registro de segurança, guardado no banco por 180 dias (os logs da Vercel
-- no plano Hobby duram 1 hora).
--
-- Duas origens:
--   * o app (só pelo service_role, public.record_security_event): limite de
--     tentativas atingido, campo-isca preenchido, Turnstile recusado,
--     assinatura inválida no webhook da Stripe;
--   * o próprio banco, por triggers, também quando a mudança vem direto da
--     API: papel alterado, pessoa removida, convite aceito, organização
--     excluída, conta excluída.
--
-- Nada de dado pessoal além de ids: o rótulo é a família do evento (ex.
-- "signin:ip"), nunca e-mail, IP ou token. Ninguém além do service_role lê.

create table private.security_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  event text not null check (event in (
    'rate_limited', 'bot_trap', 'captcha_failed', 'webhook_bad_signature',
    'role_changed', 'member_removed', 'invitation_accepted', 'organization_deleted', 'account_deleted'
  )),
  label text check (label is null or char_length(label) <= 80),
  actor_id uuid,
  organization_id uuid,
  target_id uuid
);

create index security_events_at_idx on private.security_events (at desc);
create index security_events_org_idx on private.security_events (organization_id, at desc) where organization_id is not null;

alter table private.security_events enable row level security;
revoke all on table private.security_events from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Eventos do app
-- ---------------------------------------------------------------------------

create function public.record_security_event(p_event text, p_label text default null, p_actor uuid default null, p_organization uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.security_events (event, label, actor_id, organization_id)
  values (p_event, left(p_label, 80), p_actor, p_organization);
$$;

revoke all on function public.record_security_event(text, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_security_event(text, text, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Eventos do banco
-- ---------------------------------------------------------------------------

create function private.audit_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      insert into private.security_events (event, label, actor_id, organization_id, target_id)
      values ('role_changed', old.role::text || '>' || new.role::text, (select auth.uid()), new.organization_id, new.user_id);
    end if;
    return new;
  end if;
  -- DELETE (inclui sair por conta própria e a cascata da exclusão da organização).
  insert into private.security_events (event, label, actor_id, organization_id, target_id)
  values ('member_removed', old.role::text, (select auth.uid()), old.organization_id, old.user_id);
  return old;
end
$$;

create trigger organization_members_audit after update or delete on public.organization_members
  for each row execute function private.audit_membership();

create function private.audit_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.accepted_at is null and new.accepted_at is not null then
    insert into private.security_events (event, label, actor_id, organization_id, target_id)
    values ('invitation_accepted', new.role::text, new.accepted_by, new.organization_id, new.id);
  end if;
  return new;
end
$$;

create trigger organization_invitations_audit after update on public.organization_invitations
  for each row execute function private.audit_invitation();

create function private.audit_organization_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.security_events (event, label, actor_id, organization_id)
  values ('organization_deleted', old.plan::text, (select auth.uid()), old.id);
  return old;
end
$$;

create trigger organizations_audit_delete after delete on public.organizations
  for each row execute function private.audit_organization_deleted();

create function private.audit_account_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.security_events (event, target_id) values ('account_deleted', old.id);
  return old;
end
$$;

create trigger profiles_audit_delete after delete on public.profiles
  for each row execute function private.audit_account_deleted();

revoke all on function private.audit_membership() from public, anon, authenticated;
revoke all on function private.audit_invitation() from public, anon, authenticated;
revoke all on function private.audit_organization_deleted() from public, anon, authenticated;
revoke all on function private.audit_account_deleted() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Retenção: 180 dias
-- ---------------------------------------------------------------------------

create function private.purge_security_events()
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (delete from private.security_events where at < now() - interval '180 days' returning 1)
  select count(*)::integer from gone;
$$;

revoke all on function private.purge_security_events() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('solus-purge-security-events', '41 3 * * *', 'select private.purge_security_events()');
  end if;
end
$$;

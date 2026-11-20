-- Travas de exclusão no banco.
--
-- O app apaga o arquivo da importação no Storage antes da linha, e encerra o
-- cliente na Stripe antes de excluir a organização. Pela API REST, porém, um
-- admin ou owner pode mandar o DELETE direto (as políticas permitem) e pular
-- esses passos: o arquivo ficaria no Storage sem nenhum registro que o
-- aponte (a exclusão da organização não o acharia mais) e a assinatura
-- seguiria cobrando uma organização que não existe.
--
-- As travas valem só para requisições de usuário. Em contexto de sistema
-- (service_role, migrations, painel) não há auth.uid(), como em
-- private.guard_membership_change.

create function private.guard_import_file_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return old;
  end if;
  if old.storage_path is not null and exists (
    select 1 from storage.objects o where o.bucket_id = 'imports' and o.name = old.storage_path
  ) then
    raise exception 'solus:import_file_present' using errcode = '55000';
  end if;
  return old;
end
$$;

-- Também dispara na cascata da exclusão da organização: se sobrou arquivo,
-- nada é excluído.
create trigger data_imports_require_file_removed before delete on public.data_imports
  for each row execute function private.guard_import_file_removed();

create function private.guard_billing_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return old;
  end if;
  -- Os mesmos status em que a organização mantém o plano pago
  -- (PAID_STATUSES em src/lib/billing/stripe.ts). O app marca 'canceled'
  -- depois de apagar o cliente na Stripe.
  if exists (
    select 1 from public.organization_billing b
    where b.organization_id = old.id and b.status in ('active', 'trialing', 'past_due')
  ) then
    raise exception 'solus:billing_active' using errcode = '55000';
  end if;
  return old;
end
$$;

create trigger organizations_require_billing_closed before delete on public.organizations
  for each row execute function private.guard_billing_closed();

revoke all on function private.guard_import_file_removed() from public, anon, authenticated;
revoke all on function private.guard_billing_closed() from public, anon, authenticated;

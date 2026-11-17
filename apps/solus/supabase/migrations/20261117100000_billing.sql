-- Cobrança pela Stripe.
--
-- O plano da organização passa a seguir a assinatura da Stripe. Só o servidor
-- (service_role) grava aqui, por duas funções:
--   * link_billing_customer: liga a organização ao cliente da Stripe, antes do
--     checkout, depois que o app conferiu que quem pediu é proprietário;
--   * apply_subscription: aplica o estado atual da assinatura, lido da própria
--     Stripe a cada webhook (por isso a ordem dos eventos não importa).
-- Membros da organização podem ler o estado da cobrança; ninguém o altera pela
-- API pública.

create table public.organization_billing (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  status text,
  plan public.org_plan,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.organization_billing enable row level security;

create policy organization_billing_select_member on public.organization_billing
  for select to authenticated
  using (organization_id in (select private.user_org_ids()));

grant select on public.organization_billing to authenticated;

-- Eventos já processados, para um reenvio da Stripe não aplicar nada duas vezes.
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- Sem políticas nem grants: só o service_role lê e escreve.

create function public.link_billing_customer(p_actor uuid, p_organization_id uuid, p_customer_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor is null or not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = p_actor and m.role = 'owner'
  ) then
    raise exception 'solus:forbidden' using errcode = '42501';
  end if;

  insert into public.organization_billing (organization_id, stripe_customer_id)
  values (p_organization_id, p_customer_id)
  on conflict (organization_id) do nothing;
end
$$;

-- Devolve false quando o evento já tinha sido processado ou o cliente não é
-- de nenhuma organização (nada a fazer).
create function public.apply_subscription(
  p_event_id text,
  p_event_type text,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_plan public.org_plan,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  org uuid;
  inserted int;
begin
  insert into public.stripe_events (id, type) values (p_event_id, p_event_type)
  on conflict (id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return false;
  end if;

  select b.organization_id into org
  from public.organization_billing b
  where b.stripe_customer_id = p_customer_id
  for update;
  if org is null then
    return false;
  end if;

  update public.organization_billing
  set stripe_subscription_id = p_subscription_id,
      status = p_status,
      plan = p_plan,
      current_period_end = p_current_period_end,
      cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
      updated_at = now()
  where organization_id = org;

  -- Pago ou em nova tentativa de cobrança: vale o plano assinado. Cancelada,
  -- não paga ou expirada: volta ao Free. Os dados ficam; só novas inclusões
  -- passam a respeitar os limites do Free.
  update public.organizations
  set plan = case
    when p_status in ('active', 'trialing', 'past_due') and p_plan is not null then p_plan
    else 'free'::public.org_plan
  end
  where id = org;

  return true;
end
$$;

revoke all on function public.link_billing_customer(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.link_billing_customer(uuid, uuid, text) to service_role;

revoke all on function public.apply_subscription(text, text, text, text, text, public.org_plan, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.apply_subscription(text, text, text, text, text, public.org_plan, timestamptz, boolean)
  to service_role;

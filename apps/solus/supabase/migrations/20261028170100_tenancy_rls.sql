-- SOLUS · Parte 03 · 2/3 — Row Level Security
--
-- Regra geral: uma linha só é visível ou alterável por membros da organização
-- dona dela, e cada operação exige um papel mínimo. Operações sem política
-- (por exemplo INSERT em organizations) ficam bloqueadas para o cliente e só
-- acontecem por funções do banco que fazem as próprias verificações.
--
-- Os subselects `(select private.user_org_ids(...))` e `(select auth.uid())`
-- são avaliados uma vez por consulta (initPlan), não uma vez por linha.
--
-- Matriz (cliente autenticado; anon não tem nenhum privilégio):
--
--   tabela                     SELECT       INSERT            UPDATE              DELETE
--   organizations              membro       — (RPC)           admin (só name)     owner
--   profiles                   próprio +    — (gatilho)       próprio (nome,      — (cascata)
--                              colegas                        avatar)
--   organization_members       membro       — (RPC)           admin (só role) +   o próprio membro
--                                                             gatilho de papéis   ou admin + gatilho
--   organization_invitations   admin        — (RPC)           — (RPC)             admin
--   data_imports               membro       analyst           — (servidor)        admin

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.data_imports enable row level security;

-- organizations --------------------------------------------------------------

create policy organizations_select_member on public.organizations
  for select to authenticated
  using (id in (select private.user_org_ids('viewer')));

-- Sem política de INSERT: criação somente por public.create_organization(),
-- que cria a organização e o vínculo de owner na mesma transação.

create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (id in (select private.user_org_ids('admin')))
  with check (id in (select private.user_org_ids('admin')));

create policy organizations_delete_owner on public.organizations
  for delete to authenticated
  using (id in (select private.user_org_ids('owner')));

-- profiles -------------------------------------------------------------------

create policy profiles_select_self_or_colleague on public.profiles
  for select to authenticated
  using (id in (select private.visible_profile_ids()));

-- Sem política de INSERT: o perfil nasce do gatilho em auth.users.

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Sem política de DELETE: o perfil sai junto com a conta (cascata).

-- organization_members ---------------------------------------------------------

create policy members_select_same_org on public.organization_members
  for select to authenticated
  using (organization_id in (select private.user_org_ids('viewer')));

-- Sem política de INSERT: entrada só por create_organization() (owner) e
-- accept_invitation() (convite vinculado ao e-mail verificado).

create policy members_update_admin on public.organization_members
  for update to authenticated
  using (organization_id in (select private.user_org_ids('admin')))
  with check (organization_id in (select private.user_org_ids('admin')));

create policy members_delete_self_or_admin on public.organization_members
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or organization_id in (select private.user_org_ids('admin'))
  );

-- organization_invitations -----------------------------------------------------

create policy invitations_select_admin on public.organization_invitations
  for select to authenticated
  using (organization_id in (select private.user_org_ids('admin')));

-- Sem políticas de INSERT/UPDATE: o token é gerado e consumido no banco por
-- create_invitation() e accept_invitation().

create policy invitations_delete_admin on public.organization_invitations
  for delete to authenticated
  using (organization_id in (select private.user_org_ids('admin')));

-- data_imports -----------------------------------------------------------------

create policy data_imports_select_member on public.data_imports
  for select to authenticated
  using (organization_id in (select private.user_org_ids('viewer')));

create policy data_imports_insert_analyst on public.data_imports
  for insert to authenticated
  with check (
    organization_id in (select private.user_org_ids('analyst'))
    and created_by = (select auth.uid())
  );

-- Sem política de UPDATE: status e contagens são escritos pelo processamento
-- no servidor (service_role), nunca pelo navegador.

create policy data_imports_delete_admin on public.data_imports
  for delete to authenticated
  using (organization_id in (select private.user_org_ids('admin')));

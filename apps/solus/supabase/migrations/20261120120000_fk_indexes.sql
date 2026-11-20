-- Índices para as chaves estrangeiras que o Postgres percorre ao apagar ou
-- desfazer: sem eles, desfazer uma importação, excluir uma organização ou
-- uma conta lê a tabela filha inteira (de todas as organizações).
--
-- Um índice na coluna referenciada (import_id, run_id, user_id…) basta para
-- uma chave composta (organization_id, X): a busca é por X = valor. As
-- chaves já atendidas por um índice que começa em X ficaram de fora
-- (sale_items, inventory_snapshots, import_errors, import_batches,
-- analyst_messages, opportunity_events.opportunity_id). Colunas que aceitam
-- null usam índice parcial, menor; a igualdade da busca já implica não nulo.

-- Desfazer ou remover uma importação
create index sales_import_idx on public.sales (import_id);
create index products_created_import_idx on public.products (created_import_id) where created_import_id is not null;
create index products_updated_import_idx on public.products (updated_import_id) where updated_import_id is not null;
create index categories_source_import_idx on public.categories (source_import_id) where source_import_id is not null;
create index suppliers_source_import_idx on public.suppliers (source_import_id) where source_import_id is not null;
create index analysis_runs_import_idx on public.analysis_runs (import_id) where import_id is not null;

-- Execuções da análise e oportunidades
create index opportunities_last_run_idx on public.opportunities (last_run_id) where last_run_id is not null;
create index opportunity_events_run_idx on public.opportunity_events (run_id) where run_id is not null;
create index analyst_threads_opportunity_idx on public.analyst_threads (opportunity_id) where opportunity_id is not null;

-- Exclusão da organização (cascata direta pela organização)
create index import_batches_org_idx on public.import_batches (organization_id);
create index import_errors_org_idx on public.import_errors (organization_id);
create index opportunity_events_org_idx on public.opportunity_events (organization_id);

-- Exclusão de uma conta (autoria e registros da pessoa)
create index ai_requests_user_idx on public.ai_requests (user_id) where user_id is not null;
create index ai_summaries_created_by_idx on public.ai_summaries (created_by) where created_by is not null;
create index analysis_runs_triggered_by_idx on public.analysis_runs (triggered_by) where triggered_by is not null;
create index analysis_settings_updated_by_idx on public.analysis_settings (updated_by) where updated_by is not null;
create index analyst_threads_user_idx on public.analyst_threads (user_id);
create index data_imports_created_by_idx on public.data_imports (created_by) where created_by is not null;
create index data_imports_reverted_by_idx on public.data_imports (reverted_by) where reverted_by is not null;
create index opportunities_status_changed_by_idx on public.opportunities (status_changed_by) where status_changed_by is not null;
create index opportunity_events_actor_idx on public.opportunity_events (actor_id) where actor_id is not null;
create index organization_invitations_accepted_by_idx on public.organization_invitations (accepted_by) where accepted_by is not null;
create index organization_invitations_invited_by_idx on public.organization_invitations (invited_by) where invited_by is not null;
create index organizations_created_by_idx on public.organizations (created_by) where created_by is not null;

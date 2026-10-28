# Banco de dados

PostgreSQL do Supabase. Todo o esquema vem de `supabase/migrations/`, aplicado em ordem pelo nome do arquivo. Nunca altere o banco pelo painel sem criar uma migration correspondente.

## Migrations

| Arquivo | Conteúdo |
|---|---|
| `20261028170000_tenancy_schema.sql` | tipos, tabelas, privilégios por coluna, funções auxiliares do RLS, gatilhos (perfil, `updated_at`, guarda de papéis) |
| `20261028170100_tenancy_rls.sql` | ativa o RLS e cria as políticas de cada tabela |
| `20261028170200_tenancy_functions.sql` | limite de tentativas, `create_organization`, convites (`create_invitation`, `get_invitation`, `accept_invitation`) |
| `20261029100000_analytics_enums.sql` | novos status de importação (`validated`, `canceled`, `reverted`) |
| `20261029100100_analytics_schema.sql` | modelo analítico (produtos, categorias, fornecedores, vendas, itens, posições de estoque), lotes, problemas, área de preparação, parâmetros, execuções e oportunidades; RLS; bucket privado `imports` |
| `20261029100200_analytics_ingestion.sql` | envio e validação: `create_import`, `confirm_import_upload`, `save_import_mapping`, `stage_import_batch`, `finish_validation`, detecção de duplicatas, `import_issue_summary` |
| `20261029100250_analytics_commit.sql` | gravação e reversão: `start_import`, `commit_import_batch`, `finalize_import`, `cancel_import`, `revert_import`, `save_analysis_settings` |
| `20261029100300_analytics_metrics.sql` | métricas: `analytics_*`, `inventory_position`, `inventory_summary`, `analysis_parameters` (ver [métricas](metricas-e-estoque.md)) |
| `20261029100400_analytics_opportunities.sql` | `sync_opportunities` (só `service_role`) e `set_opportunity_status` (ver [motor](intelligence-engine.md)) |

Os tipos TypeScript ficam em `src/types/database.ts`. Ao mudar o esquema, atualize-os no mesmo commit (com o CLI: `supabase gen types typescript --linked > src/types/database.ts`).

## Tabelas

### `organizations`
Empresas (tenants).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | 2–80 caracteres, sem espaços nas pontas |
| `slug` | text | único, `a-z0-9-`, gerado pelo banco na criação; imutável para o cliente |
| `created_by` | uuid → profiles | quem criou |
| `created_at`, `updated_at` | timestamptz | `updated_at` por gatilho |

### `profiles`
Perfil de cada usuário do Supabase Auth, criado por gatilho em `auth.users`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK = `auth.users.id` (exclusão em cascata) |
| `full_name` | text | até 120 caracteres |
| `email` | text | espelho de `auth.users.email`, mantido por gatilho; não editável pelo cliente |
| `avatar_url` | text | apenas `https://` |
| `created_at`, `updated_at` | timestamptz | |

Senhas nunca ficam nestas tabelas: são do Supabase Auth.

### `organization_members`
Vínculo pessoa ↔ organização. Uma pessoa pode estar em várias organizações.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `organization_id` | uuid → organizations | cascata |
| `user_id` | uuid → profiles | cascata |
| `role` | `org_role` | `owner`, `admin`, `analyst`, `viewer` |
| `created_at`, `updated_at` | timestamptz | |

Único por (`organization_id`, `user_id`).

### `organization_invitations`
Convites por link.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `organization_id` | uuid | cascata |
| `email` | text | minúsculo; o convite só vale para esse e-mail |
| `role` | `org_role` | nunca `owner` |
| `token_hash` | bytea | SHA-256 do token; ilegível para o cliente |
| `invited_by`, `accepted_by` | uuid → profiles | |
| `expires_at` | timestamptz | 7 dias |
| `accepted_at` | timestamptz | uso único |

No máximo um convite pendente por e-mail e organização.

### `data_imports`
Cada arquivo importado, do envio à conclusão (ver [importação](importacao-de-dados.md)). Criada só por `create_import`; alterada só pelas RPCs da importação.

| Coluna | Tipo | Notas |
|---|---|---|
| `organization_id` | uuid | cascata |
| `dataset` | `import_dataset` | `sales`, `products`, `inventory`, `suppliers` |
| `file_name` | text | 1–255; só exibição |
| `file_format`, `file_size`, `file_sha256` | text, bigint, text | declarados pelo navegador e conferidos no arquivo guardado |
| `storage_path` | text | `<organização>/<importação>/original.<csv\|xlsx>`, definido pelo banco |
| `status` | `import_status` | `pending` → `validated` → `processing` → `completed` / `with_errors`; ou `failed`, `canceled`, `reverted` |
| `sheet_name`, `mapping`, `options` | text, jsonb | aba, mapeamento (campo → cabeçalho) e opções de leitura usadas |
| `summary` | jsonb | resumo da validação (período, receita, duplicatas, SKUs novos…) |
| `total_rows`, `valid_rows`, `error_count`, `warning_count`, `duplicate_rows`, `record_count`, `skipped_rows`, `batch_count` | integer | contagens de cada etapa |
| `duplicate_policy` | text | decisão sobre duplicatas incertas |
| `period_start`, `period_end` | date | vendas/estoque: o intervalo do que foi **gravado** (nulo se nada) |
| `created_by`, `file_verified_at`, `validated_at`, `started_at`, `completed_at`, `reverted_at`, `reverted_by`, `failure_reason` | | trilha de cada etapa |

### Modelo analítico

Todas as tabelas têm `organization_id` e chaves estrangeiras compostas (`organization_id`, `id`): uma linha nunca aponta para outra organização. Valores em dinheiro são `numeric`.

| Tabela | Conteúdo | Chave de unicidade |
|---|---|---|
| `categories` | categorias de produto | nome normalizado (sem acentos, minúsculas) |
| `suppliers` | fornecedores, código, prazo de entrega | nome normalizado |
| `products` | SKU (texto original e chave), nome, categoria, fornecedor, unidade, custo e preço atuais, prazo, perecível, ativo, `catalog_complete` | `sku_key` |
| `sales` | documentos de venda (pedido/cupom), data, canal, importação de origem | número do documento |
| `sale_items` | itens: data, tipo (`sale`/`return`), quantidade, preço, desconto, custo e sua origem (`file`, `catalog`, `none`), impressão digital, importação e linha do arquivo; valores bruto, líquido e custo calculados pelo banco | importação + linha |
| `inventory_snapshots` | posição de estoque por produto e data, com custo e origem, importação e linha | importação + produto + data |
| `import_batches` | lotes de cada importação (hash do conteúdo, contagens, gravado em) | importação + índice |
| `import_errors` | erros e avisos por linha e campo, com o valor original | — |
| `private.import_rows` | área de preparação entre a validação e a gravação (fora da API) | importação + linha |
| `analysis_settings` | parâmetros de análise da organização | organização |
| `analysis_runs` | cada execução do motor | — |
| `opportunities` | oportunidades: tipo, entidade, prioridade, confiança, impacto e tipo de impacto, método, fatos, hipóteses, recomendações, status, ativa | `dedupe_key` (tipo + entidade) |
| `opportunity_events` | histórico de detecções e mudanças de status | — |

Índices principais: `sale_items (organization_id, sold_at)`, `(organization_id, product_id, sold_at)`, `(organization_id, fingerprint)`, `(import_id)`; posições por produto e data; problemas por importação, gravidade e linha; oportunidades por organização, status e prioridade.

### Storage: bucket `imports`
Privado, até 25 MB, só `text/csv` e XLSX (arquivos `.txt` e `.tsv` são enviados como `text/csv`). Um diretório por organização. Políticas em `storage.objects`: enviar só no caminho de uma importação `pending` da própria pessoa; ler a partir de analyst; apagar owner/admin; sem atualização (o original nunca é sobrescrito).

### `private.rate_limits`
Contadores de tentativas por janela fixa, compartilhados entre instâncias. Fica no schema `private`, fora da API.

## Funções

| Função | Quem executa | Faz |
|---|---|---|
| `public.create_organization(name)` | authenticated | cria a organização e o vínculo de owner na mesma transação; 5 por hora por pessoa |
| `public.create_invitation(org, email, role)` | authenticated (owner/admin conferido dentro) | gera token de 256 bits, guarda o hash, devolve o token uma vez; 30 por hora |
| `public.get_invitation(token)` | authenticated | prévia: organização, papel, e-mail mascarado, se coincide com a conta |
| `public.accept_invitation(token)` | authenticated | exige e-mail confirmado e igual ao convidado; uso único |
| `public.check_rate_limit(bucket, limit, window)` | **apenas service_role** | limite antes do login |
| `private.user_org_ids(min_role)` | authenticated (via políticas) | organizações do usuário com papel mínimo |
| `private.visible_profile_ids()` | authenticated (via políticas) | o próprio perfil e o dos colegas |
| RPCs de importação (`create_import` … `revert_import`) | authenticated (analyst+, autor ou owner/admin conferidos dentro) | ver [importação](importacao-de-dados.md) |
| `public.import_issue_summary(import)` | authenticated (RLS de `import_errors`) | problemas agrupados por tipo |
| `public.analytics_*`, `inventory_*`, `analysis_parameters` | authenticated (SECURITY INVOKER, RLS de quem consulta) | métricas ([métricas](metricas-e-estoque.md)) |
| `public.save_analysis_settings(org, settings)` | authenticated (owner/admin conferido dentro) | parâmetros validados por faixa |
| `public.set_opportunity_status(id, status, note)` | authenticated (analyst+ conferido dentro) | muda o status e registra o evento |
| `public.sync_opportunities(…)` | **apenas service_role** | grava o resultado do motor ([motor](intelligence-engine.md)) |
| `private.active_import_ids(org)` | authenticated, service_role | importações cujos dados valem para os painéis |

## Gatilhos

| Gatilho | Tabela | Faz |
|---|---|---|
| `on_auth_user_created` | `auth.users` | cria o perfil |
| `on_auth_user_email_changed` | `auth.users` | atualiza o e-mail do perfil |
| `organization_members_guard` | `organization_members` | aplica as regras de papéis e impede organização sem owner |
| `*_touch` | todas com `updated_at` | atualiza `updated_at` |

# Banco de dados

PostgreSQL do Supabase. Todo o esquema vem de `supabase/migrations/`, aplicado em ordem pelo nome do arquivo. Nunca altere o banco pelo painel sem criar uma migration correspondente.

## Migrations

| Arquivo | Conteúdo |
|---|---|
| `20261028170000_tenancy_schema.sql` | tipos, tabelas, privilégios por coluna, funções auxiliares do RLS, gatilhos (perfil, `updated_at`, guarda de papéis) |
| `20261028170100_tenancy_rls.sql` | ativa o RLS e cria as políticas de cada tabela |
| `20261028170200_tenancy_functions.sql` | limite de tentativas, `create_organization`, convites (`create_invitation`, `get_invitation`, `accept_invitation`) |

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
Histórico de importações (o processamento chega com o motor analítico).

| Coluna | Tipo | Notas |
|---|---|---|
| `organization_id` | uuid | cascata |
| `dataset` | `import_dataset` | `sales`, `products`, `inventory`, `suppliers` |
| `file_name` | text | 1–255 |
| `status` | `import_status` | `pending` ao criar; só o servidor altera |
| `record_count`, `error_count` | integer | ≥ 0; só o servidor altera |
| `created_by` | uuid | `auth.uid()` por padrão |

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

## Gatilhos

| Gatilho | Tabela | Faz |
|---|---|---|
| `on_auth_user_created` | `auth.users` | cria o perfil |
| `on_auth_user_email_changed` | `auth.users` | atualiza o e-mail do perfil |
| `organization_members_guard` | `organization_members` | aplica as regras de papéis e impede organização sem owner |
| `*_touch` | todas com `updated_at` | atualiza `updated_at` |

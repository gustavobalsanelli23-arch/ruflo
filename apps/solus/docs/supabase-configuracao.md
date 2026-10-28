# Configuração do Supabase

O código está pronto para um projeto Supabase, mas **nenhum projeto foi criado nem conectado ainda**. Esta página lista exatamente o que precisa ser feito e o que fornecer.

## 1. Criar o projeto

1. Em [supabase.com](https://supabase.com), crie um projeto (região sugerida: São Paulo, `sa-east-1`).
2. Guarde a senha do banco num gerenciador de senhas. Ela não vai para o app.

## 2. Aplicar as migrations

Opção A, com o Supabase CLI (recomendada):

```bash
cd apps/solus
supabase login
supabase link --project-ref <ref-do-projeto>
supabase db push          # aplica supabase/migrations em ordem
```

Opção B, sem CLI: no painel, em **SQL Editor**, execute o conteúdo de cada arquivo de `supabase/migrations/`, na ordem do nome.

Depois, confira em **Database → Tables** que as cinco tabelas aparecem com **RLS enabled**.

## 3. Configurar o Auth (painel → Authentication)

| Onde | Valor |
|---|---|
| URL Configuration → Site URL | o domínio do app, ex.: `https://solus-psi.vercel.app` |
| URL Configuration → Redirect URLs | `https://<domínio>/auth/confirm` e, para previews, `https://*-<time>.vercel.app/auth/confirm` |
| Sign In / Providers → Email | habilitado, **Confirm email** ligado |
| Sign In / Providers → Email | **Secure password change** ligado |
| Passwords | mínimo 8 caracteres, "letters and digits"; ligar **Leaked password protection** (plano Pro) |
| Sessions | manter o refresh token rotation ligado (padrão) |
| Rate Limits | revisar os limites; o app já aplica os próprios (ver [segurança](seguranca-rls.md)) |

### Modelos de e-mail (Authentication → Emails → Templates)

Os links precisam apontar para `/auth/confirm` com `token_hash`, que funciona mesmo quando o e-mail é aberto em outro aparelho. Copie o HTML de:

| Modelo no painel | Arquivo |
|---|---|
| Confirm signup | `supabase/templates/confirmation.html` |
| Reset password | `supabase/templates/recovery.html` |
| Change email address | `supabase/templates/email-change.html` |

Se os modelos padrão forem mantidos, o app também aceita o link padrão (fluxo PKCE), mas aí o e-mail precisa ser aberto **no mesmo navegador** em que o pedido foi feito.

### SMTP

O SMTP embutido do Supabase só entrega para endereços da equipe do projeto e tem limite baixo por hora. Para uso real, configure um SMTP próprio (Resend, Postmark, SES…) em **Authentication → Emails → SMTP Settings**.

## 4. Variáveis de ambiente na Vercel

Projeto `solus` → Settings → Environment Variables (Production e Preview):

| Variável | Onde encontrar |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → Publishable key |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → Secret key (**marque como Sensitive**) |
| `SITE_URL` | o domínio de produção (opcional na Vercel) |

Se você conectar o Supabase pela integração da Vercel, os nomes `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` criados por ela também funcionam.

Depois de salvar, faça um novo deploy.

## 5. Verificar

1. Abra `/cadastro`, crie uma conta e confirme pelo e-mail.
2. Crie a organização e veja o seu papel de proprietário em Configurações → Organização.
3. Rode a suíte de banco e, se possível, a E2E real (veja [testes](testes.md)).

## O que eu preciso receber para concluir a conexão

- Acesso ao projeto Supabase (ou as três variáveis acima cadastradas na Vercel).
- Para os testes E2E reais: um **segundo projeto, só de teste**, com SMTP que aceite os e-mails de teste, e as variáveis `SOLUS_E2E_*` no ambiente onde os testes rodam.

Nunca envie chaves por chat ou commit: cadastre-as direto na Vercel ou no ambiente de execução.

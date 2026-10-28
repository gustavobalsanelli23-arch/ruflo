# Testes

| Suíte | Comando | Onde roda | O que prova |
|---|---|---|---|
| Unitários e componentes | `npm test` | Vitest + jsdom | regras de redirecionamento, validação Zod, tabela de permissões, mapeamento de erros, Server Actions (com Supabase simulado), controles por papel |
| Banco (RLS) | `npm run test:db` | **PostgreSQL real** | isolamento entre organizações, matriz de papéis, IDOR, mass assignment, convites, limites, estrutura de segurança |
| E2E | `npm run test:e2e` | Playwright, build de produção | proteção de rotas, CSP e cabeçalhos, formulários (com e sem JavaScript), sessões forjadas, demonstração |
| E2E real | `npm run test:e2e:real` | Playwright + **projeto Supabase de teste** | cadastro, confirmação, login, organização, convite, papéis, recuperação, saída |

## Banco (RLS)

Os testes criam um banco descartável, aplicam as migrations e rodam cada cenário **como o PostgREST faz**: numa transação, com o papel `authenticated` e as claims do JWT em `request.jwt.claims`. Não há mocks: as políticas e os gatilhos que rodam são os do Postgres.

```bash
# Supabase local (supabase start): o banco já tem auth.users e os papéis da API
SOLUS_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run test:db

# PostgreSQL puro: o teste aplica tests/db/support/supabase-compat.sql,
# que reproduz os papéis e auth.uid() com as mesmas definições do Supabase
SOLUS_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres npm run test:db
```

A conexão precisa ser de superusuário (cria e apaga um banco `solus_test_*`). `SOLUS_TEST_DATABASE_URL` nunca deve apontar para produção.

Cenários: membro de A acessando A; membro de A tentando ler, alterar, excluir e inserir em B pelos IDs; usuário sem organização; usuário em duas organizações com papéis diferentes; matriz completa owner/admin/analyst/viewer para cada tabela e operação; último owner; convites (hash, uso único, e-mail errado, não confirmado, expirado, reemissão); limites; exclusão em cascata. Também verifica a estrutura: RLS em todas as tabelas, `anon` sem privilégios, `search_path` fixo e o hash do token ilegível.

## E2E

`npm run test:e2e` faz o build e sobe dois servidores com o mesmo build:

- `:3200`, sem Supabase: demonstração, redirecionamentos, aviso de "não configurado", cabeçalhos;
- `:3201`, com um endereço de Supabase onde nada responde: validação, erros, cookies de sessão corrompidos e forjados, convite guardado antes do login.

## E2E real

Exige um projeto Supabase **só de teste**, com as migrations aplicadas, SMTP que aceite os e-mails de teste (o SMTP embutido só entrega para a equipe do projeto) e o app rodando conectado a ele:

```bash
SOLUS_E2E_BASE_URL=http://localhost:3000 \
SOLUS_E2E_SUPABASE_URL=https://<projeto-de-teste>.supabase.co \
SOLUS_E2E_SUPABASE_SECRET_KEY=<secret-do-projeto-de-teste> \
SOLUS_E2E_EMAIL_DOMAIN=<domínio-aceito-pelo-smtp> \
npm run test:e2e:real
```

Os links de confirmação e recuperação são gerados pela API administrativa (nenhuma caixa de entrada é necessária) e tudo o que o teste cria é apagado no final. Sem essas variáveis, a suíte é pulada e aparece como `skipped`.

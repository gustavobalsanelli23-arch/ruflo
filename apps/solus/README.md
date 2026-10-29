# SOLUS

Inteligência de negócios para o varejo: lucro, estoque e oportunidades a partir dos dados de cada empresa. *See beyond the numbers.*

Estado atual (Parte 05): autenticação real com Supabase Auth, organizações multi-tenant isoladas por RLS e papéis de acesso; importação de planilhas (CSV e XLSX) com validação, detecção de duplicatas e histórico; métricas financeiras e de estoque calculadas no banco; motor determinístico de oportunidades com evidências; analista de IA (Claude) que consulta essas métricas por ferramentas, tem cada número da resposta conferido com os dados, explica oportunidades e escreve o resumo da Visão geral. Visão geral, Lucratividade, Estoque, Oportunidades, Analista e Dados usam os dados reais de cada organização. Uma demonstração com dados fictícios fica em `/demo`, sempre identificada e separada dos dados reais.

## Stack

Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript strict, Tailwind 4, Supabase (PostgreSQL, Auth, Storage), `@supabase/ssr`, API do Claude (`@anthropic-ai/sdk`), Zod, PapaParse e read-excel-file (leitura de planilhas no navegador), Vitest, Playwright.

## Como rodar localmente

```bash
cd apps/solus
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev                  # http://localhost:3000
```

Sem as variáveis do Supabase o app sobe normalmente: a tela de entrar avisa que o acesso não está configurado e a demonstração continua em `/demo/visao-geral`.

Para um Supabase local (requer Docker e o Supabase CLI):

```bash
supabase start            # sobe Postgres, Auth e API em http://127.0.0.1:54321
supabase db reset         # aplica supabase/migrations
# use a URL e as chaves exibidas pelo CLI no .env.local
```

## Variáveis de ambiente

Todas lidas só no servidor; nenhuma vai para o navegador. Detalhes em [.env.example](.env.example).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SUPABASE_URL` | sim | URL do projeto |
| `SUPABASE_PUBLISHABLE_KEY` | sim | chave publicável (ou `SUPABASE_ANON_KEY` legada) |
| `SUPABASE_SECRET_KEY` | sim em produção | chave secreta (ou `SUPABASE_SERVICE_ROLE_KEY`), usada só no servidor: limite de tentativas e gravação das oportunidades. Sem ela, as importações funcionam, mas as oportunidades não são recalculadas |
| `SITE_URL` | recomendada | origem dos links enviados por e-mail |
| `ANTHROPIC_API_KEY` | para ligar o analista | chave da API do Claude. Sem ela, o analista e o resumo da IA aparecem como "não configurado" |
| `SOLUS_AI_MODEL` / `SOLUS_AI_EFFORT` | não | modelo (padrão `claude-opus-5-5`) e esforço (`low`, `medium`, `high`; padrão `medium`) |
| `SOLUS_DEMO_AI` / `SOLUS_DEMO_AI_CODE` | não | `on` + código de 8+ caracteres liberam a IA na demonstração, só para quem tiver o código ([detalhes](docs/ia-analista.md#demonstração)) |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build e servidor de produção |
| `npm run typecheck` / `npm run lint` | TypeScript e ESLint |
| `npm test` | testes unitários e de componentes (Vitest) |
| `npm run test:db` | RLS, importação, métricas, oportunidades, IA e volume num PostgreSQL real (`SOLUS_TEST_DATABASE_URL`) |
| `npm run test:e2e` | build + E2E (Playwright) em dois servidores locais |
| `npm run test:e2e:real` | E2E contra um projeto Supabase de teste (credenciais em env) |

## Estrutura

```
src/
  app/
    (auth)/        entrar, cadastro, recuperar e redefinir senha, confirmação, nova organização, convite
    (app)/         área da organização (exige sessão e organização ativa)
    demo/          demonstração com dados fictícios
    api/           rotas do analista (respostas em NDJSON)
  components/      design system, shell (sidebar, topbar, seletor de organização)
  modules/         telas por domínio (auth, organizations, settings, overview, data-hub, opportunities…)
  services/        acesso a dados no servidor (sessão, workspace, organização, importações, métricas, motor)
  schemas/         validação com Zod
  lib/             env, Supabase (clientes, cookies, erros), permissões, segurança
    ingest/        leitura, mapeamento, normalização e validação de planilhas (navegador e servidor)
    intelligence/  motor de oportunidades (regras determinísticas)
    analytics/     montagem dos painéis a partir das métricas
    ai/            analista: ferramentas, laço com o modelo, conferência de números, prompt
  types/           tipos do banco
  proxy.ts         sessão, proteção de rotas, CSP com nonce
supabase/
  migrations/      SQL versionado (esquema, RLS, funções)
  templates/       e-mails de confirmação, recuperação e troca de e-mail
  config.toml      Supabase CLI local
tests/
  unit/            Vitest (regras, ações, componentes)
  db/              RLS, importação, métricas e volume em PostgreSQL real
  e2e/             Playwright
  e2e-real/        Playwright contra Supabase de teste
```

## Limitações atuais

- Lucro **bruto** apenas: impostos, frete, comissões e despesas não estão nos arquivos e não são descontados.
- Estoque por posições importadas (fotografias), não por movimentações.
- Sem `.xls` (Excel 97-2003) nem planilhas protegidas por senha.
- Sem integração direta com ERPs ou PDVs: os dados entram por planilha.
- Sem previsão de demanda ou sazonalidade; o motor é por regras e não aprende sozinho.
- O analista de IA ainda não foi exercitado contra a API real (sem chave neste ambiente): qualidade, tempo e custo por pergunta precisam ser medidos antes de abrir para clientes ([limitações](docs/ia-analista.md#limitações)).
- A conferência da IA cobra números e datas, não o raciocínio.
- Envio ao Storage, Auth e o E2E da importação ainda não foram executados contra um projeto Supabase real (ver [testes](docs/testes.md)).

## Documentação

- [Configuração do Supabase](docs/supabase-configuracao.md): o que criar e preencher, passo a passo
- [Banco de dados e migrations](docs/banco-de-dados.md)
- [Segurança e RLS](docs/seguranca-rls.md)
- [Papéis e permissões](docs/papeis-e-permissoes.md)
- [Fluxo de autenticação](docs/autenticacao.md)
- [Importação de dados](docs/importacao-de-dados.md): formatos, mapeamento, normalização, validação, duplicatas, histórico
- [Métricas e estoque](docs/metricas-e-estoque.md): fórmulas, decisões de cálculo, parâmetros
- [Intelligence Engine](docs/intelligence-engine.md): regras, confiança, impacto, prioridade, status
- [Analista de IA](docs/ia-analista.md): ferramentas, conferência de números, limites, privacidade, demonstração
- [Testes](docs/testes.md)

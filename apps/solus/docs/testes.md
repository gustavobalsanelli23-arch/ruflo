# Testes

| Suíte | Comando | Onde roda | O que prova |
|---|---|---|---|
| Unitários e componentes | `npm test` | Vitest + jsdom | regras de redirecionamento, validação Zod, permissões, mapeamento de erros; leitura, normalização e validação de planilhas; motor de oportunidades; Server Actions (com Supabase simulado); assistente de importação com um CSV real; telas por papel; analista de IA (conferência de números, laço de ferramentas, rotas e telas ao vivo, com um modelo roteirizado no lugar da API) |
| Banco | `npm run test:db` | **PostgreSQL real** | isolamento entre organizações e matriz de papéis; importação (lotes, idempotência, duplicatas, cancelar, desfazer); métricas calculadas à mão; oportunidades; Storage; volume |
| E2E | `npm run test:e2e` | Playwright, build de produção | proteção de rotas, CSP e cabeçalhos, formulários (com e sem JavaScript), sessões forjadas, demonstração |
| E2E real | `npm run test:e2e:real` | Playwright + **projeto Supabase de teste** | cadastro, confirmação, login, organização, convite, papéis, recuperação, saída; importação de vendas do arquivo aos painéis, reimportação sem duplicar e desfazer |

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

Arquivos em `tests/db/`:

| Arquivo | Cobre |
|---|---|
| `isolation`, `roles`, `organizations`, `invitations`, `structure` | Parte 03: organizações, membros, convites, limites, estrutura de segurança |
| `ingestion.test.ts` | fluxo completo, rastreabilidade, lotes idempotentes, lote fora do formato recusado, validação incompleta, importação sem linhas válidas, uma gravação por vez, duplicatas (exata, documento, possível, no mesmo arquivo, reavaliadas na gravação), período só do que foi gravado, cancelar no meio, desfazer, cadastros e estoque |
| `analytics-security.test.ts` | leitura só da própria organização, nenhuma escrita direta, `anon`, área de preparação, chave composta, quem cria e conduz, arquivo conferido, nome do arquivo, desfazer, parâmetros, bucket, políticas de envio, leitura, exclusão e sobrescrita, gravação de oportunidades só com a chave secreta, status |
| `metrics.test.ts` | receita bruta, descontos, devoluções, líquida, CMV, lucro, margem, ticket, cobertura de custo, por produto, categoria e fornecedor, posição e resumo de estoque, com valores **calculados à mão** num conjunto pequeno |
| `opportunities.test.ts` | gravação sem duplicar, ciclo de status (nova, resolvida pelo sistema, detectada de novo, descartada) e eventos |
| `pipeline.test.ts` | CSV em Windows-1252 com números e datas brasileiros → biblioteca de importação → RPCs → métricas → motor → gravação |
| `volume.test.ts` | 200 mil itens de venda e 2 mil produtos: tempo das métricas e da ingestão |
| `ai.test.ts` | conversas visíveis só para quem as criou (nem owner lê), leitor bloqueado, chaves compostas entre organizações, data da conversa e cascata, registro de uso só pelas funções, limites por pessoa e por organização, resumos (quem grava, quem lê, período válido) |

Tempos medidos no `volume.test.ts` (PostgreSQL 16 local, 200 mil itens; o teste falha acima do limite entre parênteses):

| Consulta | Medido | Limite |
|---|---|---|
| resumo do ano | 252 ms | 2.500 ms |
| resumo do mês | 23 ms | 800 ms |
| série diária do ano | 222 ms | 2.500 ms |
| 50 produtos de maior receita no ano | 307 ms | 3.000 ms |
| categorias do mês | 41 ms | 1.500 ms |
| posição de estoque (2 mil produtos) | 103 ms | 1.000 ms |
| resumo do estoque | 173 ms | 1.200 ms |
| ingestão de 20 mil linhas (validação + gravação, lotes de 2.000) | 2,4 s | 60 s |

O Storage é reproduzido pelo esquema `storage` de `supabase-compat.sql` (buckets e objetos com RLS), com as mesmas políticas das migrations; o serviço de Storage real só é exercitado no E2E real.

Cenários da Parte 03: membro de A acessando A; membro de A tentando ler, alterar, excluir e inserir em B pelos IDs; usuário sem organização; usuário em duas organizações com papéis diferentes; matriz completa owner/admin/analyst/viewer para cada tabela e operação; último owner; convites (hash, uso único, e-mail errado, não confirmado, expirado, reemissão); limites; exclusão em cascata. Também verifica a estrutura: RLS em todas as tabelas, `anon` sem privilégios, `search_path` fixo e o hash do token ilegível.

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

O app usado pelo E2E real precisa ter `SUPABASE_SECRET_KEY` configurada para que as oportunidades sejam recalculadas depois da importação (sem ela, a importação passa e a tela avisa que a análise não rodou).

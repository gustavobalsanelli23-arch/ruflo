# Segurança e Row Level Security

Princípio: **o banco é a fronteira final**. O proxy, as páginas e as Server Actions conferem sessão e papel para dar boas mensagens, mas cada leitura e escrita é feita com a sessão do próprio usuário e passa pelo RLS. Mesmo um erro no código da aplicação não abre dados de outra organização.

## Políticas RLS

RLS ativo em todas as tabelas do schema `public` (há um teste que falha se alguma ficar sem). `anon` não tem nenhum privilégio. Ausência de política = operação negada.

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `organizations` | membros | negado (só `create_organization`) | owner/admin, só a coluna `name` | owner |
| `profiles` | o próprio e colegas de organização | negado (gatilho do Auth) | o próprio, só `full_name` e `avatar_url` | negado (cascata da conta) |
| `organization_members` | membros da mesma organização | negado (só `create_organization` e `accept_invitation`) | owner/admin, só `role`, mais o gatilho de papéis | o próprio membro (sair) ou owner/admin, mais o gatilho |
| `organization_invitations` | owner/admin (sem `token_hash`) | negado (só `create_invitation`) | negado (só `accept_invitation`) | owner/admin |
| `data_imports` | membros | negado (só `create_import`) | negado (só as RPCs da importação) | owner/admin, só `failed`, `canceled` ou `reverted` |
| `categories`, `suppliers`, `products`, `sales`, `sale_items`, `inventory_snapshots` | membros | negado (só `commit_import_batch`) | negado | negado (só `cancel_import`/`revert_import`) |
| `import_batches`, `import_errors` | membros | negado (só as RPCs) | negado | negado |
| `analysis_settings` | membros | negado (só `save_analysis_settings`, owner/admin) | negado | negado |
| `analysis_runs`, `opportunities` | membros | negado (só `sync_opportunities`, `service_role`) | negado (status só por `set_opportunity_status`, analyst+) | negado |
| `opportunity_events` | membros | negado (gravado pelas funções) | negado | negado |
| `private.import_rows` | fora da API | — | — | — |
| `storage.objects` (bucket `imports`) | analyst ou superior da organização do caminho | só no caminho de uma importação `pending` da própria pessoa, ainda sem arquivo | negado (nunca sobrescreve) | owner/admin |

Nomes das políticas: `supabase/migrations/20261028170100_tenancy_rls.sql` e `20261029100100_analytics_schema.sql`.

### Escritas analíticas só por funções

Os clientes têm apenas `SELECT` nas tabelas analíticas. Toda escrita passa por funções que:

- identificam a pessoa por `auth.uid()` e conferem o papel (`private.require_member`) e, para conduzir uma importação, autoria ou papel owner/admin (`private.lock_import`);
- recebem o `organization_id` só por meio da importação travada: um lote não escolhe a organização onde é gravado;
- **revalidam cada linha** (tipos, faixas, tamanhos, datas) e recusam o lote inteiro se algo estiver fora do formato. O banco não confia no navegador nem no servidor da aplicação;
- serializam as gravações por organização (advisory lock) e mantêm uma importação em processamento por vez;
- têm `search_path = ''` e nomes totalmente qualificados.

As funções de métricas são `SECURITY INVOKER`: rodam com o RLS de quem consulta, então uma pessoa nunca obtém números de outra organização, mesmo passando outro `organization_id` (o resultado vem vazio).

### Chave secreta (service_role)

Usada só no servidor, em `src/lib/supabase/admin.ts` (`server-only`), para duas coisas: o limite de tentativas antes do login e a gravação das oportunidades (`sync_opportunities`). Antes de usá-la para as oportunidades, o servidor confere a sessão e o papel; a função confere de novo que quem disparou é analyst ou superior na organização, que cada entidade citada pertence a ela e que a chave de cada oportunidade corresponde ao tipo.

### Gatilho de papéis (`private.guard_membership_change`)

RLS decide *quem* toca uma linha; o gatilho decide *qual mudança* é válida:

- owner altera ou remove qualquer membro;
- admin só altera ou remove analistas e leitores, e só para esses papéis (não promove a admin nem a owner, não mexe em admins nem em owners, não altera o próprio papel);
- qualquer membro pode sair;
- a organização nunca fica sem owner. A verificação trava a linha da organização, então dois owners não conseguem se rebaixar ao mesmo tempo;
- `organization_id` e `user_id` de um vínculo são imutáveis.

## Decisões sobre funções auxiliares

- **SECURITY DEFINER** apenas onde é preciso ler `organization_members` sem disparar o RLS da própria tabela. Isso evita a recursão infinita clássica de políticas que consultam a tabela que protegem.
- Todas em `search_path = ''` e com nomes totalmente qualificados. Isso impede o sequestro do `search_path` (há um teste que falha se alguma função `SECURITY DEFINER` não fixar o `search_path`).
- As auxiliares ficam no schema `private`, que não é exposto pela API. `EXECUTE` foi revogado de `PUBLIC` e concedido só a `authenticated`.
- As RPCs identificam o usuário **apenas** por `auth.uid()`, nunca por parâmetro, e conferem o papel dentro do banco.
- `check_rate_limit` só pode ser executada por `service_role`.
- Nas políticas, `(select auth.uid())` e `(select private.user_org_ids(...))` são avaliados uma vez por consulta, não por linha.

## Ameaças tratadas

| Ameaça | Como |
|---|---|
| Acesso a outra empresa por troca de ID (IDOR) | RLS em todas as tabelas; as ações também filtram pela organização ativa; os testes provam que `UPDATE`/`DELETE` com IDs de outra organização afetam 0 linhas |
| `organization_id` forjado pelo navegador | as ações de escrita não aceitam `organization_id`: usam a organização ativa, revalidada contra os vínculos do usuário; o banco confere de novo |
| Mass assignment | privilégios por coluna no banco (ex.: só `role` em membros, só `name` em organizações) e esquemas Zod que leem apenas os campos esperados |
| SQL injection | consultas parametrizadas (supabase-js/PostgREST); IDs validados como UUID e tokens como hex antes de chegar ao banco; nenhuma SQL dinâmica nas funções |
| XSS | React escapa a saída; nenhum `dangerouslySetInnerHTML` com dados do usuário; CSP com nonce por requisição e `strict-dynamic`; cookies de sessão HttpOnly |
| CSRF | Server Actions só aceitam POST de mesma origem (verificação de `Origin` do Next.js); cookies `SameSite=Lax`; confirmação de links por botão (POST), não por GET |
| Força bruta e abuso | limite no Postgres, compartilhado entre instâncias: entrar (30 por IP e 10 por e-mail a cada 15 min), cadastro, reenvio e recuperação (por IP e por e-mail, por hora), criação de organização (5/h) e convites (30/h); além dos limites do próprio Supabase Auth |
| Enumeração de contas | cadastro e recuperação respondem igual exista ou não a conta; login com mensagem genérica |
| Sessão | cookies HttpOnly, `Secure` em produção e `SameSite=Lax`; JWT verificado com `getClaims()` em cada requisição; renovação no proxy; saída local ou de todas as sessões; troca de senha encerra as outras sessões; redefinição encerra todas |
| Redefinir senha com sessão roubada | exige ter aberto o link de recuperação **desta conta** nos últimos 15 min (cookie HttpOnly com o id do usuário verificado, apagado ao sair); nas configurações, exige a senha atual |
| Open redirect | `next` aceita só caminhos internos (`safeNextPath`) |
| Host header injection em e-mails | links usam `SITE_URL` ou o domínio da Vercel, nunca o `Host` da requisição |
| Vazamento de segredos | chave secreta só em `src/lib/supabase/admin.ts` (`server-only`), para o limite de tentativas e a gravação das oportunidades; nenhuma variável `NEXT_PUBLIC_`; o navegador só recebe URLs assinadas de envio, de uso único e para um caminho fixo |
| Logs | `logServerError` registra apenas nome, código e status do erro; nunca mensagens, e-mails, tokens ou senhas |
| Erros | mensagens traduzidas e acionáveis; detalhes internos do banco nunca chegam à tela |
| Arquivo malicioso | formato detectado pelo conteúdo (não pela extensão) no navegador e de novo no servidor, sobre o arquivo guardado; `.xls`/OLE, PDF, imagens, executáveis e binários recusados; bucket privado com tipos e tamanho limitados; o arquivo nunca é executado nem servido de volta como página |
| Arquivo trocado depois da validação | o servidor confere tamanho, SHA-256 e assinatura do arquivo guardado; a política do Storage impede sobrescrever |
| Arquivos e linhas gigantes | 25 MB, 200 mil linhas, 100 colunas, 2.000 linhas por lote (1.000 enviadas pelo app), textos com limite de tamanho, até 50 mil problemas registrados por importação, 60 importações por hora por pessoa |
| Injeção via conteúdo da planilha | valores tratados como dados: parametrizados no banco, escapados pelo React; nenhuma fórmula é avaliada (XLSX lido como valores) |
| Mistura de organizações nos dados | `organization_id` em todas as tabelas, chaves estrangeiras compostas (`organization_id`, `id`), RLS de leitura por organização; os testes tentam ler todas as tabelas, criar, conduzir e desfazer importações, alterar parâmetros e status e gravar oportunidades a partir de outra organização |
| Clickjacking e afins | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, HSTS |

### Limite de tentativas em várias instâncias

O contador mora no Postgres (`private.rate_limits`), não na memória do servidor, então vale para todas as instâncias da Vercel. Antes do login ele é chamado com a chave secreta. **Em produção, sem `SUPABASE_SECRET_KEY`, entrar, cadastrar e recuperar senha são recusados** (falha fechada). O IP vem de `x-forwarded-for`, definido pela Vercel. Em hospedagem própria, o proxy reverso precisa sobrescrever esse cabeçalho.

## MFA para administradores (avaliação)

O Supabase Auth oferece TOTP e telefone. A recomendação para a próxima etapa:

1. Permitir o cadastro de TOTP em Configurações → Segurança.
2. Exigir `aal2` de owners e admins para ações administrativas, no banco: uma política RESTRICTIVE com `(select auth.jwt() ->> 'aal') = 'aal2'` nas operações de membros, convites e exclusão da organização.
3. Pedir o desafio MFA ao entrar quando a conta tiver fator cadastrado.

Ainda não implementado: depende de decisão de produto (obrigatório ou opcional, recuperação de fator perdido).

## Riscos conhecidos

- Sem projeto Supabase conectado, os fluxos de Auth reais, o envio ao Storage e o E2E da importação não foram executados (ver [testes](testes.md)). As políticas do Storage foram testadas no PostgreSQL com o esquema `storage` reproduzido, não no serviço de Storage real.
- A conferência do conteúdo do arquivo guardado (SHA-256 e assinatura do formato) é feita pelo servidor da aplicação antes de chamar `confirm_import_upload`; o banco confere só a existência e o tamanho do objeto. Um analista que chame a API do Supabase diretamente com a própria sessão pode pular essa conferência. O efeito é limitado à importação dele: as linhas são revalidadas pelo banco em `stage_import_batch`, o arquivo original nunca é processado no servidor nem servido a outras pessoas, e o bucket continua restrito a CSV/XLSX e 25 MB. O que se perde é apenas a garantia de que o original guardado é o arquivo de onde vieram as linhas.
- A URL assinada de envio é criada com a sessão da pessoa e vale por 2 horas (padrão do Supabase); quem a obtiver nesse intervalo pode enviar um arquivo para aquele caminho, mas o servidor recusa a importação se o conteúdo não for o declarado.
- Convites por link: quem tiver o link e a conta do e-mail convidado entra. O link vale 7 dias e funciona uma vez.
- O limite por IP usa o IP visto pelo servidor; atrás de NAT corporativo, várias pessoas dividem o mesmo contador (os limites são generosos por isso).
- O Supabase Auth também limita por IP. Como as chamadas de login saem do servidor, esse limite do Auth enxerga o IP da Vercel; com volume alto, ajuste os limites do Auth no painel.
- `style-src 'unsafe-inline'` permanece na CSP porque gráficos e animações aplicam estilos inline (estilos não executam scripts).

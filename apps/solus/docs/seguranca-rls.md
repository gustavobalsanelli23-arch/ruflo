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
| `data_imports` | membros | analyst ou superior, na própria organização, como autor | negado (o servidor processa) | owner/admin |

Nomes das políticas: veja `supabase/migrations/20261028170100_tenancy_rls.sql`.

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
| Redefinir senha com sessão roubada | exige ter aberto o link de recuperação nos últimos 15 min (cookie HttpOnly); nas configurações, exige a senha atual |
| Open redirect | `next` aceita só caminhos internos (`safeNextPath`) |
| Host header injection em e-mails | links usam `SITE_URL` ou o domínio da Vercel, nunca o `Host` da requisição |
| Vazamento de segredos | chave secreta só em `src/lib/supabase/admin.ts` (`server-only`); nenhuma variável `NEXT_PUBLIC_`; build verificado sem referências ao Supabase no JavaScript do navegador |
| Logs | `logServerError` registra apenas nome, código e status do erro; nunca mensagens, e-mails, tokens ou senhas |
| Erros | mensagens traduzidas e acionáveis; detalhes internos do banco nunca chegam à tela |
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

- Sem projeto Supabase conectado, os fluxos de Auth reais não foram executados (ver [testes](testes.md)).
- Convites por link: quem tiver o link e a conta do e-mail convidado entra. O link vale 7 dias e funciona uma vez.
- O limite por IP usa o IP visto pelo servidor; atrás de NAT corporativo, várias pessoas dividem o mesmo contador (os limites são generosos por isso).
- O Supabase Auth também limita por IP. Como as chamadas de login saem do servidor, esse limite do Auth enxerga o IP da Vercel; com volume alto, ajuste os limites do Auth no painel.
- `style-src 'unsafe-inline'` permanece na CSP porque gráficos e animações aplicam estilos inline (estilos não executam scripts).

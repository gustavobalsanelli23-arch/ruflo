# Fluxo de autenticação

Supabase Auth (e-mail e senha) via `@supabase/ssr`. Todas as chamadas ao Supabase acontecem no servidor: Server Components, Server Actions e `proxy.ts`. A sessão vive em cookies **HttpOnly**, e o navegador nunca vê tokens.

## Telas

| Rota | Função |
|---|---|
| `/entrar` | login; aceita `?next=` (só caminhos internos) e `?motivo=` (sessão expirada, saiu etc.) |
| `/cadastro` | nome, e-mail e senha → "confirme seu e-mail", com reenvio limitado a 1 por minuto |
| `/recuperar-senha` | pede o link de recuperação; mesma resposta para qualquer e-mail |
| `/auth/confirm` | recebe os links do e-mail (`token_hash` + `type`, ou `code` do fluxo PKCE) e confirma com um botão |
| `/redefinir-senha` | nova senha; só funciona até 15 min depois de abrir o link de recuperação, e só para a conta daquele link |
| `/organizacoes/nova` | criação da organização (primeiro acesso ou outra empresa) |
| `/convite/[token]` | prévia e aceite de convite |

## Primeiro acesso

1. **Cadastro**: `signUp` com `emailRedirectTo = SITE_URL/auth/confirm` e o nome nos metadados.
2. **Confirmação**: o e-mail leva a `/auth/confirm`; o botão chama `verifyOtp` e cria a sessão.
3. **Entrar**: em `/visao-geral`, sem organização, a pessoa vai para `/organizacoes/nova`.
4. **Organização**: `create_organization` cria a empresa e torna a pessoa owner; o cookie da organização ativa é gravado.
5. **Painel**: a visão executiva mostra os primeiros passos (convidar a equipe, importar dados).

## Sessão

- `proxy.ts` roda em toda página: renova os tokens (rotação de refresh token), verifica o JWT com `getClaims()` e decide o acesso:
  - rota privada sem sessão vai para `/entrar?next=…`, com `motivo=sessao-expirada` se havia cookie de sessão;
  - `/entrar` e `/cadastro` com sessão vão para `/visao-geral`.
- O layout da área logada confere a sessão de novo (`requireWorkspace`). O proxy não é a única barreira.
- Server Actions conferem sessão e papel por conta própria. Se a sessão acabou, a interface leva para o login com o motivo.
- Ao voltar a uma aba depois de mais de 1 min, a sessão é revalidada. Sair em uma aba avisa as outras (`BroadcastChannel`).

## Sair

- **Sair**: `signOut({ scope: 'local' })` encerra só este navegador e apaga o cookie da organização ativa.
- **Encerrar outras sessões** (Configurações → Segurança): `scope: 'others'`.
- **Trocar a senha** (com a senha atual): encerra as outras sessões.
- **Redefinir a senha** (pelo link): encerra todas as sessões e pede novo login.

## Organização ativa

Guardada no cookie HttpOnly `solus-org`. É só uma preferência: em toda requisição é revalidada contra os vínculos do usuário. Um id de organização da qual a pessoa não é membro é ignorado, e o RLS barraria de qualquer forma. A troca é feita pelo seletor na barra superior.

## Convites

1. Owner ou admin gera o convite em Configurações → Membros. O link aparece **uma vez** para ser copiado e enviado por um canal confiável. O banco guarda só o hash.
2. Quem abre o link sem estar conectado vai para `/entrar?next=/convite/…`. O convite fica guardado num cookie HttpOnly por 24 h, para sobreviver à confirmação de e-mail no cadastro.
3. O aceite exige e-mail confirmado e igual ao convidado. O convite vale 7 dias e funciona uma vez.

O envio automático do convite por e-mail fica para quando houver SMTP próprio configurado.

## Senhas

Mínimo de 8 caracteres, com letras e números (validação no navegador e no servidor; configure a mesma regra no painel do Supabase). O máximo é 72, o limite do bcrypt. Senhas são do Supabase Auth: o app nunca as armazena nem as registra em log.

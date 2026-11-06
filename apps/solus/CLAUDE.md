# SOLUS — instruções para o Claude

Para ver e testar o app enquanto ele muda, use a skill **visualizar** (fluxo em `apps/CLAUDE.md`):
`node .claude/skills/visualizar/scripts/visualizar.mjs start apps/solus`. Sem Supabase o app sobe
normalmente e a demonstração fica em `/demo/visao-geral`.

Antes de concluir uma alteração: `npm run typecheck && npm run lint && npm test` e, se mexeu em tela,
`npm run test:e2e:iphone` (a suíte de celular no WebKit, em iPhone 17 Pro e iPhone SE).

## Particularidades do SOLUS no iPhone

- Neste tema `text-base` vale 14px. Campo com fonte < 16px faz o Safari dar zoom ao focar: use
  `text-[16px] md:text-sm`, como em `input.tsx` e `command.tsx`.
- Alvos de toque: links de texto ganham área com padding + margem negativa iguais (layout intacto) e
  `relative` para a área extra ficar acima do conteúdo seguinte (`text-link.tsx`).
- Os painéis de vidro (`glass`, `glass-pop`) usam `backdrop-filter`, que o WebKit de Linux não desenha:
  para conferir o visual deles, `shot --chromium`.
- O Safari aplica `upgrade-insecure-requests` até em `localhost`; a CSP o omite em loopback
  (`src/lib/security/headers.ts`). Sem isso, `next start` local quebra todos os scripts no Safari.

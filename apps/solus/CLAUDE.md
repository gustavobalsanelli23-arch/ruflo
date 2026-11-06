# SOLUS — instruções para o Claude

SOLUS é um app **web** (Next.js 16). No iPhone ele roda no **Safari**, cujo motor
é o **WebKit**. Por isso a validação "no iOS" é feita no WebKit com perfil de
iPhone (viewport, densidade de pixels, toque, user agent do iOS). O Simulador
iOS do Xcode só existe no macOS; quando houver um Mac, ele serve como conferência
final (seção no fim).

## Fluxo obrigatório para toda alteração

1. **Analisar**: ler o código afetado e abrir a tela atual no iPhone (`npm run iphone -- open <rota>` + `shot`).
2. **Implementar** a alteração.
3. **Executar**: o `next dev` recarrega sozinho; a sessão do iPhone já mostra a versão nova.
4. **Inspecionar visualmente**: `shot` e ler o PNG (ferramenta Read). Em mudança de layout, também `device "iPhone SE"` e `rotate`.
5. **Testar** os comportamentos afetados: `tap`, `type`, `check`, `logs`.
6. **Corrigir** o que aparecer (erros de console, rolagem horizontal, zoom de campo, layout quebrado).
7. **Validar de novo** e rodar as verificações:
   `npm run typecheck && npm run lint && npm test` e, se mexeu em tela, `npm run test:e2e:iphone`.

Não dar uma alteração por concluída só porque o código parece certo: ela precisa
ter sido vista e usada no iPhone. Se algo não puder ser validado, dizer o quê e por quê.

## Ferramenta de linha de comando (sempre disponível)

`npm run iphone -- <comando>` (ou `node scripts/iphone.mjs <comando>`), rodado em `apps/solus`.
A sessão fica aberta entre comandos e sobe o `npm run dev` sozinha se nada responder em `http://localhost:3000`.

```bash
npm run iphone -- open /demo/visao-geral          # navegar (a demonstração não precisa de Supabase)
npm run iphone -- shot visao --full               # screenshot → .iphone/shots/*.png (imprime o caminho)
npm run iphone -- tree main                       # árvore de acessibilidade: o que há e como tocar
npm run iphone -- tap 'role=navigation[name="Atalhos"] >> role=link[name="Lucro"]'
npm run iphone -- type 'label=E-mail' 'nome@empresa.com.br' --enter
npm run iphone -- check                           # rolagem horizontal, erros, campos com zoom, alvos < 24px
npm run iphone -- logs                            # console, erros de página, requisições com falha
npm run iphone -- device "iPhone SE" | rotate | restart | stop
npm run iphone -- server                          # log do next dev, se foi ela que o subiu
```

Alvos: `role=…[name="…"]`, `text=…`, `label=…`, `placeholder=…` ou seletor CSS. Só elementos visíveis contam
(a sidebar do desktop fica oculta no celular). Aparelho padrão: iPhone 17 Pro (`IPHONE_DEVICE` muda).

## Ferramentas MCP `iphone` (sessões novas)

`.mcp.json` na raiz do repositório registra o servidor `iphone` (Playwright MCP, WebKit, iPhone 17 Pro):
`browser_navigate`, `browser_snapshot`, `browser_click` (o `target` é a `ref` do snapshot), `browser_type`,
`browser_fill_form`, `browser_take_screenshot`, `browser_console_messages`, `browser_network_requests`…
Ele só carrega no início de uma sessão. Chame `browser_take_screenshot` **sem `filename`** (o arquivo vai
para `apps/solus/.iphone/mcp`); um nome relativo grava na raiz do repositório. Se as ferramentas não
aparecerem, use a linha de comando acima: ela faz o mesmo.

## Particularidades do Safari no iPhone (já vistas neste projeto)

- Campo com fonte < 16px faz o Safari dar **zoom ao focar**; o `check` aponta. Neste tema `text-base`
  vale 14px: use `text-[16px] md:text-sm`, como em `input.tsx` e `command.tsx`.
- Alvos de toque: links de texto ganham área com padding + margem negativa iguais (layout intacto) e
  `relative` para a área extra ficar acima do conteúdo seguinte (`text-link.tsx`).
- O WebKit de Linux **não desenha `backdrop-filter`**: painéis de vidro (`glass`, `glass-pop`) parecem
  transparentes no screenshot, com o fundo nítido. No iPhone real o fundo fica borrado; o `shot` avisa.
  Para conferir o visual desses painéis, capture também no Chromium com o perfil do iPhone.
- O Safari aplica `upgrade-insecure-requests` até em `localhost`; a CSP o omite em loopback
  (`src/lib/security/headers.ts`). Sem isso, `next start` local quebra todos os scripts no Safari.
- No `next dev`, cada rota compila na primeira visita (alguns segundos); `tap` em link espera a navegação.

## Ambiente

- Nuvem (Linux): WebKit do Playwright em `/opt/pw-browsers` (revisão 2359 para os testes e a linha de
  comando, 2386 para o MCP). Se faltar: `npx playwright install --with-deps webkit` em `apps/solus`.
- Mac com Xcode (Simulador real, conferência final):
  ```bash
  xcrun simctl boot "iPhone 17 Pro" && open -a Simulator
  npm run dev                                         # em apps/solus
  xcrun simctl openurl booted http://localhost:3000/demo/visao-geral
  xcrun simctl io booted screenshot /tmp/solus-sim.png   # depois, ler o PNG
  ```
  O console do Safari do Simulador fica no Safari do Mac: menu Desenvolvedor → Simulator.

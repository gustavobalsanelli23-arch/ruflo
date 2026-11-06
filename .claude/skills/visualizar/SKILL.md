---
name: visualizar
description: Mostra um projeto web enquanto ele é construído. Sobe o servidor de desenvolvimento (Vite, Next.js, Astro, HTML puro…), abre o app num iPhone (WebKit, o motor do Safari) e no desktop, tira prints, toca, digita, lê logs e deixa a prévia ao vivo para o usuário acompanhar. Use sempre que criar ou alterar a interface de um projeto web, e quando o usuário pedir para ver, visualizar, mostrar, abrir, testar ou conferir a tela, o site ou o app.
---

# Visualizar

O usuário quer **ver o projeto ficando pronto em tempo real**, e você precisa ver o que ele vai ver.
Esta skill faz as duas coisas com um único script:

```bash
V="node .claude/skills/visualizar/scripts/visualizar.mjs"   # caminho a partir da raiz do repositório
```

(Instalada como skill pessoal, o script fica em `~/.claude/skills/visualizar/scripts/visualizar.mjs`.)

## Começar

1. `$V start <pasta do projeto>` — descobre como o projeto roda, instala as dependências se faltarem,
   sobe o servidor de desenvolvimento (com recarga automática) e abre o iPhone. No fim imprime
   `PORTA_PREVIA=<porta>`.
2. **Mostre ao vivo para o usuário**: chame a ferramenta `report_preview_port` com essa porta e o nome do
   projeto. Na nuvem, o app do Claude passa a mostrar o projeto num painel de pré-visualização que se
   atualiza sozinho a cada alteração. Não diga que o painel apareceu: nem todo app tem um. Sem essa
   ferramenta (Claude Code no computador do usuário), diga a ele para abrir o `endereço:` impresso no navegador.
3. `$V shot inicio --both`, leia os dois PNG (Read) e envie ao usuário (SendUserFile) com uma legenda curta.

## A cada alteração (obrigatório)

1. **Analisar**: ler o código afetado e ver a tela atual (`$V open <rota>`, `$V shot`).
2. **Implementar** a alteração.
3. **Executar**: o servidor recarrega sozinho; a sessão do iPhone já mostra a versão nova (em ~2s).
4. **Inspecionar**: `$V shot <nome>` e ler o PNG. Em mudança de layout, também `--desktop`,
   `device "iPhone SE"` (tela pequena) e `rotate`.
5. **Testar** o que mudou: `tap`, `type`, `check`, `logs`.
6. **Corrigir** o que aparecer: erro de console, rolagem horizontal, zoom de campo, layout quebrado.
7. **Validar de novo** e rodar os testes do projeto, se houver.

Envie ao usuário o print atualizado a cada alteração visível (um por alteração, não a cada
salvamento), dizendo em uma linha o que mudou. Não dê uma alteração por concluída só porque o código
parece certo: ela precisa ter sido vista e usada. O que não puder ser validado, diga o quê e por quê.

## Comandos

| Comando | O que faz |
|---|---|
| `start [pasta] [--device "iPhone SE"] [--port N] [--url URL]` | sobe e abre (`--url`: um site já no ar, sem subir servidor) |
| `open <rota\|URL>` | navega |
| `shot [nome] [--both\|--desktop\|--chromium] [--full] [--hd]` | print do iPhone; `--both` iPhone + desktop 1440px; `--chromium` iPhone com o desfoque de vidro desenhado; `--full` página inteira |
| `tap <alvo>` / `type <alvo> <texto> [--enter]` / `press <tecla>` | tocar, digitar, teclar |
| `scroll <px\|alvo>` | rolar |
| `tree [seletor]` | árvore de acessibilidade: o que há na tela e o nome de cada botão/link |
| `check` | rolagem horizontal, erros, campos que dão zoom (fonte < 16px), alvos de toque < 24px |
| `logs [--all]` | console, erros de página, requisições com falha |
| `eval <js>` | JavaScript na página |
| `back` · `reload` · `restart` (do zero, sem cookies) | navegação |
| `device <nome>` · `rotate` · `devices` | aparelho (padrão iPhone 17 Pro) e orientação |
| `server` | últimas linhas do log do servidor de desenvolvimento |
| `status` · `stop` | estado · fecha o navegador e o servidor que a skill subiu |

Sem pasta, os comandos valem para o último projeto iniciado; `--dir <pasta>` escolhe outro. Vários
projetos podem ficar abertos ao mesmo tempo, cada um na sua porta.

**Alvos**: `role=button[name="Agendar"]`, `text=Contato`, `label=E-mail`, `placeholder=Buscar` ou
seletor CSS. Só elementos visíveis contam (o menu de desktop oculto no celular não atrapalha). Use `tree`
para descobrir os nomes antes de tocar.

## Particularidades

- **Não é o Simulador iOS do Xcode** (que só existe no macOS): é o WebKit do Playwright com perfil de
  iPhone, o mesmo motor do Safari. Fontes do sistema, notch/áreas seguras e o teclado virtual não são
  reproduzidos.
- O WebKit de Linux **não desenha `backdrop-filter`**: painéis de vidro parecem transparentes no print. O
  `shot` avisa; use `shot --chromium` para ver o efeito.
- Campo com fonte < 16px faz o Safari do iPhone dar zoom ao focar; o `check` aponta.
- Na primeira visita, uma rota do servidor de desenvolvimento compila por alguns segundos; o `tap` espera.
- Versões do Next.js com alerta de segurança param o `next dev` na primeira execução; a skill reinicia
  sozinha. Conte ao usuário que a versão tem alerta, sem atualizar nada por conta própria.
- O estado fica em `<projeto>/.visualizar/` (prints, logs), que se ignora sozinho no git.

## Requisitos

Node 18+ e Playwright com WebKit e Chromium. Na nuvem já vêm instalados. No computador do usuário,
uma vez: `npm i -g playwright && npx playwright install --with-deps webkit chromium`.

## Simulador iOS real (Mac com Xcode)

Para a conferência final num Mac, com o projeto rodando (`$V start`):

```bash
xcrun simctl boot "iPhone 17 Pro" && open -a Simulator
xcrun simctl openurl booted http://localhost:<porta>
xcrun simctl io booted screenshot /tmp/simulador.png   # depois, ler o PNG
```

O console do Safari do Simulador fica no Safari do Mac: menu Desenvolvedor → Simulator.

## Ferramentas MCP `iphone` (opcional)

Se as ferramentas `mcp__iphone__*` estiverem carregadas (Playwright MCP com WebKit e iPhone 17 Pro), elas
servem para o mesmo fim: `browser_navigate`, `browser_snapshot` (o `target` dos cliques é a `ref` do
snapshot), `browser_click`, `browser_type`, `browser_take_screenshot` (sem `filename`),
`browser_console_messages`. O script acima não depende delas.

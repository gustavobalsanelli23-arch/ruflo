---
name: FutZone
description: Loja de camisas de futebol no mundo "Vestiário", o vestiário antes do jogo.
colors:
  brand-blue: "#054ecc"
  brand-blue-bright: "#0a52d6"
  brand-blue-focus: "#4682ea"
  brand-blue-pressed: "#063da0"
  floor: "#07080b"
  surface: "#0d0f13"
  surface-2: "#13161c"
  surface-3: "#1a1e26"
  steel: "#101318"
  steel-2: "#161a21"
  steel-3: "#1c2129"
  niche: "#0a0c10"
  seam: "#1e222a"
  seam-strong: "#2b303b"
  ceiling-light: "#dbe6ff"
  chalk: "#f3f5f8"
  chalk-2: "#c3c8d1"
  muted: "#8b919d"
  subtle: "#5f6672"
  success: "#2fbf71"
  warn: "#f2b33d"
  danger: "#f0525c"
  info: "#4f8bff"
typography:
  display:
    fontFamily: "Big Shoulders Stencil, Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "min(12.4vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "0.01em"
  display-wide:
    fontFamily: "Big Shoulders Stencil, Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "min(4.7vw, 4.25rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "0.01em"
  plate-title:
    fontFamily: "Big Shoulders Stencil, Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "clamp(2.75rem, 9vw, 5.75rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "0.005em"
  headline-page:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "4rem"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "0.005em"
  title:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "1.85rem"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "0.005em"
  plate:
    fontFamily: "Big Shoulders Stencil, Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.08em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-sm:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  item-name:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 600
    lineHeight: 1.375
  price:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.5
    fontFeature: "tnum"
  button:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.12em"
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.12em"
rounded:
  sm: "2px"
  md: "3px"
  card: "3px"
  button: "3px"
  chip: "3px"
  xl: "4px"
  3xl: "6px"
spacing:
  seam: "1px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "40px"
  section: "96px"
  section-lg: "128px"
  container-max: "1360px"
components:
  button-primary:
    backgroundColor: "{colors.brand-blue}"
    textColor: "#ffffff"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-blue-bright}"
  button-primary-active:
    backgroundColor: "{colors.brand-blue-pressed}"
  button-primary-lg:
    backgroundColor: "{colors.brand-blue}"
    textColor: "#ffffff"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 28px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.steel-3}"
    textColor: "{colors.chalk}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-3}"
  button-outline:
    textColor: "{colors.chalk}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.chalk-2}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "44px"
  chip:
    textColor: "{colors.chalk-2}"
    rounded: "{rounded.chip}"
    padding: "0 14px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.brand-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.chip}"
    padding: "0 14px"
    height: "36px"
  size-option:
    backgroundColor: "{colors.steel-2}"
    textColor: "{colors.chalk-2}"
    rounded: "{rounded.button}"
    size: "48px"
  size-option-selected:
    backgroundColor: "{colors.brand-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    size: "48px"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.xl}"
    padding: "0 14px"
    height: "44px"
  locker:
    backgroundColor: "{colors.steel}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.card}"
  locker-plate:
    textColor: "{colors.chalk-2}"
    typography: "{typography.plate}"
    padding: "0 12px"
    height: "36px"
  locker-niche:
    backgroundColor: "{colors.niche}"
  locker-label:
    textColor: "{colors.chalk}"
    padding: "10px 12px 12px"
  team-locker-plate:
    textColor: "{colors.chalk-2}"
    typography: "{typography.plate}"
    padding: "0 12px"
    height: "40px"
  station-plate:
    textColor: "{colors.muted}"
    typography: "{typography.plate}"
    rounded: "{rounded.button}"
    size: "40px"
  station-plate-active:
    backgroundColor: "{colors.steel-3}"
    textColor: "{colors.chalk}"
    typography: "{typography.plate}"
    rounded: "{rounded.button}"
    size: "40px"
  shelf-link:
    textColor: "{colors.chalk}"
    typography: "{typography.label}"
    height: "40px"
  nav-link:
    textColor: "{colors.chalk-2}"
    typography: "{typography.label}"
    padding: "8px 14px"
  nav-link-active:
    textColor: "{colors.chalk}"
    typography: "{typography.label}"
    padding: "8px 14px"
  steel-tag:
    textColor: "{colors.muted}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
---

# Design System: FutZone

<!-- Fonte dos tokens: src/app/globals.css (@theme, remapeamento de cantos em html:has(.store-world), @utility). Fontes: src/app/layout.tsx. Contrato de direção: .impeccable/surfaces/src-app.md. Este arquivo descreve a loja pública; o painel administrativo mantém o próprio visual. -->

## Overview

**Creative North Star: "O Vestiário Antes do Jogo"**

A loja é o vestiário do time antes da partida: cada camisa espera no seu armário de aço grafite, com a plaquinha em estêncil no topo, e o visitante percorre a fileira e tira uma. O piso é quase preto, o aço é grafite frio, os títulos são brancos e o texto de apoio é cinza. A única coisa que "acende" é a luz do teto: uma faixa fina branco-azulada de 2px no aço do topo do armário. Nenhum outro efeito existe.

A densidade é de prateleira: os armários formam bancos contínuos, separados por emendas de 1px, sem respiro entre eles; quem respira são as seções, cada uma apoiada numa régua horizontal de 1px (a linha da prateleira) e separadas por 96px a 128px. A hierarquia vem só do contraste de escala tipográfica: Big Shoulders condensado e em caixa alta para os títulos, Manrope sóbrio para o resto, números sempre tabulares. A foto real do catálogo (3:4, modelo vestindo a camisa) é o herói; o aço em volta dela fica quieto.

O azul da logo é racionado: ele marca o único elemento vivo da tela (ação principal, item de navegação atual, tamanho escolhido, filtro selecionado). Todo o resto é grafite dormente e branco. A loja recusa o padrão da categoria: hero centralizado sobre degradê, chips flutuantes sobre a foto e fileira de cards arredondados.

**Key Characteristics:**
- Armários quase retos (3px), em bancos com emendas de 1px, cada um com plaquinha (time e temporada), nicho com a foto e etiqueta (nome, grade de tamanhos, situação, preço).
- Luz como único efeito: faixa de 2px `ceiling-light` no aço do topo; acesa em repouso só nos armários em destaque, ao apontar ou focar nos demais.
- Azul da logo reservado ao elemento ativo; nunca decorativo.
- Linha da prateleira de 1px como eixo horizontal de cada seção.
- Estêncil (Big Shoulders Stencil) nas plaquinhas e nas manchetes do vestiário; Big Shoulders sólido nos títulos de seção; Manrope no corpo; números tabulares.
- Sem sombras de elevação, sem vidro, sem degradês decorativos; o único degradê é o vertical sutil da face de aço (`steel-2` para `steel`).

## Colors

Grafite frio quase monocromático, um azul racionado e uma luz branco-azulada; os tons de estado aparecem só onde há estado real (pedidos, estoque, erros).

### Primary
- **Azul FutZone** (`brand-blue`): extraído da logo, pinado pelo dono. Botão primário, tamanho e filtro selecionados, contador do carrinho, seleção de texto. É o único azul "cheio" da loja.
- **Azul Aceso** (`brand-blue-bright`): hover do botão primário e a luz do item de navegação atual (a faixa de 2px sob o link ativo) e da miniatura ativa da galeria.
- **Azul de Foco** (`brand-blue-focus`): anel de foco visível (2px, recuo de 2px) em todo controle; cor do cursor de texto.
- **Azul Pressionado** (`brand-blue-pressed`): estado `:active` do botão primário.

A rampa completa (`brand-50` a `brand-950`) vive em `globals.css` e no sidecar; na loja só os quatro tons acima carregam papel.

### Neutral
- **Piso** (`floor`): fundo do `body`, do cabeçalho rolado e do `theme-color`. O chão escuro do vestiário.
- **Aço** (`steel`, `steel-2`, `steel-3`): a face dos armários (degradê vertical de `steel-2` para `steel`), a faixa de demonstração e o rodapé (`steel`), a gaveta de compra rápida e as linhas de aço do checkout (`steel-2`), a placa da estação ativa e o botão secundário (`steel-3`).
- **Superfícies** (`surface`, `surface-2`, `surface-3`): campos de formulário (`surface-2`), hover do botão secundário e estados desabilitados (`surface-3`), base do skeleton.
- **Nicho** (`niche`): o fundo atrás da foto dentro do armário, um tom abaixo do aço, para a foto clara não "vazar" na borda.
- **Emenda** (`seam`): o anel de 1px de cada armário, divisórias internas (plaquinha, etiqueta) e réguas finas.
- **Emenda Forte** (`seam-strong`): a linha da prateleira, contorno de botões outline, chips e campos, anel do armário em hover/foco, cabide do armário vazio.
- **Giz** (`chalk`): títulos, nomes, preços, informação principal.
- **Giz Secundário** (`chalk-2`): plaquinhas em repouso, texto de apoio forte, tamanhos disponíveis.
- **Cinza** (`muted`): descrições, metadados, temporada na plaquinha, situação neutra do armário.
- **Cinza Fundo** (`subtle`): texto desabilitado e tamanhos esgotados.

### Tertiary (estados)
- **Verde** (`success`), **Âmbar** (`warn`), **Vermelho** (`danger`), **Azul Informativo** (`info`): status de pedidos e estoque, erros de formulário, confirmação "adicionado". Em selos aparecem como texto sobre fundo a 12% e anel a 30%. `danger` também marca "Esgotado" no armário.

### Ceiling light
- **Luz do Teto** (`ceiling-light`): branco-azulado frio, nunca neon. Usada só como a faixa de 2px no topo do armário, da placa de estação ativa e do mapa de etapas do checkout (etapas concluídas a 35%).

### Named Rules
**The One Live Element Rule.** O azul FutZone marca apenas o que está vivo agora: a ação principal, o item atual, o tamanho escolhido. Se dois azuis cheios disputam a mesma vista sem que ambos sejam estado do usuário, um deles está errado.

**The Light Is Not Blue Rule.** A luz do vestiário é `ceiling-light`, não o azul da marca. Azul é estado; luz é atenção. Exceção registrada: a luz do item de navegação ativo e da miniatura ativa da galeria usa `brand-blue-bright`, porque ali a luz É o estado.

## Typography

**Display Font:** Big Shoulders Stencil (com Big Shoulders e Arial Narrow)
**Headline Font:** Big Shoulders (com Arial Narrow)
**Body Font:** Manrope (com system-ui)

Todas via `next/font` (pesos: Big Shoulders 700/800/900, Stencil 700/800, Manrope 400 a 800).

**Character:** Letra de placa pintada em estêncil e de numeração de vestiário para os títulos, condensada e em caixa alta; Manrope geométrico e calmo para tudo que se lê. Preços, tamanhos, temporadas e números de estação usam algarismos tabulares.

### Hierarchy
- **Display** (Stencil 800, `min(12.4vw, 6rem)` no celular e `min(4.7vw, 4.25rem)` a partir de 1280px, entrelinha 0.9, caixa alta): só a manchete do hero, em duas linhas fixas.
- **Plate Title** (Stencil 800, `clamp(2.75rem, 9vw, 5.75rem)`, entrelinha 0.9): o nome do time na placa de aço da página do time.
- **Headline** (Big Shoulders 800, 2.25rem / 3rem a partir de 640px / 3.5rem a partir de 1024px, entrelinha 0.92, caixa alta, `text-wrap: balance`): títulos de seção apoiados na linha da prateleira. Títulos de página internos sobem para 2.5rem / 3.25rem / 4rem.
- **Title** (Big Shoulders 800, 1.6rem / 1.85rem): títulos das estações do checkout e de estados vazios (3xl / 4xl).
- **Plate** (Stencil 700, 0.82rem para o time e 0.74rem para a temporada, tracking 0.08em, entrelinha 1.25, caixa alta): plaquinhas dos armários, números de estação, dados gravados na placa do time. A entrelinha 1.25 é proposital: com `truncate`, 1.0 cortaria os acentos de GRÊMIO, ATLÉTICO, SÃO.
- **Body** (Manrope 400, 1rem / 1.125rem no hero, entrelinha 1.625, até 36ch no hero e 60 a 62ch em descrições): subtítulos e descrições. Texto de apoio em 0.875rem.
- **Item Name** (Manrope 600, 0.82rem / 0.92rem, entrelinha 1.375, até 2 linhas com altura mínima reservada): nome da camisa no armário.
- **Price** (Manrope 800, 1rem / 1.125rem no armário e 1.875rem / 2.25rem na página do produto, tabular): preço; o preço anterior vem riscado em `muted`.
- **Label** (Manrope 700, 0.6875rem a 0.78rem, tracking 0.12em a 0.14em, caixa alta): botões, navegação, situação do armário, faixa de demonstração, rótulos de campo (0.75rem, tracking largo).

### Named Rules
**The Type-Scale-Only Rule.** Hierarquia sai do contraste de tamanho e peso, nunca de ornamento, cor de destaque ou selo. Um título não ganha rótulo acima dele: o título fala sozinho.

**The Tabular Figures Rule.** Todo número que se compara em coluna (preço, tamanho, temporada, contagem, etapa) usa `tabular-nums`.

## Layout

- **Contêiner:** largura máxima 1360px, centralizado, recuo lateral de 16px no celular, 24px a partir de 640px e 40px a partir de 1280px. Toda seção da loja se alinha a ele.
- **Linha da prateleira:** cada seção apoia o cabeçalho numa régua de 1px `seam-strong` (borda inferior), com 16px / 20px de respiro abaixo do texto e 24px / 32px até o conteúdo. A ação da seção (um único link) se alinha à direita na mesma linha de base.
- **Ritmo vertical:** 96px entre seções, 128px a partir de 640px. O rodapé desce 96px / 128px abaixo do último bloco.
- **Bancos de armários:** grades com espaço de 1px (`gap-px`); cada armário leva um anel de 1px, e os anéis dos vizinhos se sobrepõem e formam uma emenda só. Grade de catálogo: 2 colunas no celular, 3 a partir de 768px, 4 a partir de 1024px. Grade de times: 2 / 3 / 4 / 5 colunas.
- **Fileiras roláveis (celular):** rolagem horizontal com encaixe (`snap-start`), sangrando até a borda da tela e com o encaixe respeitando o recuo do contêiner; o próximo armário aparece cortado. Hero: armários a 70% (42% a partir de 640px); fileiras de produto: 64% / 40%; fileira de times: 46% / 28% / 22%.
- **Fileira de times (desktop):** a partir de 1024px fica rente à grade do contêiner, com recuo interno de 1px para os anéis das pontas não serem cortados pela rolagem; 5 times visíveis (6 a partir de 1280px), com setas de aço no cabeçalho da seção.
- **Hero:** a partir de 1280px, duas colunas 2fr / 3fr (40% / 60%) alinhadas pela base: manchete, subtítulo e as duas ações (botão "Ver camisas" e busca por time) à esquerda; quatro armários à direita, apoiados na linha da prateleira. Abaixo de 1280px os armários vêm depois das ações, quatro lado a lado a partir de 768px.
- **Checkout:** estações empilhadas em ordem, cada uma separada por uma régua `seam-strong`; o conteúdo da estação ativa recua 56px para alinhar com o título, ao lado da placa numerada.
- **Pontos de quebra:** os padrões do Tailwind (640 / 768 / 1024 / 1280px). A loja é pensada primeiro para o celular.

## Elevation & Depth

Plano por padrão. A profundidade vem de camadas tonais de grafite (piso, aço, nicho) e de emendas de 1px, não de sombras. A face do armário tem um degradê vertical sutil (`steel-2` no topo para `steel` na base) que lê como chapa de aço, e é o único degradê permitido.

### Shadow Vocabulary
- **Brilho de chapa** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.16)` no primário, `0.06` no secundário): a dobra iluminada no topo do botão de aço. Some no estado desabilitado.
- **Cabeçalho rolado** (`box-shadow: 0 12px 30px -24px rgb(0 0 0 / 0.9)`): separa o cabeçalho sólido do conteúdo depois da primeira rolagem. Único sombreamento externo da loja.

### Named Rules
**The Light-Only Effect Rule.** A luz do teto é o único efeito do mundo: uma faixa de 2px `ceiling-light` no aço do topo do armário, centrada (recuo de 14% a 16% de cada lado). Nos armários em destaque (os quatro do hero e o armário principal da Temporada) ela fica acesa em repouso e acende em fila; nos demais acende ao apontar ou focar, em 200ms. Sem brilhos, sem halos, sem cone.

**Mudança deliberada em relação ao contrato.** O contrato previa também "um cone suave de luz caindo sobre a camisa". Ele foi removido dos armários: sobre o fundo claro das fotos do catálogo o cone era invisível. A luz ficou só na faixa do aço do topo.

## Shapes

- **Cantos:** a loja é quase reta. Dentro de `.store-world` os raios do Tailwind são remapeados: `sm` 2px, `md`/`lg` 3px, `xl`/`2xl` 4px, `3xl`/`4xl` 6px; armário, botão e chip usam 3px. Fora da loja (painel administrativo) os botões, chips e selos continuam em pílula e o card em 18px.
- **Armário:** retângulo de 3px com anel de 1px (não borda própria), dividido em três faixas por réguas internas de 1px `seam`: plaquinha (36px; 40px no armário de time), nicho da foto (3:4 para camisas, 4:3 com recorte no peito para times) e etiqueta.
- **Placas:** botões, chips, seletor de tamanho e placas numeradas são chapas retangulares de 3px; nenhum botão é pílula na loja.
- **Réguas:** a linha da prateleira e as divisórias são sempre 1px; a única linha de 2px é a luz.
- **Armário vazio:** o mesmo armário, com a lâmpada apagada (2px em `seam-strong`) no topo e, no armário de time, um cabide desenhado com duas réguas de 1px.

## Components

### Buttons
Chapas de aço retangulares, firmes e curtas, com rótulo em caixa alta espaçada.
- **Shape:** placa quase reta (3px).
- **Primary:** azul FutZone, texto branco, brilho de chapa no topo. Alturas 36 / 44 / 52px com recuo lateral 14 / 20 / 28px. Um por vista.
- **Hover / Active / Focus:** hover clareia para `brand-blue-bright`; pressionado escurece para `brand-blue-pressed` e encolhe para 0.97 em 150ms; foco com anel de 2px `brand-blue-focus` e recuo de 2px sobre o piso.
- **Secondary:** aço `steel-3`, texto giz; hover em `surface-3`.
- **Outline:** contorno 1px `seam-strong`, hover com contorno `chalk-2` e véu branco a 3%.
- **Ghost:** texto `chalk-2`, véu branco a 5% no hover.
- **Ação de prateleira:** link em caixa alta com sublinhado `seam-strong` que vira giz no hover ("Ver todos os times").

### Chips
- **Style:** placa de 3px, 36px de altura, contorno 1px `seam-strong`, véu branco a 2%, texto `chalk-2` 0.75rem semibold.
- **State:** selecionado vira azul FutZone cheio com texto branco; hover clareia o contorno e o texto.

### Seletor de tamanho
- Placas quadradas de 48px em `steel-2` com contorno `seam-strong` e número tabular; selecionado em azul FutZone cheio; esgotado sem fundo, com o número riscado em `subtle`. Navegável por setas (um único ponto de tabulação).

### Cards / Containers: o armário
Armário do vestiário, a unidade do sistema.
- **Corner Style:** 3px.
- **Background:** face de aço (`steel-2` para `steel`); nicho `niche` atrás da foto.
- **Shadow Strategy:** nenhuma; ver Elevation & Depth.
- **Border:** anel de 1px `seam` (passa a `seam-strong` e sobe de camada em hover/foco); nunca borda própria dentro de um banco.
- **Plaquinha:** time à esquerda em estêncil `chalk-2` (giz no hover), temporada ou coleção à direita em `muted`, tabular.
- **Etiqueta:** recuo 12px (10px no topo); nome em até 2 linhas com altura reservada; grade de tamanhos com os indisponíveis riscados; embaixo, ancorados, a linha de situação (altura fixa de 16px, sempre reservada, uma palavra só: "Esgotado", "Lançamento", "Mais vendido" ou o desconto) e o preço. Assim os preços de uma fileira ficam na mesma altura.
- **Interação:** a foto aproxima para 1.03 em 500ms ao apontar; no desktop, a gaveta de compra rápida sobe da base do nicho em 200ms; no celular, um botão "+" abre a mesma gaveta. Esgotado: foto a 55% e em tons de cinza.

### Armário de time
- Mesmo armário, inteiro clicável: plaquinha de 40px com o nome do time em estêncil 0.95rem, nicho 4:3 com a camisa principal recortada no peito, rodapé com origem (`muted`) e contagem (`chalk-2`, tabular). A luz acende ao apontar ou focar; pressionado encolhe para 0.98. Time sem camisa publicada aparece esmaecido; sem foto, vira o armário vazio com o cabide.

### Inputs / Fields
- **Style:** campo de 44px, fundo `surface-2`, contorno 1px `seam-strong`, canto 4px, texto 0.875rem; rótulo acima em caixa alta pequena `chalk-2`.
- **Focus:** contorno passa a `brand-blue-bright` com anel de 2px do mesmo azul a 30%.
- **Error / Disabled:** erro com contorno `danger` e mensagem em `danger` 0.75rem logo abaixo, anunciada; desabilitado a 60% de opacidade.

### Navigation
- **Cabeçalho:** fixo no topo. Abre com a faixa honesta de demonstração (`steel`, caixa alta 0.6875rem `muted`) que recolhe ao rolar. No topo da Home é transparente e esconde a própria busca (a do hero já está à vista); depois da primeira rolagem fica sólido no piso, com régua `seam` e a sombra do cabeçalho, e encolhe de 64/68px para 56px em 300ms.
- **Links:** caixa alta 0.78rem, tracking 0.14em, `chalk-2`; hover em giz com uma régua de 2px `chalk-2` a 50% que cresce da esquerda; o item atual fica em giz com a luz azul de 2px fixa embaixo. É o único azul do cabeçalho.
- **Ícones:** lucide com traço 1.75, botões de 40px; o contador do carrinho é uma placa azul de 4px que pula ao aumentar.
- **Celular:** menu em gaveta lateral e busca que abre em painel sob o cabeçalho.

### Estações do checkout
- Cada etapa é uma estação fixa na sequência: régua `seam-strong` no topo, placa numerada de 40px ("01" a "05", estêncil tabular) e título em Big Shoulders. Ativa: placa em `steel-3` com a luz de 2px acesa sobre ela e o conteúdo aberto. Concluída: placa com um visto, título em `chalk-2`, resumo e a ação "Alterar". Futura: placa apagada, título `muted`.
- **Mapa das estações:** no topo, cinco réguas de 2px (atual em `ceiling-light`, concluídas a 35%, futuras em `seam-strong`), com o número de cada etapa; a última traz um marco vertical que indica o ponto sem volta ("Finalizar pedido").

### Rodapé
- Aço `steel` com régua `seam-strong`. Abre com os fatos do serviço numa linha só, separados por emendas de 1px (sem ícones), seguidos das colunas de links e da linha legal que declara o ambiente de demonstração.

### Estado vazio e carregamento
- **Vazio:** na loja vira um armário vazio: face de aço, lâmpada apagada de 2px no topo, título em Big Shoulders, descrição `muted` e ação. Sem ícone em ladrilho.
- **Skeleton:** armários com as mesmas proporções do armário real (plaquinha, nicho 3:4, etiqueta), preenchidos por um brilho lento de `surface-2` para `surface-3` em 1.4s.

### Movimento
- Curvas: `ease-out-fz` `cubic-bezier(0.23, 1, 0.32, 1)` para quase tudo, `ease-drawer` `cubic-bezier(0.32, 0.72, 0, 1)` para gavetas e folhas, `ease-in-out-fz` `cubic-bezier(0.77, 0, 0.175, 1)` para o clarear do vestiário. Interface abaixo de 300ms (150ms para pressão, 200ms para hover e luz), gavetas 320ms, aparições 450ms.
- **As luzes acendendo (hero):** cada armário acende como lâmpada fluorescente (pisca e firma, 550ms linear), o primeiro a 200ms e os seguintes a cada 140ms; 220ms depois de cada lâmpada firmar, o véu escuro (`floor` a 70%) sobre aquele armário some em 600ms.
- **Movimento reduzido:** menos, não zero. Saem deslocamentos, escalas, piscadas e atrasos; ficam opacidade e cor. As luzes aparecem já acesas.

## Do's and Don'ts

### Do:
- **Do** colocar toda camisa num armário completo: plaquinha (time e temporada), nicho 3:4 com a foto real, etiqueta com nome, grade de tamanhos, linha de situação reservada e preço ancorado na base.
- **Do** montar bancos de armários com espaço de 1px e anel de 1px `seam` por armário, para que as emendas se fundam numa só.
- **Do** apoiar cada seção na linha da prateleira (1px `seam-strong`) com um único link de ação à direita.
- **Do** usar a luz do teto (2px `ceiling-light`) como o único efeito: acesa em repouso só em armários em destaque, ao apontar ou focar nos demais.
- **Do** reservar o azul FutZone para o elemento ativo: ação principal, item atual, tamanho ou filtro escolhido.
- **Do** manter os cantos em 3px (2px a 6px no máximo) em toda a loja.
- **Do** usar algarismos tabulares em preços, tamanhos, temporadas, contagens e etapas.
- **Do** sinalizar com honestidade o que é demonstração (frete, cupom, pagamento, e-mail, contas), em aço neutro, nunca em azul.

### Don't:
- **Don't** pôr um cone de luz, brilho, halo ou degradê sobre a foto; sobre o fundo claro do catálogo eles não aparecem e só sujam a imagem.
- **Don't** usar sombras de elevação em armários, chips ou botões; a profundidade é tonal.
- **Don't** usar vidro (desfoque de fundo) sobre as fotos. Os únicos controles sobre o nicho são funcionais (favoritar, adicionar rápido) e ficam em placa quase opaca do piso (`floor` a 75%) ou em giz sólido, de 36px a 40px, nos cantos.
- **Don't** criar selos avulsos sobre a foto: a situação é uma palavra na linha reservada da etiqueta.
- **Don't** usar botões em pílula ou cards arredondados na loja.
- **Don't** colocar rótulos acima dos títulos de seção.
- **Don't** usar o azul da marca como decoração, fundo de seção ou cor de aviso.
- **Don't** inventar avaliações, contagem de vendas, urgência ou descontos.

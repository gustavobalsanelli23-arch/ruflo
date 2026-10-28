# Intelligence Engine

Motor de regras **determinístico** que transforma as métricas em oportunidades com evidência. Mesma entrada, mesma saída, na mesma ordem. Não usa IA nem aprendizado de máquina: cada oportunidade vem de uma regra documentada aqui, com fatos rastreáveis até as funções de métricas.

Código: `src/lib/intelligence/` (regras, pontuação e montagem da entrada), `src/services/intelligence.ts` (execução e gravação) e a migration `20261029100400_analytics_opportunities.sql`. Versão atual: `solus-engine-1.0`.

## Quando roda

- ao concluir uma importação e ao desfazer uma;
- ao salvar os parâmetros em Configurações → Análises;
- em "Analisar de novo", na Central de Oportunidades (analyst ou superior).

Cada execução fica registrada em `analysis_runs` (gatilho, quem disparou, importação relacionada, versão do motor, período analisado, quantas detectadas, novas, atualizadas, reabertas e resolvidas, e as limitações). O resultado é gravado por `sync_opportunities`, que **só a chave secreta** (`SUPABASE_SECRET_KEY`, no servidor) executa: nenhum navegador cria ou edita o conteúdo de uma oportunidade. O servidor confere o papel de quem disparou; o banco confere de novo. Sem a chave configurada, a importação funciona e a tela avisa que as oportunidades não foram recalculadas.

## Entrada

Montada só a partir das funções de métricas (`src/lib/intelligence/input.ts`):

| Parte | Janela |
|---|---|
| Totais e métricas por produto | últimos **90 dias** até a última venda importada (limitado ao início do histórico) |
| Comparação | últimos 30 dias × 30 dias anteriores, só com **60 dias ou mais** de histórico |
| Estoque | `inventory_position` na data da última posição importada |
| Parâmetros | `analysis_parameters` da organização |

## Regras

| Tipo | Regra | Evidência mínima | Impacto (tipo) |
|---|---|---|---|
| **Margem negativa** (`negative_margin`) | margem bruta < 0 | 3 dias com venda; custo conhecido em ≥ 90% da receita do produto | prejuízo bruto do período, por 30 dias (lucro mensal) |
| **Margem baixa** (`low_margin`) | 0 ≤ margem < margem mínima | 5 dias com venda; custo em ≥ 90% da receita | (margem mínima − margem) × receita com custo, por 30 dias (lucro mensal) |
| **Lucratividade: custo não repassado** (`profitability`) | custo médio subiu ≥ 5%, preço subiu menos da metade disso e a margem caiu ≥ 2 pontos (últimos 30 × 30 anteriores) | 3 dias com venda em cada período; custo em ≥ 90% da receita nos dois | (margem anterior − atual) × receita com custo dos últimos 30 dias (lucro mensal) |
| **Lucratividade: desconto acima do limite** (`profitability`) | descontos ÷ receita bruta > desconto máximo | 5 dias com venda; custo em ≥ 90% da receita | (taxa − limite) × receita bruta, por 30 dias (lucro mensal) |
| **Estoque parado** (`stalled_stock`) | classe "parado" | capital ≥ R$ 100 com custo conhecido | capital parado (**capital**) |
| **Capital imobilizado** (`tied_up_capital`) | cobertura > cobertura excessiva | venda média > 0; custo conhecido; excesso ≥ R$ 100 | (estoque − cobertura-alvo × venda média) × custo (**capital**) |
| **Risco de ruptura** (`rupture_risk`) | ruptura, ou cobertura < prazo de reposição | venda média > 0; posição até 30 dias mais velha que a última venda; ≥ 1 unidade em risco | venda média × (prazo − cobertura) × lucro bruto médio por unidade (lucro pontual); sem custo confiável, impacto não estimado |
| **Queda de desempenho** (`performance_drop`) | receita líquida caiu ≥ limite de queda (padrão 30%) | 60 dias de histórico; receita anterior ≥ R$ 500 e ≥ 0,5% da receita da empresa; 5 dias com venda antes | lucro bruto anterior − atual, quando o custo é conhecido (lucro mensal) |

- **Uma oportunidade de margem por produto**, na ordem negativa → baixa → custo não repassado → desconto. Os impactos se sobrepõem (é a mesma margem), então mostrar mais de uma contaria o mesmo dinheiro duas vezes.
- **Capital não é lucro.** Estoque parado e capital imobilizado têm impacto do tipo `capital`: aparecem como "capital a liberar" e nunca são somados ao lucro mensal nem ao pontual.
- Cada regra recusa sinais com **confiança < 0,5**, impacto mensal < **R$ 50** ou capital < **R$ 100**. Os recusados são contados nas limitações ("N sinais não viraram oportunidades por pouca evidência").
- No máximo **200** oportunidades por execução (as mais importantes); o excedente vira limitação.

## Fatos, hipóteses e recomendações

Cada oportunidade separa:

- **Fatos** (1 a 20): números das funções de métricas, cada um com rótulo, valor, formato e **fonte** (ex.: "Métricas de vendas de 01/12/2025 a 28/02/2026", "Posição de estoque de 10/03/2026", "Configurações → Análises"). São os únicos números exibidos como evidência.
- **Hipóteses**: explicações possíveis, exibidas como "não confirmadas pelos dados". Algumas vêm dos próprios dados (estoque zerado na queda de vendas, preço médio maior, desconto acima do limite); outras, que os dados não afastam (sazonalidade, concorrência, custo cadastrado errado), sempre aparecem como hipótese.
- **Método do impacto**: a fórmula e a premissa ("supõe o mesmo volume"). O impacto é uma estimativa, nunca ganho garantido.
- **Recomendações**: ações práticas, sem números novos.

## Confiança

Produto de fatores, entre 0 e 0,99 (`src/lib/intelligence/scoring.ts`):

| Fator | Valores |
|---|---|
| Base da regra | margem negativa 0,85 · margem baixa e desconto 0,80 · custo não repassado 0,70 · parado 0,85 · capital 0,75 · ruptura 0,80 (risco 0,70) · queda 0,65 |
| Amostra (dias com venda) | ≥ 20: 1 · ≥ 10: 0,9 · ≥ 5: 0,8 · menos: 0,7 |
| Origem do custo | mais da metade das linhas com custo do cadastro: 0,9 · sem custo: 0,6 |
| Cadastro incompleto do produto | 0,9 |
| Cobertura de custo do produto | multiplicada diretamente (0,9 a 1) |
| Idade da posição de estoque | ≤ 7 dias: 1 · ≤ 30: 0,85 · mais: 0,7 |
| Histórico da janela de vendas | dias da janela ÷ janela configurada, entre 0,7 e 1 |
| Parado: histórico ≥ 2 × limite | 1, senão 0,9 |
| Ruptura: ≥ 5 unidades vendidas na janela | 1, senão 0,8 |

## Prioridade

Pelo tamanho do impacto **em relação à empresa**:

| Impacto | Crítica | Alta | Média | Baixa |
|---|---|---|---|---|
| Lucro (mensal ou pontual) ÷ lucro bruto mensal | ≥ 8% | ≥ 3% | ≥ 0,8% | menos |
| Sem lucro bruto conhecido: ÷ receita líquida mensal | ≥ 2% | ≥ 0,8% | ≥ 0,2% | menos |
| Capital ÷ capital total em estoque | ≥ 15% | ≥ 7% | ≥ 2% | menos |

Ajustes: confiança < 0,6 nunca chega a crítica; margem negativa é no mínimo média; ruptura (sem estoque) é no mínimo média; ruptura ou risco num produto entre os 20% que mais dão lucro bruto é no mínimo alta; estoque parado de perecível sobe um nível.

Ordem na tela: prioridade, confiança, impacto e chave (desempate estável).

## Ciclo de vida e status

| Status | Quem muda | Observação |
|---|---|---|
| Nova (`new`) | sistema | detectada pela primeira vez, ou detectada de novo depois de resolvida |
| Em análise (`reviewing`) | analyst ou superior | |
| Em andamento (`in_progress`) | analyst ou superior | |
| Concluída (`resolved`) | pessoa ou sistema | o sistema resolve sozinho uma oportunidade **nova** que deixou de aparecer nos dados |
| Descartada (`dismissed`) | analyst ou superior | continua descartada mesmo se detectada de novo (os fatos são atualizados) |

- A **chave** (`tipo:entidade`) identifica a oportunidade: a mesma condição detectada de novo atualiza a existente, nunca cria outra.
- Em análise ou em andamento e não detectada mais: o status continua sendo da pessoa; ela só deixa de estar **ativa** (a tela avisa que a condição não aparece nos dados mais recentes).
- Toda mudança vira um evento em `opportunity_events` (detectada, detectada de novo, resolvida pelo sistema, status alterado), com autor, data e nota opcional (até 500 caracteres). A Central mostra o histórico de cada uma.

## Limitações registradas

Cada execução devolve a lista do que **não** pôde ser avaliado, exibida na Central e na Visão geral. Exemplos:

- sem vendas, sem estoque, ou menos de 60 dias de histórico (sem comparação entre períodos);
- parte da receita sem custo (margens calculadas só sobre os itens com custo); produtos fora das regras de margem por falta de custo;
- vendas sem número de pedido (sem número de vendas e ticket médio);
- produtos vendidos que não aparecem na posição de estoque; itens de estoque sem custo;
- sinais de ruptura com posição antiga demais;
- histórico menor que o limite de item parado;
- sinais recusados por pouca evidência; mais de 200 oportunidades.

## O que o motor não faz

- Não prevê demanda nem sazonalidade (a queda de vendas sugere sazonalidade como hipótese, sem afirmar).
- Não usa preços de concorrentes, impostos, frete ou despesas: o impacto é sempre sobre o **lucro bruto**.
- Não aprende nem se ajusta sozinho. Mudanças de regra mudam a versão do motor.
- Não envia nada a modelos de IA. A integração com IA é da Parte 05.

## Testes

`tests/unit/intelligence-engine.test.ts` fixa cada regra, fator de confiança, faixa de prioridade e limitação. `tests/db/opportunities.test.ts` prova a gravação (sem duplicar, ciclo de status, eventos, isolamento, só `service_role` grava) e `tests/db/pipeline.test.ts` roda o caminho inteiro: CSV real → biblioteca de importação → RPCs → métricas → motor → gravação.

# Métricas financeiras e de estoque

Todas as métricas são calculadas **no banco**, por funções SQL (`supabase/migrations/20261029100300_analytics_metrics.sql`), com `numeric` (nunca ponto flutuante) e sempre com o RLS de quem consulta (`SECURITY INVOKER`). A aplicação só agrupa e exibe; nenhuma IA calcula números financeiros. As funções leem apenas importações **concluídas** (`private.active_import_ids`): dados de importações em andamento, canceladas ou desfeitas nunca entram.

| Função | Entrega |
|---|---|
| `analytics_coverage(org)` | o que existe de dados: primeiro e último dia com vendas, última posição de estoque, produtos com e sem custo |
| `analysis_parameters(org)` | os parâmetros de análise da organização (ou os padrões) |
| `analytics_summary(org, início, fim)` | totais do período |
| `analytics_daily(org, início, fim)` | os mesmos totais por dia (até 1.100 dias por chamada) |
| `analytics_products(org, início, fim)` | totais por produto |
| `analytics_categories` / `analytics_suppliers` | os de produto agrupados por categoria / fornecedor |
| `inventory_position(org, data)` | posição, capital, giro, cobertura e classe de cada produto |
| `inventory_summary(org, data)` | totais de estoque, por classe, por faixa de cobertura e por categoria |

Os períodos das telas (7, 30 e 90 dias, 12 meses, ano) terminam no **último dia com vendas importadas**, não em "hoje": um arquivo de março não aparece como "últimos 30 dias sem vendas" em maio. O período anterior tem o mesmo tamanho e termina na véspera (12 meses e ano são comparados com o mesmo intervalo do ano anterior).

## Linha de venda

Cada item de venda (`sale_items`) tem quantidade (> 0), preço unitário (antes do desconto), desconto em R$ da linha, custo unitário (pode faltar) e tipo (`sale` ou `return`). O banco calcula:

```
valor bruto  = quantidade × preço unitário
valor líquido = valor bruto − desconto
custo        = quantidade × custo unitário        (nulo sem custo)
```

## Fórmulas do período

| Métrica | Fórmula |
|---|---|
| Receita bruta | Σ valor bruto das vendas |
| Descontos | Σ desconto das vendas |
| Devoluções | Σ valor líquido das linhas de devolução |
| **Receita líquida** | receita bruta − descontos − devoluções |
| Receita com custo | Σ valor líquido das vendas com custo − Σ valor líquido das devoluções com custo |
| **CMV** | Σ custo das vendas − Σ custo das devoluções (custo histórico de cada linha) |
| **Lucro bruto** | receita com custo − CMV |
| **Margem bruta** | lucro bruto ÷ receita com custo; **indisponível** quando a receita líquida ≤ 0 ou não há receita com custo |
| Cobertura de custo | receita com custo ÷ receita líquida (máximo 100%) |
| Número de vendas | documentos (pedido/cupom) distintos com ao menos uma venda |
| **Ticket médio** | receita líquida dos itens com documento ÷ número de vendas; **indisponível** sem documentos |
| Unidades vendidas | Σ quantidade vendida − Σ quantidade devolvida |
| Dias com venda | datas distintas com movimento |

Por produto também: preço médio cobrado = (receita bruta − descontos) ÷ unidades vendidas; custo médio = custo das vendas com custo ÷ unidades com custo; taxa de desconto = descontos ÷ receita bruta; dias com venda; origem do custo de cada linha (arquivo, cadastro ou nenhum). Categoria e fornecedor somam os produtos com as mesmas fórmulas; produtos sem categoria ou fornecedor aparecem em "Sem categoria" / "Sem fornecedor".

Evolução no tempo: os totais diários são agrupados em dias, semanas ou meses conforme o período, e cada intervalo é comparado com o intervalo correspondente do período anterior. A curva de margem usa a receita com custo, para não ser diluída por vendas sem custo.

### Lucro bruto não é lucro líquido

A SOLUS mostra **lucro bruto** (receita − custo das mercadorias). Impostos sobre a venda, frete, comissões, taxas de cartão, aluguel, folha e demais despesas **não** estão nos arquivos importados e não são descontados. As telas dizem "lucro bruto" e "margem bruta", nunca "lucro".

### Decisões de cálculo

| Tema | Decisão | Por quê |
|---|---|---|
| **Devoluções** | linhas do tipo devolução (ou com quantidade negativa) reduzem a receita líquida, as unidades e o CMV (a mercadoria volta ao estoque). A data é a da devolução, não a da venda original | é o que os arquivos de PDV e ERP trazem; a venda original raramente é identificável |
| **Descontos** | valor em R$ por linha, subtraído da receita bruta. Sem coluna de desconto, vale zero; com só o valor total da linha, o preço unitário é derivado (total + desconto) ÷ quantidade | desconto em % varia por sistema; em R$ é inequívoco |
| **Impostos** | não tratados. Os preços são considerados como vieram no arquivo (normalmente com impostos incluídos) | sem regime tributário e alíquotas por produto, qualquer cálculo seria inventado |
| **Frete** | não tratado. Frete cobrado do cliente não deve ser importado como produto; frete pago na compra entra só se já estiver no custo informado | idem |
| **Custo** | o custo do **arquivo de vendas** (custo na data da venda) tem prioridade. Sem ele, usa-se o custo do cadastro **no momento da importação**, e a linha fica marcada como "custo do cadastro". Mudar o custo no cadastro depois **não** muda o CMV de vendas já importadas | preserva o CMV histórico; a origem do custo é exibida e reduz a confiança das análises quando predomina |
| **Sem custo** | a linha entra na receita, mas não no lucro nem na margem. A tela mostra a cobertura de custo ("margem calculada sobre 80% da receita") | não se inventa custo |
| **Bonificação** | preço zero entra como venda sem receita, com aviso | mantém as unidades e o estoque coerentes |
| **Margem com receita zero** | indisponível ("—"), nunca 0% | não há base de cálculo |

## Estoque

`inventory_position(org, data)` usa a **última posição importada** de cada produto até a data (a importação mais recente vale quando duas têm a mesma data) e as vendas até a mesma data.

| Medida | Fórmula |
|---|---|
| Custo unitário | o da posição de estoque; sem ele, o custo atual do cadastro |
| **Capital em estoque** | max(quantidade, 0) × custo unitário (estoque negativo vale zero) |
| Janela de venda | últimos *N* dias até a data (*N* = janela de vendas, padrão 90), limitada ao início do histórico |
| **Venda média por dia** | unidades líquidas na janela ÷ dias da janela |
| **Cobertura (dias)** | estoque ÷ venda média por dia |
| **Giro anual** | 365 ÷ cobertura (= vendas anualizadas ÷ estoque) |
| Giro agregado | CMV da janela anualizado ÷ capital em estoque |
| Cobertura média | capital em estoque ÷ CMV médio por dia da janela |
| Prazo de reposição | o do produto; senão o do fornecedor; senão o padrão da empresa (7 dias) |

### Classificação (nesta ordem)

| Classe | Regra |
|---|---|
| Ruptura | sem estoque e com vendas na janela |
| Sem estoque | sem estoque e sem vendas na janela |
| Dados insuficientes | menos de 14 dias de histórico de vendas, ou nenhuma venda e histórico menor que o limite de item parado |
| **Parado** | sem venda há *stalled_days* dias ou mais (padrão 60), ou nenhuma venda em todo o histórico, quando ele tem pelo menos esse tamanho |
| **Risco de ruptura** | cobertura menor que o prazo de reposição |
| **Giro alto** | cobertura ≤ 30 dias (configurável) |
| **Giro médio** | cobertura ≤ 90 dias (configurável) |
| **Giro baixo** | acima disso, ou vendas líquidas ≤ 0 na janela |

O resumo também agrupa o estoque com saldo por faixa de cobertura (até 7, 8–30, 31–60, 61–120, mais de 120 dias, sem venda) e por categoria (capital, custo diário de venda e itens que pedem atenção: ruptura, risco, parado ou giro baixo).

### Limitações do estoque

- O estoque é uma **fotografia** (posição importada), não um razão de movimentações: entradas entre duas posições não são vistas. A cobertura usa a posição mais recente e as vendas até ela.
- Posições antigas descrevem mal a prateleira: a idade da posição em relação à última venda importada reduz a confiança das oportunidades, e sinais de ruptura com posição de mais de 30 dias não viram oportunidade (aparecem como limitação).
- Produtos vendidos que não aparecem na posição são contados e exibidos como limitação.
- Sem custo, o capital do item não é calculado (e a tela informa quantos itens estão nessa situação).

## Parâmetros

Owners e admins ajustam em **Configurações → Análises** (`save_analysis_settings`); os demais papéis veem os valores. Mudam a classificação do estoque e o que vira oportunidade; **não** mudam receita, custo ou margem.

| Parâmetro | Padrão | Faixa |
|---|---|---|
| Margem bruta mínima | 20% | 0–90% |
| Desconto máximo | 15% | 1–90% |
| Queda de desempenho | 30% | 5–90% |
| Janela de vendas | 90 dias | 28–365 |
| Estoque parado após | 60 dias | 14–365 |
| Giro alto até | 30 dias | 1–365 |
| Giro baixo acima de | 90 dias | 2–730 (maior que giro alto) |
| Cobertura-alvo | 45 dias | 1–365 |
| Cobertura excessiva acima de | 120 dias | 2–730 (maior que a cobertura-alvo) |
| Prazo de reposição padrão | 7 dias | 0–180 |

## Desempenho

- Índices em `sale_items (organization_id, sold_at)`, `(organization_id, product_id, sold_at)`, `(organization_id, fingerprint)`, `(import_id)` e nas posições de estoque por produto e data.
- Agregação no banco; a aplicação recebe só totais e linhas por produto (até 500 nas tabelas, com aviso quando há mais; o motor lê todas, paginadas de 1.000 em 1.000).
- As funções de métricas desligam o JIT do PostgreSQL (`set jit = off`): com estimativas de custo infladas, a compilação JIT levava mais de 1 s numa consulta que roda em ~100 ms.
- Teste de volume (`tests/db/volume.test.ts`): 200 mil itens de venda, 2 mil produtos. Tempos medidos e limites do teste estão em [testes](testes.md).

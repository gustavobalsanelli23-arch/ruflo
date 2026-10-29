# Importação de dados (Data Hub)

Como planilhas viram dados analisáveis: formatos aceitos, mapeamento, normalização, validação, duplicatas, gravação em lotes, recuperação de falhas e histórico.

Código: `src/lib/ingest/` (leitura, mapeamento, normalização e validação, a mesma biblioteca no navegador e no servidor), `src/modules/data-hub/` (assistente, histórico e Server Actions) e as migrations `20261029100200_analytics_ingestion.sql` e `20261029100250_analytics_commit.sql`.

## Quem pode importar

| Papel | Pode |
|---|---|
| owner, admin | importar, conduzir qualquer importação, cancelar, desfazer e remover do histórico |
| analyst | importar e conduzir (cancelar, desfazer) as próprias importações |
| viewer | ver o histórico e os painéis |

O banco confere tudo de novo: cada RPC exige o papel mínimo e, para conduzir uma importação, ser o autor dela ou owner/admin. Uma importação de outra organização se comporta como inexistente.

## Tipos de dado

Recomendado importar nesta ordem: **produtos** (com custo), depois **vendas** e **estoque**. Fornecedores são opcionais.

| Tipo | Obrigatórios | Opcionais |
|---|---|---|
| Vendas | data, SKU, quantidade e **preço unitário ou valor total da linha** | nº do pedido/cupom, nome do produto, desconto (R$), custo unitário, tipo (venda/devolução), canal ou loja |
| Produtos | SKU, nome | categoria, fornecedor, unidade, custo atual, preço atual, prazo de reposição, perecível, ativo |
| Estoque | SKU, quantidade | data da posição (ou a data da contagem informada na tela), nome do produto, custo unitário |
| Fornecedores | nome | código, prazo de entrega |

- Sem **nº do pedido** não há número de vendas nem ticket médio, e duplicatas não podem ser identificadas com certeza.
- Vendas e estoque com SKU sem cadastro criam o produto **sem cadastro completo** (sem categoria nem custo). O cadastro é completado ao importar o arquivo de produtos.

## Formatos de arquivo

| Formato | Aceito | Detalhes |
|---|---|---|
| CSV (`.csv`, `.txt`, `.tsv`) | sim | separador detectado (vírgula, ponto e vírgula, tabulação, barra vertical); codificação UTF-8 (com ou sem BOM) ou Windows-1252; aspas e quebras de linha dentro de campos |
| Excel `.xlsx` | sim | todas as abas com dados; a pessoa escolhe a aba; datas do Excel convertidas |
| Excel antigo `.xls` | **não** | formato binário (OLE) sem leitura segura no navegador; a tela orienta a salvar como `.xlsx` ou CSV. Arquivos `.xlsx` protegidos por senha também são OLE e são recusados com a mesma mensagem |
| outros | não | PDF, imagens, executáveis, ZIP que não seja planilha |

Limites: **25 MB**, **200 mil linhas** e **100 colunas** por arquivo; até 1.000 linhas (e 800 KB) por lote enviado ao servidor.

### Conferência do arquivo (não confiamos na extensão)

1. **No navegador**: o formato é detectado pelo **conteúdo** (assinatura ZIP com `xl/workbook.xml` para `.xlsx`; texto sem bytes nulos para CSV; assinaturas de PDF, imagens, executáveis e OLE recusadas). Extensão e conteúdo divergentes são recusados. Calcula-se o **SHA-256** do arquivo.
2. **Envio direto ao Storage** com URL assinada de uso único, sem passar pelo servidor da aplicação, para o bucket privado `imports`, no caminho `<organização>/<importação>/original.<csv|xlsx>`. O bucket aceita só os tipos CSV/XLSX e até 25 MB; a política só permite gravar no caminho de uma importação `pending` criada pela própria pessoa, e não permite sobrescrever.
3. **No servidor**: o arquivo guardado é baixado e conferido (mesmo tamanho, mesmo SHA-256 e mesma assinatura de formato). Se não confere, a importação é cancelada.

O nome do arquivo é só exibição: nunca vira caminho no Storage.

## As sete etapas

1. **Arquivo**: escolha do tipo de dado e do arquivo; leitura no navegador; envio e conferência.
2. **Pré-visualização**: primeiras linhas como a SOLUS as leu, separador, codificação, aba. Se o mesmo arquivo (mesmo SHA-256) já foi importado, há um aviso.
3. **Mapeamento**: cada coluna do arquivo é associada a um campo. A sugestão automática compara os cabeçalhos (sem acentos, maiúsculas ou pontuação) com sinônimos usados por ERPs e PDVs brasileiros ("Vlr. Unitário", "Qtde", "Cód. Produto", "Data Emissão"…) e mostra a confiança de cada associação. A pessoa ajusta o que quiser; campos obrigatórios faltando ou colunas usadas duas vezes impedem avançar. Aqui também se escolhem o formato dos números (brasileiro ou americano) e das datas (dia/mês ou mês/dia), detectados a partir das próprias colunas.
4. **Validação**: as linhas vão ao servidor em lotes. O servidor **valida de novo** com a mesma biblioteca e com as opções de leitura **gravadas na importação** (não as que o navegador mandar), e o banco confere tipos e limites mais uma vez. Resultado: linhas válidas, rejeitadas e avisos, agrupados por tipo de problema, com as primeiras linhas afetadas e a lista completa paginada.
5. **Confirmação**: resumo do que será gravado (período, receita bruta, SKUs novos, posições existentes…) e a decisão sobre duplicatas incertas.
6. **Processamento**: gravação lote a lote, com progresso.
7. **Resultado**: registros gravados, ignorados (duplicados) e rejeitados, e o resultado da reanálise das oportunidades.

## Normalização

| Entrada | Exemplos aceitos | Resultado |
|---|---|---|
| Número (padrão brasileiro) | `1.250,50` · `1250,50` · `R$ 1.250,50` · `(1.250,50)` · `1.250,50-` | 1250.50 (os três últimos: negativo) |
| Número (padrão americano) | `1,250.50` · `1250.50` | 1250.50 |
| Número ambíguo | `1.250` | 1250 no padrão brasileiro, 1,25 no americano: decide a opção escolhida no mapeamento |
| Data | `05/03/2026` · `5/3/26` · `05-03-2026` · `05.03.2026` · `2026-03-05` · `2026/03/05` · com ou sem hora · número de série do Excel | `2026-03-05` (com dia/mês) |
| Tipo de linha | venda, saída, pedido · devolução, estorno, troca, cancelamento… | `sale` · `return` |
| SKU | `abc 123` e `ABC123` | mesma chave de comparação (maiúsculas, sem espaços); o texto original é guardado |
| Sim/Não | sim, s, x, 1, verdadeiro, ativo · não, n, 0, falso, inativo | booleano |

Quando um número tem os dois separadores (`1.250,50` ou `1,250.50`), o último é o decimal, qualquer que seja a opção escolhida. Dinheiro é sempre `numeric` no banco, nunca ponto flutuante.

## Validação: erros e avisos

**Erro** rejeita a linha (ela não é gravada). **Aviso** grava a linha e registra o ajuste feito.

| Código | Gravidade | Quando |
|---|---|---|
| `missing_value` | erro | campo obrigatório vazio; venda sem preço nem valor total |
| `invalid_number`, `invalid_date` | erro | valor ilegível |
| `future_date` | erro | data depois de hoje (fuso de São Paulo) |
| `date_out_of_range` | erro | data anterior a 2000 |
| `negative_value` | erro | preço, desconto ou custo negativo |
| `zero_quantity` | erro | quantidade zero |
| `discount_exceeds` | erro | desconto maior que o valor da linha |
| `invalid_kind` | erro | tipo de linha não reconhecido |
| `too_long` | erro | identificador (SKU, pedido) acima do limite |
| `negative_quantity` | aviso | quantidade negativa numa venda: importada como devolução |
| `total_mismatch` | aviso | valor total diferente de quantidade × preço − desconto (tolerância de R$ 0,01 + 0,01%): vale quantidade × preço |
| `zero_price`, `zero_cost` | aviso | possível bonificação |
| `price_below_cost` | aviso | cadastro com preço de venda abaixo do custo |
| `negative_stock` | aviso | estoque negativo: vale zero no capital e na cobertura |
| `repeated_sku`, `repeated_supplier` | aviso | SKU ou fornecedor repetido no cadastro: vale a última linha |
| `repeated_position` | aviso | mesmo produto e data repetidos no estoque: quantidades somadas |
| `truncated`, `ignored_value` | aviso | texto longo cortado; campo opcional ilegível ignorado |

Uma importação sem nenhuma linha válida termina como **falha**, com os erros guardados.

## Duplicatas (nunca silenciosas)

Cada linha de venda recebe uma impressão digital: conteúdo normalizado + ordem de ocorrência no arquivo. Duas linhas idênticas no **mesmo** arquivo são duas vendas; reimportar o **mesmo** arquivo gera as mesmas impressões.

| Classe | Situação | O que acontece |
|---|---|---|
| exata | mesma linha, com nº de pedido, já importada | sempre ignorada e contada como duplicada |
| documento | pedido já importado por outra importação, com conteúdo diferente | sempre ignorada: para corrigir um pedido, desfaça a importação original e importe de novo |
| possível | linha idêntica a uma já importada, **sem** nº de pedido | **a pessoa decide** na confirmação: ignorar (padrão) ou importar mesmo assim |
| posição existente | estoque do mesmo produto e data de outra importação | a pessoa decide: manter as atuais ou usar as do arquivo |

Cadastros (produtos e fornecedores) são atualizados pelo SKU ou nome: campos vazios no arquivo não apagam o que existe, e mudar o custo de um produto não altera o custo de vendas já importadas.

As duplicatas são **reclassificadas no momento da gravação**: se outra importação terminar entre a validação e a confirmação, nada entra duas vezes.

## Lotes, transações, idempotência e recuperação

- **Validação**: cada lote é uma transação. Reenviar o mesmo lote devolve o resultado anterior; conteúdo diferente no mesmo índice é recusado. A validação só fecha com todos os lotes recebidos.
- **Gravação**: cada lote é gravado numa transação e marcado como gravado; gravar o mesmo lote de novo não duplica nada.
- **Concorrência**: as gravações de uma organização são serializadas (advisory lock) e só uma importação por vez fica em processamento.
- **Queda no meio**: a importação fica "em processamento". No histórico, **Continuar** grava só os lotes que faltam; **Cancelar** remove o que já foi gravado. Os painéis só leem importações concluídas: dados parciais nunca aparecem.
- **Mudou o mapeamento**: a validação recomeça do zero.
- **Limite de criação**: 60 importações por hora por pessoa.

## Histórico

`/dados` lista as importações (as 200 mais recentes) com arquivo, tipo, período, status, gravados, duplicados, rejeitados, autor e data.

| Status | Significado | Ações |
|---|---|---|
| Envio ou validação incompletos (`pending`) | criada, ainda não validada | cancelar |
| Aguardando confirmação (`validated`) | validada | continuar, cancelar |
| Processando (`processing`) | gravação em andamento ou interrompida | continuar, cancelar |
| Concluída (`completed`) | todas as linhas válidas | desfazer (vendas e estoque), ver problemas |
| Concluída com erros (`with_errors`) | linhas rejeitadas | desfazer, ver problemas |
| Falhou (`failed`) | nenhuma linha válida | ver problemas, cancelar, remover |
| Cancelada (`canceled`) | desistência antes de concluir | remover |
| Desfeita (`reverted`) | dados retirados dos painéis | remover |

- **Desfazer** remove as vendas ou posições da importação, os documentos de venda que ficaram sem itens e os produtos criados só por ela; depois recalcula as oportunidades. Cadastros não se desfazem: corrigem-se importando o arquivo certo.
- **Remover do histórico** (owner/admin) apaga a linha e o arquivo original guardado.

## Rastreabilidade

Cada venda, item e posição de estoque guarda a importação e o **número da linha no arquivo** de onde veio. Cada problema guarda linha, campo, código e o valor original (até 200 caracteres). A importação guarda nome, formato, tamanho, SHA-256, aba, mapeamento, opções de leitura, resumo, autor e datas de cada etapa.

## Como testar uma importação

1. Entre como analyst, admin ou owner e abra **Dados**.
2. Importe um CSV de produtos (SKU, nome, categoria, custo) e depois um de vendas (data, pedido, SKU, quantidade, preço).
3. Na validação, confira os problemas apontados; na confirmação, o resumo.
4. Depois de concluir, a Visão geral, a Lucratividade e a Central de Oportunidades passam a mostrar os dados.
5. Reimporte o mesmo arquivo de vendas: o aviso aparece na pré-visualização e, na confirmação, as linhas aparecem como já importadas.
6. No histórico, **Desfazer** a primeira importação: os painéis voltam ao estado anterior.

Os mesmos passos estão automatizados no E2E real (`tests/e2e-real/flow.spec.ts`), e o assistente é exercitado com um CSV real em `tests/unit/import-wizard.test.tsx`.

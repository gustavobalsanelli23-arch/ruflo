# Analista de IA

O analista responde perguntas sobre os dados da organização, explica oportunidades e escreve o resumo executivo da Visão geral. Ele usa a API do Claude (Anthropic) ou qualquer API compatível com OpenAI, como DeepSeek e OpenRouter (ver [Provedores](#provedores)), e **não calcula números**: todo valor vem da mesma camada de métricas dos painéis (funções SQL com o RLS de quem pergunta), e o texto final é conferido contra esses resultados antes de chegar à tela.

## Onde aparece

O analista só existe onde a IA está configurada. Sem `ANTHROPIC_API_KEY` nem um provedor compatível com OpenAI (`SOLUS_AI_1_API_KEY` ou `SOLUS_AI_API_KEY`), ele sai do menu lateral, da barra do celular (que passa a mostrar Dados), da busca (Ctrl+K), do detalhe das oportunidades e da Visão geral, e `/analista` mostra a página de não encontrada. Na demonstração, o mesmo vale enquanto a IA da demonstração estiver desligada (`SOLUS_DEMO_AI` e `SOLUS_DEMO_AI_CODE`). As rotas de API continuam respondendo "não configurado".

| Recurso | Tela | Quem usa |
|---|---|---|
| Conversa com o analista | `/analista` | analyst, admin, owner (leitores veem um aviso) |
| Explicar uma oportunidade | botão "Explicar com o analista" no detalhe da oportunidade, abre `/analista?oportunidade=<id>` | analyst ou superior |
| Resumo da IA | painel na Visão geral, por período | gerar: analyst ou superior; ler: todos os membros |
| Demonstração | `/demo/analista`, `/demo/visao-geral`, `/demo/oportunidades` | desligada por padrão (ver abaixo) |

As conversas são de cada pessoa: ninguém lê as conversas de outra, nem um owner. O resumo da Visão geral é da organização: gerado uma vez por período e visível a toda a equipe, com um aviso quando há dados novos desde então.

## Como uma resposta é montada

```
pergunta ──► rota (/api/analista) ──► sessão, papel, organização, limites
                                     │
                                     ▼
              modelo ◄──► ferramentas de leitura (resumo_periodo, evolucao,
                │          produtos, grupos, estoque, oportunidades)
                │                 └── funções SQL de métricas (RLS)
                ▼
          "responder" (resposta estruturada: resumo, visualizações por ref,
                │       fatos, hipóteses, recomendações, limitações)
                ▼
          conferência de números e datas ──► 1 chance de corrigir
                │                              └── trechos ainda sem respaldo
                ▼                                  são retirados, com aviso
          tabelas, gráficos e indicadores montados no servidor
          a partir dos resultados das ferramentas (o modelo não os transcreve)
```

1. **Ferramentas só de leitura** (`src/lib/ai/tools.ts`). Cada uma tem esquema estrito; a entrada é validada de novo com Zod. Os períodos (`7d`, `30d`, `90d`, `12m`, `ytd` ou personalizado) terminam na última venda importada, e o período anterior tem o mesmo tamanho (`src/lib/ai/periods.ts`). Limite de 20 linhas por consulta.
2. **Laço limitado** (`src/lib/ai/engine.ts`): até 6 chamadas ao modelo por resposta (incluindo a correção) e 40 s de prazo. Depois do prazo, o modelo recebe a instrução de responder com o que já tem e as ferramentas de dados passam a ser recusadas. A rota tem `maxDuration = 60`.
3. **Resposta estruturada**: a resposta final vem pela ferramenta `responder`. Tabelas, gráficos e indicadores citam o `ref` de uma consulta e são montados no servidor com os valores exatos do resultado.
4. **Conferência** (`src/lib/ai/grounding.ts`, `answer.ts`): todo número (R$, %, p.p., mil/mi/bi, contagens) e toda data no texto precisa aparecer nos resultados das ferramentas, com tolerância de arredondamento pela quantidade de casas exibidas. Inteiros pequenos sem unidade (até 10) não são cobrados, e textos que vêm dos dados (nomes de produtos, SKUs) são ignorados. Se algo não confere, o modelo recebe a lista e corrige uma vez; o que ainda não confere é retirado da resposta, que mostra o aviso "Trechos retirados".
5. **Fatos × hipóteses**: a resposta separa o que os dados mostram (cada fato com o número que o sustenta) de explicações possíveis, recomendações e limitações. As limitações das próprias consultas (custo incompleto, estoque sem posição recente) entram automaticamente.

O prompt de sistema (`src/lib/ai/prompt.ts`) proíbe calcular, exige datas copiadas dos resultados, trata apenas lucro **bruto** (impostos, frete e despesas não estão nos dados), não confunde capital parado com lucro, recusa assuntos fora do negócio e manda tratar o conteúdo dos dados como dado, nunca como instrução.

### Parâmetros da API

| Parâmetro | Valor |
|---|---|
| Modelo | `SOLUS_AI_MODEL`, padrão `claude-opus-5-5` |
| Pensamento | `thinking: { type: 'adaptive' }` |
| Esforço | `output_config.effort` = `SOLUS_AI_EFFORT` (`low`, `medium`, `high`; padrão `medium`) |
| Fallback no servidor | `fallbacks: 'default'` com o beta `server-side-fallback-2026-07-01`: se o modelo pedido estiver indisponível ou sobrecarregado, a própria API atende com o modelo de reserva padrão. O modelo que respondeu é registrado em `ai_requests.model` |
| Cache | o prompt de sistema é marcado com `cache_control: ephemeral` |
| Tentativas | o SDK repete até 2 vezes em 429 e 5xx; tempo limite de 45 s por chamada |
| Recusa | `stop_reason: 'refusal'` vira uma resposta "não posso ajudar com isso" e não é cobrada como erro |

## Provedores

| `SOLUS_AI_PROVIDER` | Chave | Cliente |
|---|---|---|
| `anthropic` | `ANTHROPIC_API_KEY` | SDK oficial da Anthropic, com os parâmetros acima |
| `openai` | `SOLUS_AI_1_API_KEY` … `SOLUS_AI_9_API_KEY` | `src/lib/ai/openai-client.ts` (`POST {base}/chat/completions` com `fetch`), um por provedor, em rodízio (`src/lib/ai/fallback-client.ts`) |
| vazio | a que existir | `anthropic` se houver `ANTHROPIC_API_KEY`, senão `openai` |

O adaptador compatível com OpenAI implementa a mesma interface (`MessagesClient`) que o motor usa com o Claude. O pedido montado no formato da Anthropic é traduzido (sistema, mensagens, `tool_use` → `tool_calls`, `tool_result` → mensagens `tool`) e a resposta volta ao formato da Anthropic. Por isso o laço, as ferramentas, a conferência de números e os limites são os mesmos nos dois provedores.

O que não existe em Chat Completions fica de fora: pensamento adaptativo, `effort`, fallback no servidor e marcação de cache (provedores como DeepSeek fazem cache automático, e os tokens lidos do cache são registrados). Notas de sistema no meio da conversa, como o aviso de prazo, viram mensagens de usuário marcadas como "[Instrução do sistema]".

### Vários provedores em rodízio

Com o provedor `openai`, é possível cadastrar até 9 provedores, em ordem de preferência (`SOLUS_AI_1_…` a `SOLUS_AI_9_…`). A ideia é somar planos gratuitos com limites pequenos (Groq, OpenRouter, Gemini, Cerebras…):

- Cada chamada vai para o primeiro provedor que não está descansando.
- Se ele falhar, **a mesma chamada** vai para o próximo. Como o analista reenvia a conversa inteira a cada chamada, trocar de provedor no meio de uma resposta é seguro.
- O que falhou descansa:

| Erro | Descanso |
|---|---|
| 429 (limite atingido) | o tempo do `Retry-After`, ou 1 min |
| 5xx, 408, 409, falha de conexão ou tempo esgotado | o tempo do `Retry-After`, ou 30 s |
| 401, 403 (chave), 402 (sem saldo), 404 (modelo removido) | 1 h |
| 400, 413, 422 (pedido que aquele provedor não aceitou, como uma chamada de ferramenta malformada ou contexto grande) | nenhum: só pula nesta chamada |

- Quando o descanso acaba, o preferido volta a ser usado.
- Se todos estiverem descansando, tenta primeiro o que acorda antes. Se todos falharem, a pessoa vê a mensagem de excesso de solicitações (quando algum respondeu 429) ou a do último erro.
- Cada troca vai para o log do servidor como `[solus] ia: provedor falhou`, com o nome do provedor, o status, o descanso e o próximo, sem chave nem conteúdo. O modelo que de fato respondeu fica em `ai_requests.model`.
- Com um só provedor, o adaptador insiste nele (até 2 novas tentativas e 45 s por chamada). Com vários, não repete: passa logo para o próximo, com 25 s por chamada.
- O descanso fica na memória de cada instância do servidor. Uma instância nova começa com todos disponíveis, e no pior caso tenta de novo um que ainda está no limite (que responde 429 na hora).

| Variável | Padrão | Descrição |
|---|---|---|
| `SOLUS_AI_n_API_KEY` | a do provedor anterior | chave |
| `SOLUS_AI_n_BASE_URL` | a do anterior; no 1, `https://api.deepseek.com` | URL até a versão. Só `https`, exceto `http://localhost` |
| `SOLUS_AI_n_MODEL` | obrigatório do 2 em diante; no 1, `deepseek-chat` | id do modelo; aceita `/` e `:` (`deepseek/NOME:free`) |
| `SOLUS_AI_n_MAX_TOKENS` | o geral | limite de saída deste provedor |
| `SOLUS_AI_n_NAME` | `host/modelo` | nome nos logs |
| `SOLUS_AI_MAX_TOKENS` | `8000` | limite de saída por chamada (256 a 64000) |
| `SOLUS_AI_STRICT_TOOLS` | desligado | `on` manda `strict: true` nas funções (só se todos os provedores aceitarem). Sem isso, a validação com Zod e a chance de correção continuam valendo |

As variáveis sem número (`SOLUS_AI_API_KEY`, `SOLUS_AI_BASE_URL`, `SOLUS_AI_MODEL`) continuam valendo como provedor 1. Um provedor sem chave e sem URL herda as do anterior, o que permite usar outro modelo do mesmo provedor; nos planos grátis, cada modelo costuma ter limite próprio. Provedores incompletos ou com URL inválida são ignorados.

Exemplo:

```
SOLUS_AI_1_API_KEY=<chave da Groq>
SOLUS_AI_1_BASE_URL=https://api.groq.com/openai/v1
SOLUS_AI_1_MODEL=<modelo grande da Groq>
SOLUS_AI_2_MODEL=<outro modelo da Groq>
SOLUS_AI_3_API_KEY=<chave do OpenRouter>
SOLUS_AI_3_BASE_URL=https://openrouter.ai/api/v1
SOLUS_AI_3_MODEL=<modelo terminado em :free>
```

Erros: o adaptador trata o caso do OpenRouter que responde 200 com `{ error }`. Para a pessoa, 401, 402 e 403 aparecem como problema de configuração, e 429 como excesso de solicitações.

**Qualidade e privacidade.** O analista depende de chamar ferramentas corretamente e copiar números exatos; modelos menores tendem a precisar mais da correção e a ter mais trechos retirados. Como uma mesma resposta pode passar por modelos diferentes, prefira colocar no rodízio só modelos que responderam bem nos testes. Teste cada provedor antes de abrir para clientes: um provedor que recusa o formato das ferramentas (400 em toda chamada) não descansa, então atrasa todas as respostas até ser tirado da lista. Planos gratuitos podem guardar e usar o que é enviado: com dados reais de clientes, leia os termos de cada provedor antes.

## Limites de uso

| Onde | Limite | Aplicado em |
|---|---|---|
| Organização, por pessoa | 30 perguntas ou resumos por hora | banco (`begin_ai_request` → `private.enforce_rate_limit`) |
| Organização, total | 300 por dia (dia de São Paulo) | banco, com trava por organização para não passar do limite em paralelo |
| Demonstração, por IP | 12 por hora | PostgreSQL (com a chave secreta) ou memória da instância |
| Demonstração, total | 150 por dia | idem |
| Desbloqueio da demonstração | 5 tentativas por 15 min por IP | idem |

Cada chamada fica registrada em `ai_requests` (pessoa, tipo, status, modelo, número de chamadas, tokens de entrada, saída e cache), gravada só pelas funções `begin_ai_request` e `finish_ai_request`. A pessoa vê os próprios registros; owner e admin veem os da organização.

## Privacidade: o que vai para a Anthropic

Em cada pergunta são enviados à API do Claude: a pergunta, até 6 trocas anteriores da mesma conversa, o nome da organização, as datas da primeira e da última venda e da última posição de estoque, e os **resultados das consultas** (totais agregados, nomes e SKUs de produtos, categorias, fornecedores, posições de estoque, oportunidades). Não são enviados dados de clientes finais, e-mails nem dados de contas.

O tratamento desses dados segue os termos da API do provedor configurado (Anthropic, DeepSeek, OpenRouter…), contratados por quem fornece a chave. Com o provedor `openai`, os mesmos dados podem ir para qualquer um dos provedores do rodízio, conforme qual estiver disponível. Avise os clientes antes de ligar o analista em produção.

No banco ficam as perguntas, as respostas montadas e o registro de uso. As conversas são apagadas junto com a organização (cascata); ainda não há tela para a pessoa apagar uma conversa.

## Demonstração

A demonstração é pública, então a IA lá fica **desligada** a menos que:

- `SOLUS_DEMO_AI=on`, e
- `SOLUS_DEMO_AI_CODE` tenha 8 ou mais caracteres, e
- `ANTHROPIC_API_KEY` ou um provedor compatível com OpenAI esteja configurado.

O visitante digita o código uma vez; o navegador guarda um cookie `HttpOnly` (`solus-demo-ia`, 7 dias) com o hash do código. Trocar o código invalida todos os cookies. Sem o código, a demonstração continua com as respostas roteirizadas de sempre, marcadas como "Resposta de demonstração". Com a IA ligada, as respostas usam **apenas** os dados fictícios (`src/demo/ai-source.ts`), levam o selo "IA sobre dados fictícios" e nada é salvo no servidor: a conversa fica no navegador e é reenviada a cada pergunta.

## Variáveis de ambiente

Todas lidas só no servidor (`src/lib/ai/config.ts`, `server-only`); nenhuma vai para o navegador.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SOLUS_AI_PROVIDER` | não | `anthropic` ou `openai`; vazio escolhe pela chave presente |
| `ANTHROPIC_API_KEY` | para ligar a IA com o Claude | chave da API do Claude |
| `SOLUS_AI_1_API_KEY` … `SOLUS_AI_9_API_KEY` (ou `SOLUS_AI_API_KEY`) | para ligar a IA com provedores compatíveis com OpenAI | chaves, com `_BASE_URL`, `_MODEL`, `_MAX_TOKENS` e `_NAME` de cada provedor (ver [rodízio](#vários-provedores-em-rodízio)). Sem Claude nem provedor, `/analista` mostra "não configurado" e o botão de resumo some |
| `SOLUS_AI_MAX_TOKENS`, `SOLUS_AI_STRICT_TOOLS` | não | só no provedor `openai` |
| `SOLUS_AI_MODEL` | não | modelo do Claude (padrão `claude-opus-5-5`) ou do provedor 1 (padrão `deepseek-chat`) |
| `SOLUS_AI_EFFORT` | não | só no Claude: `low`, `medium` (padrão) ou `high` |
| `SOLUS_DEMO_AI` | não | `on` permite a IA na demonstração |
| `SOLUS_DEMO_AI_CODE` | com `SOLUS_DEMO_AI=on` | código de acesso da demonstração, 8+ caracteres |

## Segurança

- **Rotas**: `POST /api/analista`, `POST /api/demo/analista`, `POST /api/demo/acesso`. Todas exigem `Origin` igual ao host (rotas não têm a proteção automática das Server Actions), respondem `no-store` e validam o corpo com Zod.
- **Organização**: sessão, papel analyst e organização ativa são conferidos na rota e de novo no banco (`begin_ai_request`). As ferramentas consultam as funções de métricas com a sessão da pessoa, então o RLS impede ler outra organização mesmo que o modelo peça.
- **Oportunidade**: a pergunta "explique a oportunidade" é montada no servidor a partir da oportunidade lida com RLS; o navegador manda só o id.
- **Conversa anterior**: na organização vem do banco (só as conversas da própria pessoa). Na demonstração vem do navegador; os números dela não contam como respaldo na conferência.
- **Injeção de instruções**: nomes de produtos e fornecedores vêm de planilhas importadas e podem conter texto qualquer. O modelo só tem ferramentas de leitura da própria organização, o prompt manda tratar dados como dados, e os números passam pela conferência. O pior caso é uma resposta enganosa em texto, não acesso a outros dados.
- **Falhas**: o erro detalhado vai para o log do servidor sem o conteúdo da pergunta; a pessoa vê uma mensagem acionável.

Detalhes das tabelas, políticas e funções: [banco de dados](banco-de-dados.md) e [segurança e RLS](seguranca-rls.md).

## Testes

Nenhum teste chama a API real: o modelo é substituído por um cliente roteirizado que devolve as mesmas estruturas da API.

| Arquivo | Cobre |
|---|---|
| `tests/unit/ai-grounding.test.ts` | números, moedas, porcentagens, p.p., datas por extenso, arredondamento, textos dos dados |
| `tests/unit/ai-engine.test.ts` | laço de ferramentas, entradas inválidas, prazo, limite de passos, correção e retirada de trechos, recusa, uso de tokens |
| `tests/unit/ai-queries.test.ts` | consultas sobre a fonte de dados (períodos, comparação, ordenação, estoque, oportunidades) |
| `tests/unit/ai-openai-client.test.ts` | tradução de pedido e resposta, cache, recusa, argumentos inválidos, erros HTTP, 200 com `{ error }`, tentativas, cancelamento, escolha do provedor e o laço completo do analista passando pelo adaptador |
| `tests/unit/ai-fallback-client.test.ts` | rodízio: ordem, descanso depois do limite, `Retry-After`, todos descansando, 400 sem castigo, limite de saída por provedor, cancelamento, lista de provedores no ambiente (herança de chave e URL, inválidos ignorados) |
| `tests/unit/ai-routes.test.ts` | origem, configuração, papel, corpo inválido, limites, gravação, histórico, oportunidade montada no servidor, resumo, falhas, bloqueio e desbloqueio da demonstração |
| `tests/unit/analyst-live.test.tsx` | tela ao vivo com resposta em NDJSON: passos, resposta, conversa contínua, histórico da demonstração, erros, conexão interrompida, conversas salvas, resumo da Visão geral |
| `tests/db/ai.test.ts` | isolamento das conversas, leitor bloqueado, chaves compostas, limites por pessoa e por organização, registro de uso, resumos |

## Limitações

- A integração **ainda não foi exercitada contra a API real** neste repositório (não havia chave disponível). A qualidade das respostas, o tempo real e o custo por pergunta precisam ser medidos com a chave antes de abrir para clientes.
- A conferência cobra números e datas, não o raciocínio: uma frase sem número pode estar errada e passar.
- Sem respostas em tempo real token a token: a tela mostra os passos e a resposta inteira no fim.
- Até 6 trocas de contexto por conversa; conversas longas perdem o início.
- Os limites da demonstração ficam na memória de cada instância quando `SUPABASE_SECRET_KEY` não está configurada.
- Sem avaliação (útil / não útil) persistida e sem tela para apagar conversas.

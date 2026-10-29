# Analista de IA

O analista responde perguntas sobre os dados da organização, explica oportunidades e escreve o resumo executivo da Visão geral. Ele usa a API do Claude (Anthropic) e **não calcula números**: todo valor vem da mesma camada de métricas dos painéis (funções SQL com o RLS de quem pergunta), e o texto final é conferido contra esses resultados antes de chegar à tela.

## Onde aparece

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

O tratamento desses dados segue os termos comerciais da API da Anthropic, contratados por quem fornece a `ANTHROPIC_API_KEY`. Avise os clientes antes de ligar o analista em produção.

No banco ficam as perguntas, as respostas montadas e o registro de uso. As conversas são apagadas junto com a organização (cascata); ainda não há tela para a pessoa apagar uma conversa.

## Demonstração

A demonstração é pública, então a IA lá fica **desligada** a menos que:

- `SOLUS_DEMO_AI=on`, e
- `SOLUS_DEMO_AI_CODE` tenha 8 ou mais caracteres, e
- `ANTHROPIC_API_KEY` esteja configurada.

O visitante digita o código uma vez; o navegador guarda um cookie `HttpOnly` (`solus-demo-ia`, 7 dias) com o hash do código. Trocar o código invalida todos os cookies. Sem o código, a demonstração continua com as respostas roteirizadas de sempre, marcadas como "Resposta de demonstração". Com a IA ligada, as respostas usam **apenas** os dados fictícios (`src/demo/ai-source.ts`), levam o selo "IA sobre dados fictícios" e nada é salvo no servidor: a conversa fica no navegador e é reenviada a cada pergunta.

## Variáveis de ambiente

Todas lidas só no servidor (`src/lib/ai/config.ts`, `server-only`); nenhuma vai para o navegador.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | para ligar a IA | chave da API do Claude. Sem ela, `/analista` mostra "não configurado" e o botão de resumo some |
| `SOLUS_AI_MODEL` | não | modelo (padrão `claude-opus-5-5`) |
| `SOLUS_AI_EFFORT` | não | `low`, `medium` (padrão) ou `high` |
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

# Papéis e permissões

Cada pessoa tem um papel **por organização**: a mesma pessoa pode ser owner numa empresa e leitora em outra.

| Permissão | Proprietário (owner) | Administrador (admin) | Analista (analyst) | Leitor (viewer) |
|---|:-:|:-:|:-:|:-:|
| Ver painéis, análises, membros e importações | ✓ | ✓ | ✓ | ✓ |
| Usar o analista e tratar oportunidades | ✓ | ✓ | ✓ | — |
| Importar dados; continuar, cancelar e desfazer as próprias importações | ✓ | ✓ | ✓ | — |
| Continuar, cancelar e desfazer importações de qualquer pessoa; removê-las do histórico | ✓ | ✓ | — | — |
| Ajustar os parâmetros de análise | ✓ | ✓ | — | — |
| Exportar dados | ✓ | ✓ | — | — |
| Editar o nome da organização | ✓ | ✓ | — | — |
| Convidar, remover e alterar analistas e leitores | ✓ | ✓ | — | — |
| Ver e revogar convites pendentes | ✓ | ✓ | — | — |
| Convidar administradores; conceder ou retirar propriedade | ✓ | — | — | — |
| Remover administradores e proprietários | ✓ | — | — | — |
| Excluir a organização | ✓ | — | — | — |
| Sair da organização | ✓ (se houver outro owner) | ✓ | ✓ | ✓ |
| Editar o próprio perfil | ✓ | ✓ | ✓ | ✓ |

Regras adicionais:

- Ninguém é convidado como owner: a propriedade é concedida por um owner depois que a pessoa entra.
- A organização sempre tem ao menos um owner.
- Admin não altera o próprio papel.

## Onde cada regra é aplicada

| Camada | Arquivo | Papel |
|---|---|---|
| Banco (fonte da verdade) | `supabase/migrations/*` | RLS, privilégios por coluna, gatilho de papéis, RPCs |
| Servidor | `src/services/workspace.ts` (`authorize`) | barra cedo e dá mensagens claras |
| Interface | `src/lib/auth/permissions.ts` | mostra só os controles permitidos |

As três camadas são testadas: `tests/db/roles.test.ts` (banco), `tests/unit/auth-rules.test.ts` (tabela da interface) e `tests/unit/auth-components.test.tsx` (controles por papel).

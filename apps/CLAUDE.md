# Projetos em apps/ — instruções para o Claude

Cada pasta aqui é um projeto web (Vite, Next.js…). O usuário quer **ver cada projeto ficando pronto em
tempo real**. Ao criar ou alterar a interface de qualquer um deles, use a skill **visualizar**
(`.claude/skills/visualizar/SKILL.md`):

1. `node .claude/skills/visualizar/scripts/visualizar.mjs start apps/<projeto>` e
   `report_preview_port` com a `PORTA_PREVIA` impressa, para o usuário acompanhar ao vivo.
2. A cada alteração: analisar → implementar → ver no iPhone e no desktop (`shot --both`) → testar
   (`tap`, `type`, `check`, `logs`) → corrigir → validar de novo, e enviar o print atualizado ao usuário.

Não dar uma alteração por concluída só porque o código parece certo: ela precisa ter sido vista e
usada. Instruções próprias de um projeto ficam no `CLAUDE.md` da pasta dele.

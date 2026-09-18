# Glossário — TaskFlow

> Atualizado 2026-09-18 — pivô para semana dinâmica/ordenação por horário. Ver `sprint-change-proposal-2026-09-18.md`.

- **Tarefa** — unidade central do TaskFlow. Pertence a exatamente uma Data, tem um Estado, opcionalmente um Horário, e opcionalmente uma Prioridade.
- **Semana / Janela** — unidade de organização da tela principal: uma janela de 7 dias, sempre iniciando em Hoje e avançando automaticamente conforme os dias passam. Nunca uma semana de calendário fixa.
- **Data** — dia real do calendário ao qual uma Tarefa pertence. Substitui o antigo "Dia da Semana" abstrato (`mon`..`sun`). Pode ser mudada por edição ou por arraste do card para outra coluna.
- **Horário** — momento do dia (ex. `08:00`) opcionalmente atribuído a uma Tarefa. Determina a ordenação cronológica dentro de uma Data; Tarefas sem Horário aparecem primeiro.
- **Estado** — progresso de uma Tarefa. Valores: Pendente (padrão ao criar), Em andamento, Concluída.
- **Prioridade** — atributo visual (não ordena mais as Tarefas) de importância de uma Tarefa dentro do seu dia. Valores: Baixa, Média, Alta, ou sem prioridade definida (padrão ao criar, se não escolhida). Não é um sistema de pontuação. Editável no Modal, ou em ciclo por clique direto na Tag de Prioridade do card.
- **Rollover** — migração automática da Data de uma Tarefa não concluída cuja Data original já saiu da Janela para Hoje, preservando título, Horário, Prioridade e Estado, sem duplicar.

# Epic 5 Context: Data Real, Janela Dinâmica e Rollover

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Substituir o modelo de "dia da semana" abstrato por datas reais, fazer a janela de 7 dias exibida sempre começar em hoje (avançando sozinha conforme os dias passam, mesmo com o app aberto), mover automaticamente para hoje qualquer tarefa não concluída cuja data ficou para trás, e migrar sem perdas os dados já salvos no formato antigo. É a fundação bloqueante do pivô de produto de 2026-09-18 — Epics 6 e 7 e a revisão do Epic 4 dependem do modelo de dados e da janela dinâmica que este epic introduz.

## Stories

- Story 5.1: Migrar dados existentes para o modelo de data real
- Story 5.2: Exibir a janela dinâmica de 7 dias ancorada em hoje
- Story 5.3: Avançar a janela automaticamente com o app aberto
- Story 5.4: Rollover automático de tarefas atrasadas

## Requirements & Constraints

- Toda tarefa passa a pertencer a uma Data real (ISO `YYYY-MM-DD`), não mais a um dia-da-semana abstrato.
- A janela visível é sempre `[hoje, hoje+1, ..., hoje+6]` — nunca uma semana de calendário fixa. Cada coluna mostra a Data real e o nome do dia da semana correspondente.
- A janela deve se recalcular automaticamente quando o dia vira, mesmo com o app já aberto e sem reload — não só ao carregar/focar a aba.
- Toda tarefa com estado Pendente ou Em andamento cuja Data ficou fora da janela (no passado) deve ser movida automaticamente para hoje, preservando título, horário, prioridade e estado, sem duplicar. O movimento vai direto para hoje, nunca incrementalmente dia a dia.
- Tarefas com estado Concluída **nunca** sofrem rollover — permanecem na Data original mesmo que saiam da janela visível. Não existe tela de Histórico no MVP: uma vez fora da janela, a tarefa concluída simplesmente não aparece mais em lugar nenhum da UI, mas os dados continuam salvos.
- Dados existentes salvos no formato antigo (schemaVersion 1, campo `day` por dia-da-semana) precisam ser migrados automaticamente para o novo formato (schemaVersion 2, campo `date`) na primeira carga após a atualização, sem perder nenhuma tarefa e sem repetir a migração em cargas seguintes.
- Ao migrar, cada `day` salvo deve mapear para a Data correspondente **dentro da primeira janela dinâmica calculada** (hoje..hoje+6) — nunca para uma data já passada, para que a migração em si não dispare rollover imediato.
- Um `schemaVersion` que não seja nem 1 nem 2 continua caindo no caminho de dado ilegível já existente (estado vazio + aviso único) — não é um formato a migrar.

## Technical Decisions

- Modelo de dados: `Task.day: DayOfWeek` é substituído por `Task.date: string` (ISO `YYYY-MM-DD`). Um novo campo `Task.time: string | null` (`HH:mm`) é introduzido por este pivô, mas pertence funcionalmente ao Epic 6 (ordenação por horário) — esta história só precisa garantir que o campo exista no tipo e sobreviva à migração (tarefas migradas de v1 nunca têm horário: `time: null`).
- `order` muda de escopo: de `(day, priorityGroup)` para `(date)` — usado só como desempate estável, nunca mais como alvo de reordenação manual. Após a migração de uma tarefa v1, os `order` de cada grupo `(date)` afetado devem ser renumerados sequencialmente (fecha buracos herdados dos antigos grupos de prioridade).
- Persistência via `localStorage`, chave `taskflow:tasks`, envelope `{ schemaVersion, tasks[] }` — só `src/storage/` toca `localStorage` diretamente (nenhum componente ou reducer o faz).
- `CURRENT_SCHEMA_VERSION` sobe de `1` para `2`. `loadTasks()` ganha uma exceção explícita: `schemaVersion === 1` não cai mais no caminho de `loadError`/descarte — passa por uma função de migração dedicada (`migrateFromV1`) antes de qualquer validação do formato atual, e o resultado migrado é imediatamente regravado como `schemaVersion: 2`. Qualquer outro `schemaVersion` desconhecido continua no caminho de descarte original.
- Toda mutação de tarefa (incluindo as disparadas pelo próprio sistema — rollover, migração) passa pela mesma disciplina de persistência atômica já usada no resto do app: tenta salvar em `localStorage` (síncrono) antes de comitar ao estado React; nunca lança exceção para quem chama, sempre retorna um resultado `{ ok }`. Uma mutação em lote (ex. rollover afetando várias tarefas) deve ser **uma única escrita**, nunca uma escrita por tarefa.
- A data de "hoje" e a janela de 7 dias são calculadas via `Date` nativo do navegador, sem fuso horário explícito (usuária única, uso local) — sem necessidade de biblioteca de datas nova.
- Recálculo da janela: sempre ao carregar o app, e também por um timer periódico (checagem a cada ~60s é suficiente) enquanto o app permanece aberto, comparando a data corrente com a última data usada — só recomputa quando a data efetivamente mudou.
- Estado gerenciado via `useReducer` + `Context` nativo do React (sem lib de state management externa) — mesmo padrão já usado no resto do app.

## UX & Interaction Patterns

- Cada coluna de dia mostra o nome do dia da semana **e** a Data real (ex. "Sexta-feira, 18/09"), não mais só o nome do dia.
- A primeira coluna exibida é sempre hoje, com o mesmo destaque visual `today-background` já existente; as demais seguem hoje+1..hoje+6.
- Rollover é silencioso e transparente: tarefas atrasadas reaparecem em hoje sem nenhuma indicação visual especial de "foi movida" e sem exigir nenhuma ação de Isabel.
- Tarefas concluídas cuja data saiu da janela simplesmente somem da tela — sem mensagem, sem tela de Histórico (decisão explícita, fora de escopo deste epic e do MVP).

## Cross-Story Dependencies

- Story 5.1 (migração) deve ser implementada e testada isoladamente primeiro — é o único ponto real de risco de perda de dados do pivô inteiro. Stories 5.2–5.4 dependem do modelo de dados que ela introduz.
- Story 5.3 (timer) e Story 5.4 (rollover) estão acopladas: o mesmo gatilho (carga inicial + timer periódico) dispara ambos os recálculos.
- Epics 6 (ordenação por horário) e 7 (prioridade visual), e a revisão do Epic 4 (drag só entre dias), dependem inteiramente do modelo de data real e da janela dinâmica que este epic estabelece — não devem ser iniciados antes deste epic estar concluído.

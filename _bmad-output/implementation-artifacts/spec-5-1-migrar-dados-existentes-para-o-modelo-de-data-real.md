---
title: 'Migrar dados existentes para o modelo de data real (Story 5.1 + base de 5.2)'
type: 'feature'
created: '2026-09-18'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'ab96f7d6ae054eef6ecbd7e6b607323a6ae43038'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `Task.day` (`DayOfWeek`, `'mon'..'sun'`) precisa virar `Task.date` (ISO real) + `Task.time` opcional, e dados salvos no formato antigo (`schemaVersion: 1`) precisam migrar sem perda para o novo formato (`schemaVersion: 2`) na primeira carga.

**Approach:** Trocar o tipo `Task.day`→`Task.date`(+`time`), renomear mecanicamente `day`→`date` em todo consumidor (mesma semântica de agrupamento, só muda o tipo do identificador — a máquina de arraste por zona de prioridade continua intocada, é escopo do Epic 4 revisado, não deste). Adicionar `migrateFromV1` em `tasksStorage.ts`, mapeando cada `day` salvo para a data real correspondente dentro da primeira janela `hoje..hoje+6`. `WeekView`/`DayColumn`/`TaskModal` passam a iterar essa janela dinâmica em vez do array estático `DAYS_OF_WEEK` (entrega também a base visível da Story 5.2 — ver Design Notes). Timer de auto-avanço (5.3) e rollover (5.4) ficam para uma próxima spec.

## Boundaries & Constraints

**Always:**
- `schemaVersion` sobe de `1` para `2`. `schemaVersion === 1` migra via `migrateFromV1`; qualquer outro valor ≠ `1` e ≠ `2` continua no caminho de `loadError` já existente.
- Migração nunca perde, duplica, nem lança exceção — pior caso aceitável é o dado cair no caminho de `loadError` já existente (nunca um crash).
- Após migrar, `migrateFromV1` regrava imediatamente via `saveTasks` como `schemaVersion: 2`; se a escrita falhar, ainda assim retorna as tarefas migradas em memória para uso nesta sessão (`loadError: false`) — a persistência será re-tentada na próxima mutação normal do app.
- Ordenação por prioridade (`sortTasksInDay`, `PRIORITY_RANK`) e a mecânica de arraste por zona de prioridade (`PriorityZone`, `groupKey`, `reorderTask`) permanecem **funcionalmente intactas** — só o tipo do identificador de coluna muda de `DayOfWeek` para `string` (data ISO). Nenhuma mudança de comportamento de ordenação/arraste nesta spec.
- `WeekView` passa a iterar `getWeekWindow()` (7 datas ISO, hoje..hoje+6) em vez de `DAYS_OF_WEEK`. Sem timer de recálculo automático ainda (Story 5.3, próxima spec) — a janela é calculada uma vez por render/montagem.
- `DayColumn`/`TaskCard` exibem a data real formatada junto ao nome do dia da semana (ex. "Sexta-feira, 18/09").
- `TaskModal`, no modo edição, lista as 7 datas da janela atual (`getWeekWindow()`) no `<select>` de Dia, não mais os 7 dias-da-semana abstratos.
- Todo arquivo de teste que hoje usa `DayOfWeek`/valores como `'mon'`/`DAYS_OF_WEEK` é atualizado para usar strings de data ISO (`'2026-09-18'` etc.) — sem deixar suite quebrada.

**Ask First:** nenhuma decisão de produto em aberto — todas as ambiguidades relevantes já foram resolvidas em `sprint-change-proposal-2026-09-18.md` (D1–D5) e nas específicas desta história em `epics.md`. Se durante a implementação surgir uma decisão de UX/produto não coberta por esses documentos, HALT e perguntar.

**Never:**
- Não remover/alterar a lógica de zonas de prioridade no drag (`PriorityZone`, `groupKey`, `EmptyZoneDropTarget`, `reorderTask`) — isso é escopo da revisão do Epic 4, feita por último, depois dos Epics 6/7.
- Não implementar ordenação por horário (Epic 6) nem clique-ciclo de prioridade (Epic 7) nesta spec — só o campo `time: string | null` precisa existir no tipo (sempre `null` vindo da migração), sem UI nem lógica de ordenação por ele ainda.
- Não implementar o timer de auto-avanço da janela (Story 5.3) nem o rollover automático (Story 5.4) nesta spec — ficam para uma spec seguinte, já com `getWeekWindow`/`getTodayISO` prontos para reuso.
- Não introduzir biblioteca de datas nova — `Date` nativo é suficiente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Migração básica | `taskflow:tasks` com `schemaVersion: 1`, tarefas com `day: 'wed'` etc. | Cada tarefa ganha `date` = a data da próxima ocorrência daquele dia-da-semana dentro de `getWeekWindow()` calculada no momento da migração; `time: null`; `order` renumerado sequencialmente por `date`; resultado salvo como `schemaVersion: 2` | N/A |
| `schemaVersion` desconhecido | `schemaVersion: 3` (ou ausente/corrompido) | Mesmo caminho de hoje: `{ tasks: [], loadError: true }` | Já coberto por `loadTasks` existente |
| Migração + escrita falha | `schemaVersion: 1` válido, `saveTasks` retorna `{ ok: false }` na regravação | `loadTasks` ainda retorna as tarefas migradas (`loadError: false`) para uso na sessão; nada trava | Log silencioso — próxima mutação normal do app tenta salvar de novo |
| Item malformado em v1 | array `tasks` de v1 com um item que não bate o formato antigo (`isValidTaskV1`) | Mesmo caminho de dado ilegível: `{ tasks: [], loadError: true }` (não migra parcialmente) | N/A |
| Duas tarefas, dias diferentes, mesma migração | `day: 'mon'` e `day: 'fri'` na mesma migração, hoje = sexta 2026-09-18 | `'mon'` → `2026-09-21` (próxima segunda dentro da janela); `'fri'` → `2026-09-18` (hoje) — nenhuma data migrada fica no passado | N/A |

</frozen-after-approval>

## Code Map

- `src/types/index.ts` -- `Task.day: DayOfWeek` → `Task.date: string` (ISO) + novo `Task.time: string | null`. `DayOfWeek` continua exportado (só para uso interno de migração).
- `src/constants/days.ts` -- DELETAR. Substituído por `src/constants/week.ts` (novo): `getTodayISO()`, `getWeekWindow(anchor?: Date): string[]` (7 ISO, hoje..hoje+6), `getWeekdayLabel(dateISO: string): string`, `formatDayHeading(dateISO: string): string` (ex. "Sexta-feira, 18/09").
- `src/constants/days.test.ts` -- DELETAR (comportamento coberto por `week.test.ts` novo).
- `src/storage/tasksStorage.ts` -- `CURRENT_SCHEMA_VERSION` 1→2; `isValidTask` valida `date`/`time` (novo formato); nova `isValidTaskV1`/`migrateFromV1` (usa `getWeekWindow` para mapear `day`→`date`, renumera `order` por `date`); `loadTasks` ganha o branch `schemaVersion === 1` → migra → regrava.
- `src/storage/tasksStorage.test.ts` -- adaptar todos os fixtures `day:` → `date:`; novos casos da I/O Matrix acima.
- `src/state/selectors.ts` -- assinatura `day: DayOfWeek` → `date: string` em `sortTasksInDay`, `getNextOrderInGroup`, `reorderWithinGroup`, `reorderGroupByIndex`, `closeOrderGap`; corpo só troca `t.day`→`t.date` (lógica intacta).
- `src/state/selectors.test.ts` -- fixtures `day:` → `date:` com valores ISO.
- `src/state/useTaskActions.ts` -- `CreateTaskInput`/`UpdateTaskInput`: `day` → `date`; corpo troca `t.day`→`t.date`, `getNextOrderInGroup`/`reorderWithinGroup`/`closeOrderGap`/`reorderGroupByIndex` chamados com `date`. `reorderTask` intocado (mesma lógica, tipo do grupo muda).
- `src/state/useTaskActions.test.ts` -- fixtures `day:` → `date:`.
- `src/components/WeekView/WeekView.tsx` -- importa `getWeekWindow`/`getTodayISO` de `constants/week` em vez de `DAYS_OF_WEEK`/`getTodayDayOfWeek`; itera `getWeekWindow()` em vez de `DAYS_OF_WEEK`; prop `DayColumn` passa `date` em vez de `day`.
- `src/components/WeekView/WeekView.test.tsx` -- ajustar mocks/fixtures de dia para datas ISO.
- `src/components/WeekView/dragChange.ts` -- `groupKey(day, priority)`→`groupKey(date, priority)`; `parseGroupKey` retorna `{ date, priority }`; `WeekDragChange` (`kind:'move'`) usa `date`; `resolveWeekDragChange`/`applyWeekDragChange` trocam `t.day`/`change.day` por `t.date`/`change.date`.
- `src/components/WeekView/dragChange.test.ts` -- fixtures `day:` → `date:`.
- `src/components/DayColumn/DayColumn.tsx` -- prop `day: DayOfWeek` → `date: string` em `DayColumnProps`, `SortableTaskItemProps` (via `group`, sem mudança de tipo), `PriorityZoneProps`; título usa `formatDayHeading(date)` em vez de `DAY_LABELS[day]`; `labelId`/`data-priority-zone` etc. usam `date`; passa `date` para `TaskModal`.
- `src/components/DayColumn/DayColumn.test.tsx` -- fixtures/props `day` → `date` com valores ISO.
- `src/components/TaskModal/TaskModal.tsx` -- prop `day: DayOfWeek` → `date: string`; `selectedDay`→`selectedDate`; `<select>` de Dia (modo edição) itera `getWeekWindow()` em vez de `DAYS_OF_WEEK`, rótulos via `getWeekdayLabel`/`formatDayHeading`; modo criação mostra `formatDayHeading(date)`; `createTask`/`updateTask` chamados com `date`.
- `src/components/TaskModal/TaskModal.test.tsx` -- fixtures/props `day` → `date`.
- `src/App.test.tsx`, `src/state/TaskContext.test.tsx`, `src/architecture.test.ts` -- ajustar quaisquer fixtures/asserções que usem `day`/`DayOfWeek`/`DAYS_OF_WEEK`.

## Tasks & Acceptance

**Execution:**
- [x] `src/types/index.ts` -- trocar `day`→`date`+`time` -- base do novo modelo
- [x] `src/constants/week.ts` -- criar (substitui `days.ts`) -- janela dinâmica + rótulos
- [x] `src/constants/days.ts`, `days.test.ts` -- deletar -- substituídos
- [x] `src/storage/tasksStorage.ts` -- schemaVersion 2 + `migrateFromV1` -- sem perda de dados
- [x] `src/state/selectors.ts`, `useTaskActions.ts` -- renomear `day`→`date` -- consumidores do novo tipo
- [x] `src/components/WeekView/{WeekView,dragChange}.tsx/.ts` -- janela dinâmica + rename -- coluna vira data real
- [x] `src/components/DayColumn/DayColumn.tsx`, `src/components/TaskModal/TaskModal.tsx` -- rename + label de data -- UI reflete data real
- [x] Todos os `.test.tsx`/`.test.ts` listados no Code Map -- adaptar fixtures -- suite verde (também `TaskCard.test.tsx`, não listado no Code Map mas com fixture `day:` encontrada por grep)

**Acceptance Criteria:**
- Given `schemaVersion: 1` salvo com tarefas em vários `day`, when o app carrega, then todas viram `schemaVersion: 2` com `date` dentro de `hoje..hoje+6`, nenhuma perdida/duplicada
- Given o app já está em `schemaVersion: 2`, when carrega de novo, then não roda migração nenhuma (idempotente)
- Given a tela é renderizada, when carrega, then as 7 colunas mostram `hoje..hoje+6` com data real + nome do dia, coluna de hoje com destaque `today-background`
- Given o Modal de Tarefa abre em modo edição, when o campo Dia é aberto, then lista as 7 datas da janela atual (não mais `'mon'..'sun'`)
- Given a suite de testes completa, when `npm test` roda, then passa sem falhas

## Design Notes

Esta spec entrega Story 5.1 (migração) **e** a base visível da Story 5.2 (janela dinâmica exibida) juntas, porque o tipo `Task.date` e a renderização por data real são inseparáveis no nível de código — não dá para compilar um sem o outro. O que fica de fora, para uma spec seguinte, é só o comportamento *dinâmico*: o timer que recalcula a janela com o app aberto (5.3) e o rollover automático de tarefas atrasadas (5.4). A máquina de arraste por zona de prioridade (`PriorityZone`/`groupKey`) é deliberadamente preservada como está — vira `(date, priority)` em vez de `(day, priority)`, mas a lógica de zonas/reordenação continua idêntica; removê-la é trabalho do Epic 4 revisado, depois dos Epics 6/7.

`migrateFromV1`, exemplo do mapeamento: dado `getWeekWindow()` = `['2026-09-18'(fri), '2026-09-19'(sat), ..., '2026-09-24'(thu)]`, uma tarefa `day: 'mon'` migra para a data da janela cujo `new Date(iso).getDay()` corresponde a segunda-feira (`'2026-09-21'`).

## Verification

**Commands:**
- `npm test -- --run` -- expected: toda a suite passa
- `npx tsc --noEmit` (ou `npm run build`, se já configurado) -- expected: zero erros de tipo

## Suggested Review Order

**Migração de schema (o ponto de risco real de perda de dados)**

- Ponto de entrada: decide migrar (`schemaVersion === 1`) vs. caminho de dado ilegível já existente.
  [`tasksStorage.ts:189`](../../src/storage/tasksStorage.ts#L189)

- Mapeia cada `day` salvo para a data real dentro da primeira janela `hoje..hoje+6` e renumera `order` por `(date, priority)`.
  [`tasksStorage.ts:142`](../../src/storage/tasksStorage.ts#L142)

- Validação do formato antigo (v1) antes de migrar — item malformado nunca migra parcialmente.
  [`tasksStorage.ts:101`](../../src/storage/tasksStorage.ts#L101)

- Validação do formato atual (v2) — inclui o guard de data calendarmente inválida adicionado na revisão.
  [`tasksStorage.ts:75`](../../src/storage/tasksStorage.ts#L75)

- Guard de patch: rejeita datas lexicamente válidas mas inexistentes no calendário (ex. `2026-02-30`).
  [`tasksStorage.ts:52`](../../src/storage/tasksStorage.ts#L52)

**Janela dinâmica de 7 dias (novo módulo, substitui `days.ts`)**

- `getWeekWindow` — 7 datas ISO consecutivas, `anchor..anchor+6`, âncora padrão hoje.
  [`week.ts:54`](../../src/constants/week.ts#L54)

- `parseISODateLocal`/`toISODate` — única via de conversão `Date`↔ISO, evita o bug clássico de UTC/fuso horário.
  [`week.ts:36`](../../src/constants/week.ts#L36)

- `formatDayHeading` — rótulo de coluna/Dia (ex. "Sexta-feira, 18/09"), usado por `DayColumn` e `TaskModal`.
  [`week.ts:84`](../../src/constants/week.ts#L84)

**Modelo de dados (`Task.day` → `Task.date`+`time`)**

- Novo formato do tipo `Task` — base de tudo o resto desta história.
  [`types/index.ts:32`](../../src/types/index.ts#L32)

**Janela dinâmica consumida pela UI**

- `WeekView` itera a janela dinâmica em vez de `DAYS_OF_WEEK`; `today` deriva de `week[0]` (patch da revisão, evita duas fontes de "hoje").
  [`WeekView.tsx:63`](../../src/components/WeekView/WeekView.tsx#L63)

- `TaskModal` calcula a janela uma única vez por montagem (patch da revisão, evita recomputar a cada tecla digitada).
  [`TaskModal.tsx:70`](../../src/components/TaskModal/TaskModal.tsx#L70)

**Rename mecânico `day`→`date` (mesma lógica, tipo do identificador muda)**

- Arraste por zona de prioridade: `groupKey`/`parseGroupKey`/`WeekDragChange` agora chaveados por `(date, priority)`.
  [`dragChange.ts:16`](../../src/components/WeekView/dragChange.ts#L16)

- `sortTasksInDay`/`getNextOrderInGroup`/`closeOrderGap` — assinatura muda, lógica intacta.
  [`selectors.ts:24`](../../src/state/selectors.ts#L24)

- `CreateTaskInput`/`UpdateTaskInput` — `day`→`date` nos parâmetros de ação.
  [`useTaskActions.ts:17`](../../src/state/useTaskActions.ts#L17)

- `DayColumnProps`/`PriorityZoneProps` — `day`→`date`, cabeçalho usa `formatDayHeading`.
  [`DayColumn.tsx:15`](../../src/components/DayColumn/DayColumn.tsx#L15)

---
title: 'Story 4.2: Mudar prioridade ou dia arrastando o card'
type: 'feature'
created: '2026-09-15'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'c295748'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Story 4.1 só reordena dentro do mesmo `(day,priority)` — mudar a Prioridade ou o Dia de uma tarefa ainda exige abrir o Modal, mesmo sendo um ajuste rápido que Isabel já visualiza arrastando.

**Approach:** O mesmo gesto de arraste da 4.1 passa a alcançar qualquer zona de prioridade de qualquer dia — decisão confirmada com Isabel: consolidar os contextos isolados por grupo da 4.1 num único `DragDropProvider` no nível de `WeekView`, e sempre renderizar as 4 zonas de prioridade por dia (mesmo vazias, discretas fora do arraste). Cruzar grupo (Prioridade OU Dia diferentes) reaproveita `useTaskActions.updateTask` — a mesma função que o Modal já usa — sem função de ação nova; permanecer no mesmo grupo continua sendo a Story 4.1 (`reorderTask`), intocada.

## Boundaries & Constraints

**Always:** Arrastar para outra faixa de Prioridade do mesmo dia muda só a Prioridade (Dia preservado); arrastar para a coluna de outro dia muda só o Dia (Prioridade preservada); se o destino muda os dois ao mesmo tempo (outro dia E outra faixa), Dia e Prioridade são atualizados juntos numa única chamada de `updateTask` — nunca duas chamadas/dois passos separados. Em qualquer um dos três casos, entra no fim do grupo de destino pela ordenação automática (AD-7, via `reorderWithinGroup` dentro de `updateTask`), nunca numa posição exata (exclusivo da 4.1, mesmo grupo). Mudar Dia nunca muda o Estado. Origem=destino (Prioridade E Dia iguais) é a Story 4.1 (`reorderTask`) — intocada. As 4 zonas de Prioridade por dia existem sempre (mesmo vazias), discretas fora de um arraste ativo, mais evidentes só durante o arraste (decisão confirmada com Isabel, adição desta story, fora de `DESIGN.md`). Teclado: sensor do `@dnd-kit` na alça dedicada da 4.1, idêntico ao mouse. Foco: um cruzamento de grupo desmonta/remonta o nó DOM da tarefa — foco restaurado à própria alça já remontada (fallback seguro se não encontrada), mesmo padrão de efeito pós-render já usado em `DayColumn.tsx` (retro Epic 2, achado 1). Falha de escrita: reverte visualmente, sem retry automático. Tarefa Concluída arrasta normalmente, sem alterar Estado/diferenciação visual (3.2). Modal continua alternativa completa (2.2). `useTaskActions` único chamador do reducer; só `src/storage/` toca `localStorage`.

**Ask First:** já resolvido com Isabel antes desta spec — (1) consolidar num `DragDropProvider` único em `WeekView` (não manter isolamento por grupo da 4.1); (2) reaproveitar `updateTask` para os dois caminhos de cruzamento de grupo, sem `moveTaskToDay` novo; (3) sempre renderizar as 4 zonas de Prioridade por dia, mesmo vazias.

**Never:** Posição exata dentro do grupo de destino via arraste (Story 4.1 cobre só o mesmo grupo). Nova função de reindexação (`reorderWithinGroup` já resolve os dois grupos afetados). Tocar `cycleState`/clique-abre-edição/`StateIndicator` existentes. Novo botão/ação de ação no Modal.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mudar Prioridade (mesmo dia) | Arrasta para outra faixa do mesmo dia | Prioridade muda, entra no fim do grupo novo, `updateTask` chamado | N/A |
| Mudar Dia (mesma faixa) | Arrasta para a coluna de outro dia, mesma faixa de Prioridade | Só o Dia muda, Prioridade/Estado preservados, entra no fim do grupo novo | N/A |
| Mudar Dia e Prioridade juntos | Arrasta para outra faixa de outro dia (os dois mudam) | Dia e Prioridade atualizados juntos numa única chamada de `updateTask`, entra no fim do grupo novo | N/A |
| Mesmo grupo (origem = destino) | Solta na mesma `(day,priority)` de origem | Story 4.1 (`reorderTask`), sem regressão | N/A |
| Zona de Prioridade vazia | Solta numa faixa sem nenhuma tarefa hoje | Funciona normalmente — zona sempre existe, mesmo vazia | N/A |
| Fora de qualquer alvo | Solta fora de toda a grade da semana | Nada muda, mesma lógica de "sem destino" da 4.1 | N/A |
| Teclado | Sensor de teclado na alça, cruzando grupo | Idêntico ao mouse: mesma função, mesma persistência, foco restaurado na alça movida | N/A |
| Escrita falha | Solta em novo grupo, `saveTasks` retorna `{ok:false}` | Card volta à posição/grupo original | Sem retry automático |

</frozen-after-approval>

## Code Map

- `src/components/WeekView/WeekView.tsx` -- modificar -- move o `<DragDropProvider>` para cá (de `DayColumn`, 4.1), único para a semana; `onDragEnd` com a decisão abaixo.
- `src/components/WeekView/*` (novo arquivo, ex. `dragChange.ts`) + teste -- nova `resolveWeekDragChange(tasks, event)`: compara grupo de origem (`initialGroup`) e destino (`group`) do `source` do evento — mesmo grupo → `{kind:'reorder', id, toIndex}` (delega à lógica já existente da 4.1); diferente → `{kind:'move', id, day, priority}` (destino). Consultar os tipos reais instalados (`node_modules/@dnd-kit/dom`) para os campos exatos, não assumir.
- `src/components/DayColumn/*` -- modificar -- deixa de criar seu próprio `DragDropProvider`/segmentos contíguos (sobe para `WeekView`); renderiza as 4 zonas de Prioridade fixas (com ou sem tarefas) sempre presentes; novo efeito de foco pós-cruzamento de grupo (restaura à alça da tarefa movida, mesmo padrão de `wasEditingRef`/`.isConnected` já usado neste arquivo, retro Epic 2 achado 1).
- `src/state/useTaskActions.ts`, `src/state/selectors.ts` -- **sem alteração** -- `updateTask`+`reorderWithinGroup` (cruza grupo) e `reorderTask`+`reorderGroupByIndex` (mesmo grupo, 4.1) já cobrem os dois caminhos.
- `src/components/TaskCard/*` -- **sem alteração** -- mesma alça dedicada da 4.1, reaproveitada tal como está.

## Tasks & Acceptance

**Execution:**
- [x] `WeekView.tsx` -- `DragDropProvider` único para a semana + `onDragEnd`
- [x] `resolveWeekDragChange` (novo) + teste -- decide mesmo-grupo vs. cruzamento
- [x] `DayColumn/*` -- 4 zonas de Prioridade sempre presentes, discretas fora do arraste
- [x] `DayColumn/*` -- foco restaurado à alça da tarefa movida após cruzamento de grupo
- [x] Testes de regressão: Story 4.1 (mesmo grupo) continua funcionando sem alteração de comportamento

**Acceptance Criteria:**
- Given uma tarefa num nível de Prioridade dentro de um dia, when Isabel arrasta o Card para outra faixa de Prioridade do mesmo dia, then a Prioridade muda para a do destino e é posicionada pela ordenação automática (AD-7), via `useTaskActions.updateTask`
- Given uma tarefa na coluna de um dia, when Isabel arrasta o Card para a coluna de outro dia mantendo a mesma faixa de Prioridade, then só o Dia muda, ela entra na nova coluna já ordenada pela Prioridade atual, e o Estado não é alterado
- Given uma tarefa é arrastada para outra faixa de Prioridade de outro dia (os dois mudam ao mesmo tempo), when a ação é executada, then Dia e Prioridade são atualizados juntos numa única chamada de `updateTask`, nunca duas chamadas separadas
- Given o arraste de prioridade/dia usa o sensor de teclado do `@dnd-kit` na alça dedicada, when Isabel realiza a mesma mudança, then o resultado é idêntico ao mouse — mesma função, mesma persistência, foco visível e restaurado na alça da tarefa movida
- Given uma zona de Prioridade sem nenhuma tarefa hoje, when Isabel solta um Card nela, then a mudança funciona normalmente (a zona sempre existe)
- Given a mudança usa `updateTask`, when a ação é executada, then nenhuma lógica de mudança de Prioridade/Dia é duplicada — mesma função que o Modal (Story 2.2) usaria
- Given Isabel solta o Card numa nova faixa/coluna, when a escrita em `localStorage` falha, then o Card volta à posição/dia original, sem retry automático
- Given qualquer mudança possível por arraste, then a mesma mudança continua possível pelo Modal, e vice-versa — nenhuma via substitui a outra

## Design Notes

Decisão de origem×destino sem nova função pura de reindexação — só roteamento:

```ts
function resolveWeekDragChange(tasks: Task[], event: DragEndEvent):
  | { kind: 'reorder'; id: string; toIndex: number }
  | { kind: 'move'; id: string; day: DayOfWeek; priority: Priority | null }
  | null {
  // mesmo grupo (initialGroup === group) -> delega à lógica da 4.1 (reorderTask)
  // grupo diferente -> extrai {day,priority} da chave do grupo de destino,
  // devolve 'move' para o handler chamar updateTask com title/state atuais da tarefa
}
```

`updateTask` já reindexa os dois grupos (origem e destino) via `reorderWithinGroup` — nenhuma duplicação. O "salto" visual (prévia do `@dnd-kit` durante o arraste pode sugerir uma posição exata no destino, mas o resultado final sempre vai para o fim do grupo, per AD-7) é esperado e consistente com o texto da spec/epics.md — não é regressão.

## Verification

**Commands:**
- `npm run build` -- expected: `tsc` + `vite build` limpos
- `npm run test` -- expected: todos os testes passam, cobrindo as 8 ACs, as 8 linhas da matriz I/O, e nenhuma regressão nos testes existentes de Epics 1-4.1 (214 testes atuais)

## Suggested Review Order

**Decisão de roteamento (o coração da story: mesmo grupo vs. cruzamento)**

- `resolveWeekDragChange`: compara `source.group`/`initialGroup` do evento — decide `reorder` (4.1, intocada) ou `move` (Dia e/ou Prioridade). Patch da revisão: guard de `target` ausente.
  [`dragChange.ts:53`](../../src/components/WeekView/dragChange.ts#L53)

- `applyWeekDragChange`: extraída na revisão para ser testável sem `@dnd-kit` real — decide `reorderTask` vs. `updateTask` (título/Estado preservados, Dia+Prioridade sempre numa única chamada).
  [`dragChange.ts:143`](../../src/components/WeekView/dragChange.ts#L143)

**Consolidação do `DragDropProvider` (mudança arquitetural da 4.1 para a 4.2)**

- `WeekView`: único provider para a semana; `handleDragEnd` só agenda restauração de foco depois de confirmar sucesso (patch da revisão — corrigia uma referência obsoleta em falha de escrita).
  [`WeekView.tsx:48`](../../src/components/WeekView/WeekView.tsx#L48)

- `DayColumn`: as 4 zonas de Prioridade sempre presentes (mesmo vazias), discretas fora do arraste.
  [`DayColumn.tsx:126`](../../src/components/DayColumn/DayColumn.tsx#L126)

**Foco pós-cruzamento de grupo**

- `dragHandleRegistry`: registro id→nó DOM da alça, sobrevive ao desmonte/remonte entre dias/zonas; `unregisterDragHandle` (patch da revisão) limpa na exclusão definitiva.
  [`dragHandleRegistry.ts:39`](../../src/components/WeekView/dragHandleRegistry.ts#L39)

**Peripheral: testes**

- Cobre as 8 ACs + as 8 linhas da matriz I/O via eventos sintéticos e ações mockadas, mais os patches da revisão.
  [`dragChange.test.ts:1`](../../src/components/WeekView/dragChange.test.ts#L1)

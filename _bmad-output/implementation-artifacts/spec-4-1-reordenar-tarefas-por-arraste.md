---
title: 'Story 4.1: Reordenar tarefas por arraste dentro do mesmo nível de prioridade'
type: 'feature'
created: '2026-09-15'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'a23fd40'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dentro do mesmo dia e nível de prioridade, a ordem das tarefas hoje só reflete a ordem de criação (`order`, AD-7) — não há como Isabel expressar seu próprio julgamento sobre qual tarefa vem primeiro dentro de um mesmo nível.

**Approach:** Cada Card ganha uma alça de arraste dedicada (elemento próprio, focável) que ativa `@dnd-kit/react` (primeira dependência externa além de React, AD-6) escopado ao grupo `(day, priority)` do Card — arrastar reordena só dentro desse grupo, nunca cruzando prioridade/dia (Story 4.2). A alça existe especificamente para não colidir com o Enter/Espaço que o Card (edição, 2.2) e o `StateIndicator` (ciclo de Estado, 3.1) já usam — decisão confirmada com Isabel antes desta spec.

## Boundaries & Constraints

**Always:** Arrastar reordena só dentro do mesmo `(day, priority)` (Prioridade/Dia é Story 4.2). Alça de arraste é elemento próprio e focável (`tabIndex=0`, nome acessível "Arrastar tarefa: {título}") — nunca o Card nem o `StateIndicator` ativando o sensor de teclado. Mouse: segurar+mover a alça inicia o arraste (threshold de distância do `@dnd-kit` evita conflito com clique simples no Card). Teclado, só na alça: Enter/Espaço entra em "modo de arraste", `↑`/`↓` movem no grupo, Enter/Espaço confirma, Esc cancela voltando à posição original — foco visível sempre. Durante o arraste: sombra+leve rotação no Card, placeholder tracejado no destino. Toda mutação via `useTaskActions.reorderTask` (guard AD-4, nunca dispatch cru do handler). Falha de escrita: Card volta à posição original, sem retry automático. `@dnd-kit/react`+`@dnd-kit/dom`+`@dnd-kit/helpers` em `0.5.0` exato (sem `^`, risco aceito AD-6).

**Ask First:** já resolvido com Isabel antes desta spec — alça de arraste dedicada (não o Card, não o Indicador) ativa o sensor de teclado, exatamente para não sobrepor o Enter/Espaço já usados por eles.

**Never:** Mudar Prioridade ou Dia por arraste (Story 4.2 — cruzar grupo é estruturalmente impedido nesta story, não revertido). Reimplementar reindexação com uma função diferente da nova função pura desta story (distinta de `reorderWithinGroup`, que já existe só para mudança de grupo/Story 2.2). Tocar `cycleState`/clique-abre-edição existentes. Adicionar biblioteca de estado externa (AD-5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reordenar via mouse | Arrasta a alça de um Card para outra posição no mesmo grupo | `order` do grupo reindexado sequencialmente, persiste entre sessões | N/A |
| Reordenar via teclado | Enter na alça, `↓`/`↑` movem, Enter confirma | Mesmo resultado do mouse: mesma reindexação, mesma persistência, foco visível | N/A |
| Cancelar via teclado | Modo de arraste ativo, pressiona Esc | Volta à posição original, nada persistido | N/A |
| Escrita falha | Solta o Card numa nova posição, `saveTasks` retorna `{ok:false}` | Card volta visualmente à posição original | Sem retry automático |
| Grupo com 1 tarefa | Único Card no grupo `(day, priority)` | Arraste não tem para onde mover; no-op | N/A |

</frozen-after-approval>

## Code Map

- `package.json` -- modificar -- adicionar `@dnd-kit/react`, `@dnd-kit/dom`, `@dnd-kit/helpers` em `"0.5.0"` exato (sem `^`).
- `src/state/selectors.ts` + teste -- nova `reorderGroupByIndex(tasks, id, day, priority, toIndex)`: reindexa o grupo `(day,priority)` colocando `id` na posição `toIndex` — nome deliberadamente distinto de `reorderWithinGroup` (mudança de *grupo*, não de posição no mesmo grupo). [`selectors.ts:51`](../../src/state/selectors.ts#L51) (assinatura-padrão a seguir, não reaproveitar)
- `src/state/useTaskActions.ts` + teste -- nova `reorderTask(id, toIndex)`: guard AD-4, reaproveita `dispatch({type:'update', tasks})`. [`useTaskActions.ts:76`](../../src/state/useTaskActions.ts#L76) (`updateTask`, padrão a seguir)
- `src/components/TaskCard/*` -- modificar -- nova alça de arraste (elemento próprio, `tabIndex=0`, ícone discreto tipo grip), estilo "levantado" durante arraste; consultar a API instalada (`node_modules/@dnd-kit/react`) para o hook de sortable — a lib já separa `listeners` (presos só na alça) de `ref` do item, sem solução própria necessária. [`TaskCard.tsx:23`](../../src/components/TaskCard/TaskCard.tsx#L23)
- `src/components/DayColumn/*` -- modificar -- contexto(s) de arraste escopado(s) por grupo `(day,priority)` (sequência contígua já ordenada por `sortTasksInDay`); placeholder tracejado; chama `reorderTask` no drop/confirmação. [`DayColumn.tsx:79`](../../src/components/DayColumn/DayColumn.tsx#L79)

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- adicionar as 3 dependências do `@dnd-kit` em `0.5.0` exato
- [x] `src/state/selectors.ts` + teste -- `reorderGroupByIndex`
- [x] `src/state/useTaskActions.ts` + teste -- `reorderTask(id, toIndex)` com guard AD-4
- [x] `src/components/TaskCard/*` -- alça de arraste dedicada, visual de "levantado"
- [x] `src/components/DayColumn/*` -- contexto de arraste escopado por grupo, placeholder, liga `reorderTask`

**Acceptance Criteria:**
- Given duas ou mais tarefas do mesmo dia e nível de Prioridade, when Isabel arrasta a alça de um Card para outra posição dentro desse grupo, then o Card é reposicionado, `reorderGroupByIndex` reindexa sequencialmente o grupo, e a nova ordem persiste entre sessões
- Given um arraste em andamento, when o Card está sendo arrastado, then ele ganha sombra+rotação e um placeholder tracejado marca o destino
- Given a alça de arraste em foco, when Isabel usa Enter/Espaço + setas + Enter (sensor de teclado), then o resultado é idêntico ao arraste por mouse — mesma reindexação, mesma persistência, foco visível durante toda a operação
- Given o modo de arraste por teclado ativo, when Isabel pressiona Esc, then volta à posição original, nada é persistido
- Given o drop/confirmação dispara a reordenação, when a ação é executada, then chama `useTaskActions.reorderTask` — nenhum dispatch cru a partir do handler de drag
- Given Isabel solta o Card numa nova posição, when a escrita em `localStorage` falha, then o Card volta visualmente à posição original, sem retry automático

## Design Notes

`reorderGroupByIndex` é uma função nova, não uma extensão de `reorderWithinGroup` — a existente já tem um contrato fechado (no-op se o grupo não muda, reindexa só quando Dia/Prioridade mudam). Reposicionar dentro do *mesmo* grupo é uma operação diferente (o grupo nunca muda, só a ordem relativa):

```ts
export function reorderGroupByIndex(
  tasks: Task[], id: string, day: DayOfWeek, priority: Priority | null, toIndex: number,
): Task[] {
  const group = tasks.filter((t) => t.day === day && t.priority === priority).sort((a, b) => a.order - b.order);
  const withoutTarget = group.filter((t) => t.id !== id);
  const target = group.find((t) => t.id === id);
  if (!target) return tasks;
  withoutTarget.splice(toIndex, 0, target);
  const newOrder = new Map(withoutTarget.map((t, i) => [t.id, i]));
  return tasks.map((t) => (newOrder.has(t.id) ? { ...t, order: newOrder.get(t.id)! } : t));
}
```

Escopo do contexto de arraste: como `sortTasksInDay` já ordena por prioridade e depois por `order`, cada nível de prioridade é uma sequência contígua no array recebido por `DayColumn`. O agrupamento exato (múltiplos contextos `@dnd-kit` por sequência contígua, ou um único contexto com validação de grupo no `onDragEnd`) fica para a implementação decidir conforme a API real da versão instalada — o resultado exigido é: nunca é possível soltar um Card fora do seu próprio grupo nesta story.

## Verification

**Commands:**
- `npm install` -- expected: instala `@dnd-kit/react`, `@dnd-kit/dom`, `@dnd-kit/helpers` em `0.5.0` exato
- `npm run build` -- expected: `tsc` + `vite build` limpos
- `npm run test` -- expected: todos os testes passam, cobrindo as 6 ACs e as 5 linhas da matriz I/O

## Suggested Review Order

**Lógica pura (a mutação nova + a leitura do evento de drop, testáveis sem simular o gesto físico)**

- `reorderGroupByIndex`: reposiciona dentro do mesmo grupo `(day,priority)` — distinta de `reorderWithinGroup` (mudança de grupo).
  [`selectors.ts:86`](../../src/state/selectors.ts#L86)

- `reorderTask`: guard AD-4, reaproveita `dispatch({type:'update', tasks})`, mesmo padrão de `cycleState`/`updateTask`.
  [`useTaskActions.ts:178`](../../src/state/useTaskActions.ts#L178)

- `resolveDragReorder`: extraída de `handleDragEnd` para ser testável com um `DragEndEvent` sintético — cobre mouse e teclado igualmente (mesmo formato de evento). Patch da revisão: comparação por conteúdo em vez de identidade de referência.
  [`DayColumn.tsx:100`](../../src/components/DayColumn/DayColumn.tsx#L100)

- `groupTasksByPriority`: decide quais tarefas compartilham um contexto de arraste — exportada e testada diretamente na revisão (não tinha teste próprio antes).
  [`DayColumn.tsx:38`](../../src/components/DayColumn/DayColumn.tsx#L38)

**Alça de arraste dedicada (decisão de teclado confirmada com Isabel antes da spec)**

- Elemento próprio, `tabIndex=0`, renderizada só quando `dragHandleRef` é fornecida (patch da revisão) — nunca o Card nem o `StateIndicator` ativando o sensor.
  [`TaskCard.tsx:60`](../../src/components/TaskCard/TaskCard.tsx#L60)

**Fiação: DayColumn escopa o arraste por grupo, nunca cruza prioridade**

- `TaskPriorityGroup`/`SortableTaskItem`: um `DragDropProvider` por grupo contíguo — cruzar prioridade é estruturalmente impossível aqui (Story 4.2).
  [`DayColumn.tsx:134`](../../src/components/DayColumn/DayColumn.tsx#L134)

**Peripheral: testes**

- Cobre as 6 ACs + as 5 linhas da matriz I/O via eventos sintéticos, mais os patches da revisão (tamanho do alvo WCAG 2.5.8, alça condicional).
  [`DayColumn.test.tsx:1`](../../src/components/DayColumn/DayColumn.test.tsx#L1)

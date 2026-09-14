---
title: 'Story 3.1: Alternar Estado pelo Indicador de Estado'
type: 'feature'
created: '2026-09-14'
status: 'done'
review_loop_iteration: 0
baseline_commit: '101cc53'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hoje o único jeito de mudar o Estado de uma tarefa é abrir o `TaskModal` completo e usar o campo Estado (Story 2.2) — não há atalho rápido para marcar o que foi começado/concluído sem esse fluxo inteiro.

**Approach:** `StateIndicator` (já visual desde a 2.1) ganha seu próprio ponto de interação — clique ou teclado ciclam o Estado (Pendente→Em andamento→Concluída→Pendente) sem abrir o Modal — chamando a nova `useTaskActions.cycleState(id)`, que segue o guard atômico AD-4 e reaproveita a action `update` já existente no reducer (sem action nova).

## Boundaries & Constraints

**Always:** Clicar no `StateIndicator` de uma tarefa avança o Estado no ciclo fixo Pendente→Em andamento→Concluída→Pendente (wraparound), sem restrição de transição, sem abrir o Modal. Clicar em qualquer outra área do Card continua abrindo o Modal em edição (comportamento da Story 2.2, não regredir). Mudança reflete imediatamente na tela. `StateIndicator` anuncia o nome do Estado atual para leitor de tela e tem foco visível quando navegado por teclado, operável também via Enter/Espaço. Falha de escrita: Estado exibido não muda (sem atualização otimista), sem nova tentativa automática e silenciosa. `useTaskActions` único chamador do reducer; só `src/storage/` toca `localStorage`.

**Ask First:** nenhuma prevista — `StateIndicator` vira `role="button"`+`tabIndex=0` (não a tag `<button>` literal) porque `TaskCard` já é um `<button>` desde a 2.2 e HTML proíbe `<button>` aninhado em `<button>`. Sinalizado por visibilidade, não bloqueante — nenhuma AC exige a tag literal, só foco visível + teclado + anúncio ao leitor de tela (ver Design Notes).

**Never:** Diferenciação visual de "Concluída" (Story 3.2). Drag-and-drop (Epic 4). Mexer no campo Estado do Modal (2.2, via alternativa completa já existente). Mensagem de erro visível na falha de escrita — a AC só exige que o Estado exibido não mude (mesmo padrão já aceito para falha ao salvar tema, Story 1.3).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pendente → Em andamento | Clica no Indicador de uma tarefa Pendente | Estado muda para Em andamento na hora, Modal não abre | N/A |
| Em andamento → Concluída | Clica no Indicador de uma tarefa Em andamento | Estado muda para Concluída | N/A |
| Concluída → Pendente (wraparound) | Clica no Indicador de uma tarefa Concluída | Estado volta a Pendente | N/A |
| Teclado | Indicador em foco, pressiona Enter ou Espaço | Mesmo ciclo do clique | N/A |
| Clique fora do Indicador | Clica em qualquer outra área do Card | Modal abre em edição (Story 2.2), Estado não muda | N/A |
| Escrita falha | Clica no Indicador, `saveTasks` retorna `{ok:false}` | Estado exibido não muda | Sem retry automático |

</frozen-after-approval>

## Code Map

- `src/state/useTaskActions.ts` + teste -- modificar -- nova `cycleState(id)`, guard AD-4, reaproveita `dispatch({type:'update', tasks})` (mesma action da 2.2, sem mudar `tasksReducer.ts`). Padrão a seguir: [`useTaskActions.ts:76`](../../src/state/useTaskActions.ts#L76) (`updateTask`)
- `src/components/StateIndicator/*` -- modificar -- de `<span role="img">` inerte para interativo (`role="button"`, `tabIndex=0`, `onClick`+`onKeyDown` chamando `onCycle`, `stopPropagation` mantido); `.module.css` ganha `:focus-visible` (mesmo `--color-accent` 2px de `TaskCard.module.css`). [`StateIndicator.tsx:26`](../../src/components/StateIndicator/StateIndicator.tsx#L26)
- `src/components/TaskCard/*` -- modificar -- nova prop `onCycleState` repassada ao `StateIndicator`; `onClick` do Card (abre edição) não muda. [`TaskCard.tsx:20`](../../src/components/TaskCard/TaskCard.tsx#L20)
- `src/components/DayColumn/*` -- modificar -- chama `useTaskActions().cycleState(task.id)`, passa como `onCycleState` a cada `TaskCard`. [`DayColumn.tsx:62`](../../src/components/DayColumn/DayColumn.tsx#L62)

## Tasks & Acceptance

**Execution:**
- [x] `src/state/useTaskActions.ts` + teste -- `cycleState(id)` com guard AD-4, mapa de ciclo Pendente→Em andamento→Concluída→Pendente
- [x] `src/components/StateIndicator/*` -- `role="button"`, `tabIndex=0`, `onClick`/`onKeyDown` (Enter/Espaço) chamando `onCycle`, `:focus-visible`
- [x] `src/components/TaskCard/*` -- prop `onCycleState` repassada ao `StateIndicator`
- [x] `src/components/DayColumn/*` -- liga `cycleState` real a cada `TaskCard`

**Acceptance Criteria:**
- Given uma tarefa Pendente, when clica no Indicador de Estado do Card, then o Estado muda para Em andamento, refletido imediatamente, sem abrir o Modal
- Given uma tarefa Em andamento, when clica no Indicador, then o Estado muda para Concluída
- Given uma tarefa Concluída, when clica no Indicador, then o Estado volta a Pendente (wraparound), sem restrição nem penalidade
- Given qualquer outra área do Card fora do Indicador, when o clique ocorre, then o Modal abre normalmente (Story 2.2) e o clique no Indicador nunca abre o Modal
- Given o Indicador em foco por teclado, when pressiona Enter ou Espaço, then cicla o Estado como no clique; o Indicador anuncia o nome do Estado atual ao leitor de tela e mostra foco visível
- Given aciona o ciclo, when a escrita em `localStorage` falha, then o Estado exibido não muda, sem nova tentativa automática

## Design Notes

`cycleState` reaproveita a action `update` (sem action nova no reducer, mesmo padrão de `updateTask` para Título/Estado direto):

```ts
const STATE_CYCLE: Record<TaskState, TaskState> = { pending: 'in_progress', in_progress: 'done', done: 'pending' };

const cycleState = useCallback((id: string): TaskActionResult => {
  const target = state.tasks.find((t) => t.id === id);
  if (!target) return { ok: false, error: { message: 'Tarefa não encontrada.' } };
  const updated = state.tasks.map((t) => (t.id === id ? { ...t, state: STATE_CYCLE[t.state] } : t));
  const result = saveTasks(updated);
  if (!result.ok) return result;
  dispatch({ type: 'update', tasks: updated });
  return { ok: true, task: updated.find((t) => t.id === id) as Task };
}, [state.tasks, dispatch]);
```

`StateIndicator` vira um "botão" ARIA sem ser a tag `<button>` (ver Ask First): `role="button"` + `tabIndex={0}` + `onKeyDown` tratando `Enter`/`' '` (`preventDefault`, Espaço não rola a página) chamando a mesma função do `onClick` — padrão WAI-ARIA para um controle clicável dentro de outro. `stopPropagation()` só é necessário em `onClick` (impede abrir o Modal); em `onKeyDown` o foco já está no Indicador, nunca no `TaskCard`, então não há o que propagar.

## Verification

**Commands:**
- `npm run build` -- expected: `tsc` + `vite build` limpos
- `npm run test` -- expected: todos os testes passam, cobrindo as 6 ACs e as 6 linhas da matriz I/O

## Suggested Review Order

**Ação de estado (a mutação nova, reaproveita a action `update`)**

- `cycleState`: mapa de ciclo fixo + guard AD-4 (salva antes de despachar), mesmo padrão de `createTask`/`updateTask`/`deleteTask`.
  [`useTaskActions.ts:145`](../../src/state/useTaskActions.ts#L145)

**StateIndicator: de inerte a controle interativo (decisão ARIA sinalizada na spec)**

- `role="button"`+`tabIndex=0` em vez de `<button>` real — evita `<button>` aninhado no `<button>` do `TaskCard`.
  [`StateIndicator.tsx:33`](../../src/components/StateIndicator/StateIndicator.tsx#L33)

- `onKeyDown` trata Enter/Espaço e ignora `event.repeat` (patch da revisão: tecla segurada não deve ciclar várias vezes).
  [`StateIndicator.tsx:39`](../../src/components/StateIndicator/StateIndicator.tsx#L39)

**Fiação: TaskCard/DayColumn repassam a ação sem tocar no clique de edição (Story 2.2)**

- `DayColumn` chama `useTaskActions().cycleState` e liga ao `onCycleState` de cada `TaskCard`.
  [`DayColumn.tsx:88`](../../src/components/DayColumn/DayColumn.tsx#L88)

- `TaskCard` só repassa `onCycleState` ao `StateIndicator`; `onClick` do Card (abre edição) intacto.
  [`TaskCard.tsx:32`](../../src/components/TaskCard/TaskCard.tsx#L32)

**Peripheral: testes**

- Cobre o ciclo fixo, wraparound, escrita falha e id inexistente isoladamente no hook.
  [`useTaskActions.test.ts:416`](../../src/state/useTaskActions.test.ts#L416)

- Cobre o caminho ponta a ponta via `TaskContext` real: clique/teclado refletindo na tela, clique fora não cicla.
  [`WeekView.test.tsx:161`](../../src/components/WeekView/WeekView.test.tsx#L161)

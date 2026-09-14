---
title: 'Story 2.2: Editar tarefa existente'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: '3f3e987'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2.1 só cria tarefas — não há como corrigi-las depois. `TaskCard` não reage a clique, `TaskModal` só tem modo criação (Dia fixo, sem Estado).

**Approach:** Estender `TaskModal` (mesmo componente da 2.1) com modo edição: Nome/Dia/Prioridade/Estado preenchidos com os valores atuais, Dia agora editável (7 dias), Estado com 3 opções. `TaskCard` ganha `onClick` (exceto no `StateIndicator`, que só intercepta o clique sem efeito — ciclar é Epic 3) abrindo o Modal em edição. `useTaskActions.updateTask` segue o guard AD-4; quando Dia/Prioridade mudam, usa a nova função pura `reorderWithinGroup` (AD-7) para reindexar os grupos afetados — a peça que a Story 2.1 deixou para depois.

## Boundaries & Constraints

**Always:** Clique em qualquer área do `TaskCard` exceto `StateIndicator` abre o Modal em edição, pré-preenchido. `TaskCard` focável e operável por teclado, foco visível. Mudar Dia mantém Estado intacto; mudar Dia/Prioridade reposiciona via `reorderWithinGroup` (reindexa grupos afetados, entra no fim do novo). Editar só Título/Dia/Prioridade sem tocar Estado preserva o Estado anterior. Nome vazio: modal aberto, campo sinalizado, nada persistido. Falha de escrita: erro fixo em português, valores preservados, nunca retry automático. `useTaskActions` único chamador do reducer; só `src/storage/` toca `localStorage`.

**Ask First:** nenhuma prevista.

**Never:** "Excluir tarefa"/confirmação (2.3). Clique no `StateIndicator` ciclando, diferenciação visual de "Concluída" (Epic 3). Drag-and-drop (Epic 4, mesma função `reorderWithinGroup`, outro caminho). Lógica de tema.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edição feliz (só Nome) | Clique no Card, muda Nome, confirma | Nome atualizado, resto inalterado, modal fecha | N/A |
| Muda Dia | Confirma com Dia diferente | Sai da coluna antiga, entra na nova ordenada; Estado não muda | N/A |
| Muda Prioridade (mesmo dia) | Confirma com Prioridade diferente | Reposicionada no grupo novo; grupo antigo sem buraco | N/A |
| Muda Estado | Seleciona outro, confirma | Novo Estado persistido | N/A |
| Nome vazio | Confirma vazio | Modal aberto, campo sinalizado | Nada persistido |
| Escrita falha | `saveTasks` retorna `{ok:false}` | Modal aberto, erro inline, valores preservados | Mantém valores antigos até sucesso |

</frozen-after-approval>

## Code Map

- `src/state/selectors.ts` -- modificar -- `reorderWithinGroup(tasks, taskId, newDay, newPriority)`, no-op se grupo não muda
- `src/state/tasksReducer.ts` -- modificar -- action `update` (`{type:'update', tasks}`), substitui o array
- `src/state/useTaskActions.ts` + teste -- modificar -- `updateTask`, guard AD-4
- `src/components/StateIndicator/*` -- modificar -- `onClick` só `stopPropagation`
- `src/components/TaskCard/*` -- modificar -- vira `<button>` focável, `onClick` abre edição
- `src/components/TaskModal/*` -- modificar -- prop `task?` ativa edição (Dia 7 opções, Estado 3 opções)
- `src/components/DayColumn/*` -- modificar -- estado `editingTask`, devolve foco ao Card ao fechar

## Tasks & Acceptance

**Execution:**
- [x] `src/state/selectors.ts` + teste -- `reorderWithinGroup`
- [x] `src/state/tasksReducer.ts` -- action `update`
- [x] `src/state/useTaskActions.ts` + teste -- `updateTask` com guard AD-4
- [x] `src/components/StateIndicator/*` -- `stopPropagation`, sem ciclo
- [x] `src/components/TaskCard/*` -- `onClick`, focável por teclado
- [x] `src/components/TaskModal/*` -- modo edição completo
- [x] `src/components/DayColumn/*` -- liga clique do Card, gerencia foco

**Acceptance Criteria:**
- Given uma tarefa existe, when Isabel clica em qualquer área do Card exceto o Indicador de Estado, then o Modal abre em edição com Nome/Dia/Prioridade/Estado atuais
- Given Modal em edição, when muda o Dia e confirma, then a tarefa move de coluna, entra ordenada por Prioridade, Estado não muda
- Given Modal em edição, when muda a Prioridade e confirma, then é reposicionada no dia conforme o novo nível
- Given Modal em edição, when muda o Estado e confirma, then o novo Estado é persistido
- Given Modal em edição, when muda Título/Dia/Prioridade sem tocar Estado, then o Estado permanece o mesmo
- Given Modal em edição, when confirma com Nome vazio, then modal aberto, campo sinalizado, nada persistido
- Given confirma edição, when escrita falha, then modal aberto, erro inline, valores preservados, tarefa mantém valores antigos até sucesso

## Design Notes

`reorderWithinGroup`: grupo igual → retorna `tasks` sem mudar (título/Estado já atualizados antes, direto). Grupo diferente → reindexa sequencialmente o grupo antigo (fecha o buraco) e entra no fim do grupo novo (mesmo cálculo do `getNextOrderInGroup` da 2.1):

```ts
export function reorderWithinGroup(tasks: Task[], id: string, day: DayOfWeek, priority: Priority | null): Task[] {
  const target = tasks.find((t) => t.id === id);
  if (!target || (target.day === day && target.priority === priority)) return tasks;
  const oldOrder = new Map(
    tasks.filter((t) => t.id !== id && t.day === target.day && t.priority === target.priority)
      .sort((a, b) => a.order - b.order).map((t, i) => [t.id, i]),
  );
  const newOrder = tasks.filter((t) => t.id !== id && t.day === day && t.priority === priority).length;
  return tasks.map((t) => (t.id === id ? { ...t, day, priority, order: newOrder } : oldOrder.has(t.id) ? { ...t, order: oldOrder.get(t.id)! } : t));
}
```

`TaskCard` vira `<button>`; `StateIndicator` interno só chama `event.stopPropagation()` no clique — sem efeito visual (Epic 3 adiciona o ciclo).

## Verification

**Commands:**
- `npm run build` -- expected: `tsc` + `vite build` limpos
- `npm run test` -- expected: todos os testes passam, cobrindo as 7 ACs e as 6 linhas da matriz I/O

## Suggested Review Order

**Reindexação e ação de edição (a peça nova de estado)**

- `reorderWithinGroup`: no-op se grupo igual; senão fecha o buraco no grupo antigo e entra no fim do novo.
  [`selectors.ts:51`](../../src/state/selectors.ts#L51)

- `updateTask`: título/Estado direto, `reorderWithinGroup` para Dia/Prioridade, guard AD-4 (salva antes de despachar).
  [`useTaskActions.ts:70`](../../src/state/useTaskActions.ts#L70)

**TaskModal em modo edição**

- `isEditMode` decide `createTask` vs `updateTask` e quais campos aparecem (Dia editável, Estado).
  [`TaskModal.tsx:46`](../../src/components/TaskModal/TaskModal.tsx#L46)

**TaskCard clicável e acessível**

- Vira `<button>` com `aria-label` explícito — nome acessível limpo, não a concatenação dos filhos.
  [`TaskCard.tsx:20`](../../src/components/TaskCard/TaskCard.tsx#L20)

**DayColumn: duas fontes de abertura de modal, foco sempre em lugar seguro**

- `closeEditModal` cai para o botão "+ Adicionar tarefa" se o Card clicado já saiu do DOM (tarefa mudou de dia).
  [`DayColumn.tsx:34`](../../src/components/DayColumn/DayColumn.tsx#L34)

**Peripheral: testes**

- Cobre as 7 ACs + os patches da revisão (`reorderWithinGroup` isolado, "tarefa não encontrada", foco pós-mudança de dia).
  [`useTaskActions.test.ts:1`](../../src/state/useTaskActions.test.ts#L1)

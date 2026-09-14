---
title: 'Story 2.3: Excluir tarefa com confirmação'
type: 'feature'
created: '2026-09-14'
status: 'done'
review_loop_iteration: 0
baseline_commit: '18da02c'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Não há como remover uma tarefa que deixou de fazer sentido — Epic 2 fecha o CRUD, mas falta o "D". Sem isso, `getNextOrderInGroup` também carrega um risco latente (registrado em `deferred-work.md`): sem reindexar após remover, um buraco no `order` do grupo pode colidir com uma tarefa nova.

**Approach:** Adicionar a `TaskModal` (só modo edição) o ponto de entrada discreto "Excluir tarefa" que substitui o conteúdo do modal pela Confirmação de Exclusão (nunca um segundo modal). `useTaskActions.deleteTask` segue o guard AD-4 e usa a nova função pura `closeOrderGap` (AD-7) para reindexar sequencialmente o grupo `(day,priority)` da tarefa removida — fechando o risco latente da 2.1/2.2.

## Boundaries & Constraints

**Always:** "Excluir tarefa" só existe em modo edição, link discreto `ink-secondary`, nunca destaque. Clicar nele substitui o conteúdo do modal pela Confirmação (texto exato: "Excluir esta tarefa? Essa ação não pode ser desfeita."), nunca um modal empilhado. "Cancelar" volta ao modo edição preservando os valores exibidos antes, tarefa intacta. "Excluir" com sucesso remove a tarefa da visualização e dos dados persistidos, definitivo (sem desfazer/lixeira). Falha de escrita: confirmação permanece visível, erro fixo em português, nunca retry automático; tarefa não some até sucesso. Remover uma tarefa reindexa sequencialmente (via `closeOrderGap`) as demais do mesmo grupo `(day,priority)`. `useTaskActions` único chamador do reducer; só `src/storage/` toca `localStorage`.

**Ask First:** nenhuma prevista — Esc durante a Confirmação de Exclusão volta ao modo edição (mesmo efeito de "Cancelar"), em vez de fechar o modal inteiro, por consistência com "Cancelar"; decisão de UX menor não especificada literalmente nos docs, sinalizada aqui para visibilidade, não uma pergunta bloqueante.

**Never:** segundo modal/dialog empilhado para a confirmação. Desfazer/lixeira. Reordenação manual/drag (Epic 4). Lógica de tema.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Abre confirmação | Edição aberta, clica "Excluir tarefa" | Conteúdo vira Confirmação, texto+botões exatos | N/A |
| Cancela | Confirmação visível, clica "Cancelar" | Volta ao modo edição, valores preservados, nada mudou nos dados | N/A |
| Exclui feliz | Clica "Excluir", escrita ok | Tarefa some da coluna e dos dados; modal fecha | N/A |
| Exclui com grupo maior | 3 tarefas no mesmo `(day,priority)`, exclui a do meio | Restantes reindexadas sequencialmente (0,1), sem buraco | N/A |
| Escrita falha | Clica "Excluir", `saveTasks` retorna `{ok:false}` | Confirmação continua visível, erro inline | Tarefa não some até sucesso |
| Esc na confirmação | Confirmação visível, pressiona Esc | Volta ao modo edição (mesmo que "Cancelar"), nada mudou | N/A |

</frozen-after-approval>

## Code Map

- `src/state/selectors.ts` -- modificar -- `closeOrderGap(tasks, day, priority)`, reindexa sequencialmente um grupo
- `src/state/tasksReducer.ts` -- modificar -- action `delete` (`{type:'delete', tasks}`)
- `src/state/useTaskActions.ts` + teste -- modificar -- `deleteTask(id)`, guard AD-4 + `closeOrderGap`
- `src/components/TaskModal/*` -- modificar -- link "Excluir tarefa" (edição), sub-view de Confirmação, `button-destructive`, Esc volta à edição na confirmação

## Tasks & Acceptance

**Execution:**
- [x] `src/state/selectors.ts` + teste -- `closeOrderGap`
- [x] `src/state/tasksReducer.ts` -- action `delete`
- [x] `src/state/useTaskActions.ts` + teste -- `deleteTask` com guard AD-4
- [x] `src/components/TaskModal/*` -- link, sub-view de confirmação, erro, Esc

**Acceptance Criteria:**
- Given Modal em edição, when clica "Excluir tarefa", then conteúdo vira Confirmação com texto e botões exatos, nunca modal empilhado
- Given Confirmação visível, when clica "Cancelar", then volta à edição preservando valores, tarefa intacta
- Given Confirmação visível, when clica "Excluir" e escrita ok, then tarefa some da coluna e dos dados, definitivo
- Given confirma exclusão, when escrita falha, then confirmação continua visível com erro inline, tarefa não some até sucesso

## Design Notes

`closeOrderGap` reindexa por `order` relativo atual, sem remover nada (a remoção já aconteceu antes de chamar):

```ts
export function closeOrderGap(tasks: Task[], day: DayOfWeek, priority: Priority | null): Task[] {
  const group = tasks.filter((t) => t.day === day && t.priority === priority).sort((a, b) => a.order - b.order);
  const newOrder = new Map(group.map((t, i) => [t.id, i]));
  return tasks.map((t) => (newOrder.has(t.id) ? { ...t, order: newOrder.get(t.id)! } : t));
}
```

`deleteTask`: filtra a tarefa, reindexa o grupo dela, salva, só então despacha — mesmo guard de `createTask`/`updateTask`.

## Verification

**Commands:**
- `npm run build` -- expected: `tsc` + `vite build` limpos
- `npm run test` -- expected: todos os testes passam (rodar com `--no-file-parallelism` se houver contenção de workers), cobrindo as 4 ACs e as 6 linhas da matriz I/O

## Suggested Review Order

**Fecha o risco latente da 2.1/2.2 (reindexação após remover)**

- `closeOrderGap`: reindexa sequencialmente o grupo `(day,priority)` da tarefa removida — fecha o buraco.
  [`selectors.ts:83`](../../src/state/selectors.ts#L83)

- `deleteTask`: filtra a tarefa, reindexa, guard AD-4 (salva antes de despachar), definitivo.
  [`useTaskActions.ts:107`](../../src/state/useTaskActions.ts#L107)

**TaskModal: sub-view de confirmação, nunca um segundo modal**

- `handleDelete` chama `deleteTask`; falha mostra erro fixo em português, confirmação continua visível.
  [`TaskModal.tsx:200`](../../src/components/TaskModal/TaskModal.tsx#L200)

- Conteúdo do modal (`isConfirmingDelete`) substitui em vez de empilhar; Esc na confirmação volta à edição.
  [`TaskModal.tsx:51`](../../src/components/TaskModal/TaskModal.tsx#L51)

**Peripheral: testes**

- Cobre as 4 ACs + as 6 linhas da matriz I/O + os 3 patches da revisão (foco pós-cancelar, focus trap na confirmação, Esc preserva edição não salva).
  [`TaskModal.test.tsx:1`](../../src/components/TaskModal/TaskModal.test.tsx#L1)

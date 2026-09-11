---
title: 'Story 2.1: Criar tarefa'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: '4e880e1'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O TaskFlow (Epic 1) só tem a casca visual — nenhuma Tarefa pode ser criada ainda. `DayColumn` sempre mostra "Nenhuma tarefa" e o botão "+ Adicionar tarefa" é inerte.

**Approach:** Criar `TaskModal` (só modo criação nesta história), `useTaskActions.createTask()` seguindo o guard atômico do AD-4 (salva primeiro, só despacha em sucesso — mesmo padrão do `useThemeActions`), a primeira action real do `tasksReducer` (substituindo o passthrough), e `selectors.ts` (`sortTasksInDay` + `getNextOrderInGroup`, AD-7). `DayColumn`/`WeekView` passam a renderizar tarefas reais via `TaskCard` (com `StateIndicator`+`PriorityTag`, só visuais — sem clique funcional).

## Boundaries & Constraints

**Always:** Nome obrigatório, Dia fixo = coluna de origem (não editável), Prioridade opcional sem seleção padrão. Estado inicial sempre `'pending'`. Tarefa aparece imediatamente na coluna certa, ordenada por prioridade (Alta→Média→Baixa→sem), `order`=último do grupo `(day,priority)`. Nome vazio: modal aberto, campo sinalizado, nada criado. Falha de escrita: modal aberto, erro inline, campos preservados, nunca retry automático; nenhuma tarefa até sucesso. Modal retém foco; Esc fecha/descarta, foco volta ao "+ Adicionar tarefa". `useTaskActions` é o único chamador do reducer. Só `src/storage/` toca `localStorage` (reaproveitar `tasksStorage.ts`, sem alterá-lo).

**Ask First:** nenhuma prevista.

**Never:** modo edição/Estado/"Excluir tarefa" no `TaskModal` (Story 2.2/2.3). Dia editável (2.2). Clique no `TaskCard` abrindo edição (2.2). Clique no `StateIndicator` ciclando (Epic 3). `reorderWithinGroup`/drag (Epic 4) — só `order` de tarefa *nova* aqui. Lógica de tema.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Criação feliz | Nome + Prioridade opcional, confirma | Tarefa `pending`, posição certa por prioridade, `order`=último; modal fecha | N/A |
| Nome vazio | Confirma vazio | Modal aberto, campo sinalizado | Nada criado |
| Escrita falha | `saveTasks` retorna `{ok:false}` | Modal aberto, erro inline, campos preservados | Nada na coluna até sucesso |
| 2ª tarefa, mesmo dia+prioridade | Criação após a 1ª | `order` maior, aparece depois | N/A |
| Esc durante criação | Modal aberto, campos preenchidos | Fecha, nada criado, foco volta ao botão | N/A |

</frozen-after-approval>

## Code Map

- `src/state/selectors.ts` -- novo -- `sortTasksInDay`, `getNextOrderInGroup`
- `src/state/tasksReducer.ts` + `TaskContext.tsx` -- modificar -- action `create` real, tipar `dispatch`
- `src/state/useTaskActions.ts` + teste -- novo -- `createTask`, guard AD-4
- `src/components/StateIndicator/` (`.tsx`+`.module.css`+`.test.tsx`) -- novo -- 3 estados visuais, sem `onClick`
- `src/components/PriorityTag/` (`.tsx`+`.module.css`+`.test.tsx`) -- novo -- cor+texto, ausente se `null`
- `src/components/TaskCard/` (`.tsx`+`.module.css`+`.test.tsx`) -- novo -- compõe os dois acima + nome, sem `onClick`
- `src/components/TaskModal/` (`.tsx`+`.module.css`+`.test.tsx`) -- novo -- só criação, focus trap, Esc, erro inline
- `src/components/DayColumn/` (`.tsx`+`.test.tsx`) -- modificar -- liga o botão, renderiza tarefas reais
- `src/components/WeekView/` (`.tsx`+`.test.tsx`) -- modificar -- lê `TaskContext`, ordena por dia

## Tasks & Acceptance

**Execution:**
- [x] `src/state/selectors.ts` + teste -- `sortTasksInDay`, `getNextOrderInGroup`
- [x] `src/state/tasksReducer.ts` + `TaskContext.tsx` -- action `create`, tipar dispatch
- [x] `src/state/useTaskActions.ts` + teste -- `createTask` com guard AD-4
- [x] `src/components/StateIndicator/*` -- 3 estados visuais, sem interação
- [x] `src/components/PriorityTag/*` -- cor+texto por nível
- [x] `src/components/TaskCard/*` -- compõe os dois acima + nome
- [x] `src/components/TaskModal/*` -- modo criação, validação, erro inline, focus trap
- [x] `src/components/DayColumn/*` -- liga o botão, renderiza tarefas reais
- [x] `src/components/WeekView/*` -- filtra+ordena por dia

**Acceptance Criteria:**
- Given Isabel clica em "+ Adicionar tarefa", when o Modal abre, then Nome vazio e em foco, Dia fixo (coluna de origem), nenhuma Prioridade pré-selecionada, modal retém foco
- Given Modal em criação, when preenche Nome (+ Prioridade opcional) e confirma, then tarefa criada com Estado `pending`, aparece imediatamente na posição correta por prioridade com `order`=último do grupo, modal fecha
- Given Modal em criação, when confirma com Nome vazio, then modal permanece aberto sinalizando o campo, nenhuma tarefa criada
- Given confirma criação, when escrita falha, then modal aberto com erro inline, campos preservados, nunca retry automático, nenhuma tarefa até sucesso
- Given Modal aberto, when Isabel pressiona Esc, then fecha descartando o não salvo, foco volta ao "+ Adicionar tarefa" que abriu

## Design Notes

`getNextOrderInGroup` é só contagem — reindexação completa (`reorderWithinGroup`) só entra na Story 2.2/Epic 4:

```ts
export function getNextOrderInGroup(tasks: Task[], day: DayOfWeek, priority: Priority | null): number {
  return tasks.filter((t) => t.day === day && t.priority === priority).length;
}
```

`StateIndicator` renderiza os 3 estados de `DESIGN.md` mesmo só `'pending'` alcançável aqui — fiel ao tipo, sem `onClick` (Epic 3 adiciona a interação).

## Verification

**Commands:**
- `npm run build` -- expected: `tsc` + `vite build` limpos
- `npm run test` -- expected: todos os testes passam, cobrindo as 5 ACs e as 5 linhas da matriz I/O

## Suggested Review Order

**Fundação de estado (ordenação, action, guard atômico)**

- `getNextOrderInGroup`/`sortTasksInDay` — só contagem/leitura, reindexação completa fica pra Story 2.2/Epic 4.
  [`selectors.ts:20`](../../src/state/selectors.ts#L20)

- Primeira action real do reducer, substitui o passthrough da Story 1.2.
  [`tasksReducer.ts:20`](../../src/state/tasksReducer.ts#L20)

- `createTask`: salva primeiro, só despacha em sucesso (AD-4) — mesmo padrão do `useThemeActions`.
  [`useTaskActions.ts:27`](../../src/state/useTaskActions.ts#L27)

**TaskModal (só modo criação)**

- Validação de Nome (trim), erro fixo em português na falha de escrita.
  [`TaskModal.tsx:90`](../../src/components/TaskModal/TaskModal.tsx#L90)

- Focus trap Tab/Shift+Tab — mecanismo real de "modal retém o foco".
  [`TaskModal.tsx:56`](../../src/components/TaskModal/TaskModal.tsx#L56)

**Componentes visuais (sem interação — Epic 3/Story 2.2 ligam o clique depois)**

- `TaskCard` compõe `StateIndicator`+`PriorityTag`, sem `onClick`.
  [`TaskCard.tsx:13`](../../src/components/TaskCard/TaskCard.tsx#L13)

**Integração: DayColumn/WeekView renderizando dados reais**

- "+ Adicionar tarefa" liga ao `TaskModal`; foco volta ao botão em qualquer caminho de fechamento.
  [`DayColumn.tsx:18`](../../src/components/DayColumn/DayColumn.tsx#L18)

- `WeekView` lê `TaskContext`, entrega cada dia já ordenado — `DayColumn` nunca filtra/ordena por conta própria.
  [`WeekView.tsx:12`](../../src/components/WeekView/WeekView.tsx#L12)

**Peripheral: testes**

- Cobre as 5 ACs + os 5 patches da revisão (erro em PT, Nome só-espaço, priority null, foco pós-sucesso, focus trap).
  [`TaskModal.test.tsx:1`](../../src/components/TaskModal/TaskModal.test.tsx#L1)

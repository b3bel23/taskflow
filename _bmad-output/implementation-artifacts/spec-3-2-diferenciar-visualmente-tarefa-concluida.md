---
title: 'Story 3.2: Diferenciar visualmente tarefa concluída'
type: 'feature'
created: '2026-09-14'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'afc0446'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Desde a Story 3.1, uma tarefa pode chegar a Estado Concluída, mas nada no Card muda visualmente — só o `StateIndicator` preenchido, pouco perceptível de relance.

**Approach:** `TaskCard` aplica `completed-opacity` (0.55, `DESIGN.md`) ao card inteiro e `text-decoration: line-through` no nome, só quando `task.state === 'done'` — puramente visual (CSS), sem tocar em ordenação, ciclo de Estado ou remoção.

## Boundaries & Constraints

**Always:** Tarefa com Estado Concluída aplica as duas mudanças juntas (opacidade 0.55 no Card inteiro + risco no nome) — nunca uma sem a outra. Diferenciação reconhecível sem ler o rótulo de Estado. Tarefa Concluída permanece na mesma posição/coluna (nunca oculta, removida ou movida para seção separada) — comportamento já existente (nenhuma lógica hoje filtra/reordena por Estado), coberto por teste de regressão. Consistente em tema claro e escuro.

**Ask First:** nenhuma prevista.

**Never:** Tocar `cycleState`/`StateIndicator` (Story 3.1, já fecha o ciclo). Seção separada para tarefas concluídas. Drag-and-drop (Epic 4). Esconder/remover a tarefa da lista.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tarefa Concluída | `task.state === 'done'` | Card inteiro com opacidade 0.55, nome com line-through | N/A |
| Tarefa não Concluída | `task.state` é `'pending'` ou `'in_progress'` | Card e nome sem nenhuma das duas mudanças | N/A |
| Permanece na coluna | Tarefa muda para Concluída (via Story 3.1) | Continua na mesma posição/coluna, nunca some | N/A |
| Tema escuro | `data-theme="dark"`, tarefa Concluída | Mesma opacidade/line-through (nenhum dos dois depende de cor) | N/A |

</frozen-after-approval>

## Code Map

- `src/styles/tokens.css` -- modificar -- novo token `--opacity-completed: 0.55` em `:root` (escalar, sem cor — nenhuma variante `-dark` necessária).
  [`tokens.css:49`](../../src/styles/tokens.css#L49)
- `src/components/TaskCard/TaskCard.tsx` + `.module.css` + teste -- modificar -- classe condicional no `<button>` raiz (opacidade) e no `<p>` do título (line-through) quando `task.state === 'done'`.
  [`TaskCard.tsx:23`](../../src/components/TaskCard/TaskCard.tsx#L23)

## Tasks & Acceptance

**Execution:**
- [x] `src/styles/tokens.css` -- `--opacity-completed: 0.55`
- [x] `src/components/TaskCard/*` -- classes condicionais (opacidade no Card, line-through no nome) + teste

**Acceptance Criteria:**
- Given uma tarefa com Estado Concluída, when exibida em sua coluna, then o Card inteiro aplica opacidade 0.55 e o nome tem `text-decoration: line-through`, junto e reconhecível sem ler o rótulo
- Given uma tarefa não Concluída (Pendente ou Em andamento), when exibida, then nenhuma das duas mudanças aparece
- Given uma tarefa está Concluída, when a coluna é renderizada, then ela permanece na mesma posição/coluna, nunca oculta, removida ou movida para seção separada
- Given a diferenciação visual de Concluída, when o tema é claro ou escuro, then o resultado é o mesmo (nenhuma das duas mudanças depende de cor de tema)

## Verification

**Commands:**
- `npm run build` -- expected: `tsc` + `vite build` limpos
- `npm run test` -- expected: todos os testes passam, cobrindo as 4 ACs e as 4 linhas da matriz I/O

## Suggested Review Order

**Token e classes condicionais (a mudança visual)**

- Novo token `--opacity-completed: 0.55`, escalar sem cor — nenhuma variante `-dark` necessária.
  [`tokens.css:53`](../../src/styles/tokens.css#L53)

- `isCompleted` decide as duas classes juntas (Card + título), nunca uma sem a outra.
  [`TaskCard.tsx:26`](../../src/components/TaskCard/TaskCard.tsx#L26)

- `.completed:focus-visible` restaura opacidade total (patch da revisão: sem isto, o anel de foco ficaria esmaecido num Card Concluído).
  [`TaskCard.module.css:35`](../../src/components/TaskCard/TaskCard.module.css#L35)

**Peripheral: testes**

- Cobre as 4 ACs (opacidade+risco juntos, ausência em Pendente/Em andamento, permanência na coluna, tema escuro) + o patch de interação continuar funcionando num Card Concluído.
  [`TaskCard.test.tsx:100`](../../src/components/TaskCard/TaskCard.test.tsx#L100)

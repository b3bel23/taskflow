---
title: 'Story 1.2: Persistir dados de tarefas entre sessões'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'c886d97'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O TaskFlow (Story 1.1) só renderiza uma semana vazia estática — nada é lido/escrito no navegador ainda. Mesmo sem nenhuma Tarefa poder ser criada ainda (Epic 2), a base de persistência precisa existir e nunca quebrar o app: dado ausente ou corrompido deve cair graciosamente num estado vazio.

**Approach:** Criar o storage adapter (`loadTasks`/`saveTasks` em `src/storage/`, única porta para `localStorage` na chave `taskflow:tasks`) e o par `TaskContext`/`tasksReducer` (AD-5) que o consome, com init lazy síncrono. Sem nenhuma ação de mutação ainda (reducer passthrough — Epic 2 adiciona os action types); o escopo aqui é só a fundação de leitura/gravação + os dois avisos de interface que ela exige (erro de carga, uma vez; risco de dados locais, permanente).

## Boundaries & Constraints

**Always:** Envelope persistido é sempre `{schemaVersion: number, tasks: Task[]}` via `JSON.stringify`/`JSON.parse`, só por `loadTasks`/`saveTasks`. Chave ausente → estado vazio padrão sem erro. Chave ilegível (`getItem` lança, `JSON.parse` falha, `schemaVersion` não reconhecido) → mesmo estado vazio + `loadError`, mostrado uma vez: "Não foi possível carregar as tarefas salvas — começando do zero." App nunca lança exceção não tratada na inicialização. Aviso estático permanente (não condicional) de que os dados ficam só neste navegador (AD-3) sempre visível. Estado via `useReducer`+`Context` nativo (AD-5), sem lib externa. Carregamento síncrono via init lazy do `useReducer` (sem `useEffect`, sem loading visível).

**Ask First:** se surgir necessidade real de migração entre `schemaVersion`s durante a implementação, HALT e perguntar — não projetada nesta história (schema não reconhecido = tratado como ilegível).

**Never:** criar/editar/excluir Tarefa ou `useTaskActions` (Epic 2). `DayColumn` continua sempre "Nenhuma tarefa". Lógica de tema (Story 1.3). Backup/exportação (decisão do MVP).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Primeira instalação | Chave ausente | `{schemaVersion: CURRENT, tasks: []}`, sem aviso | N/A |
| Dado corrompido | `getItem` lança, `JSON.parse` falha, ou `schemaVersion` desconhecido | Mesmo estado vazio + `loadError=true` (aviso uma vez) | App não trava; erro nunca propaga para fora de `loadTasks` |
| Escrita falha | `saveTasks` chamado, `setItem` lança | Retorna `{ok:false, error:{message}}`, nunca lança | Nenhum estado commitado sem sucesso (base do AD-4, sem chamador ainda) |

</frozen-after-approval>

## Code Map

- `src/types/index.ts` -- existente (só `DayOfWeek`), adicionar `Task`/`TaskState`/`Priority`
- `src/storage/tasksStorage.ts` + `.test.ts` -- novo, único módulo que toca `localStorage` de tarefas
- `src/state/tasksReducer.ts` -- novo, passthrough
- `src/state/TaskContext.tsx` + `.test.tsx` -- novo, `TaskProvider`/`useTaskContext`
- `src/components/PersistenceNotice/` (`.tsx`+`.module.css`+`.test.tsx`) -- novo
- `src/App.tsx` -- modificar, envolve com `TaskProvider` + monta `PersistenceNotice`

## Tasks & Acceptance

**Execution:**
- [x] `src/types/index.ts` -- adicionar `Task`/`TaskState`/`Priority` -- envelope de persistência precisa desses tipos
- [x] `src/storage/tasksStorage.ts` + teste -- `loadTasks`/`saveTasks` -- AD-2, AD-8
- [x] `src/state/tasksReducer.ts` -- reducer passthrough -- AD-5 (fundação Epic 2)
- [x] `src/state/TaskContext.tsx` + teste -- Provider com init lazy síncrono -- AD-5
- [x] `src/components/PersistenceNotice/*` -- avisos estático + de erro -- AD-3, CAP-8
- [x] `src/App.tsx` -- integrar `TaskProvider` + `PersistenceNotice` na árvore real

**Acceptance Criteria:**
- Given não existe chave `taskflow:tasks`, when o app inicializa, then estado cai no padrão vazio, sem erro
- Given existe chave `taskflow:tasks` ilegível, when o app inicializa, then estado cai no padrão vazio, aviso único é exibido, app nunca trava
- Given app em uso normal, when qualquer leitura/escrita de tarefas ocorre, then só `src/storage/` acessa `localStorage`
- Given qualquer estado do app, when renderizado, then o aviso estático de dados locais está sempre visível

## Design Notes

`loadTasks` nunca lança — `try/catch` interno, schema desconhecido ou `tasks` não-array conta como ilegível:

```ts
export function loadTasks(): { tasks: Task[]; loadError: boolean } {
  try {
    const raw = window.localStorage.getItem('taskflow:tasks');
    if (raw === null) return { tasks: [], loadError: false };
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== CURRENT_SCHEMA_VERSION || !Array.isArray(parsed.tasks)) {
      return { tasks: [], loadError: true };
    }
    return { tasks: parsed.tasks, loadError: false };
  } catch {
    return { tasks: [], loadError: true };
  }
}
```

`TaskContext`: `useReducer(tasksReducer, undefined, () => loadTasks())` — init lazy lê `localStorage` uma vez, síncrono, antes da primeira renderização.

## Verification

**Commands:**
- `npm run build` -- expected: `tsc` + `vite build` limpos, sem erro de tipo
- `npm run test` -- expected: testes de `tasksStorage`, `TaskContext`, `PersistenceNotice` e `App` passam, cobrindo as 4 ACs e as 3 linhas da matriz I/O

## Suggested Review Order

**Storage adapter (fundação de persistência)**

- Único ponto que toca `localStorage`; nunca lança, cai em estado vazio + `loadError` em qualquer falha.
  [`tasksStorage.ts:59`](../../src/storage/tasksStorage.ts#L59)

- Validação por item de Tarefa — um array só com envelope válido não bastava; item malformado também conta como corrompido.
  [`tasksStorage.ts:34`](../../src/storage/tasksStorage.ts#L34)

- Escrita síncrona, nunca lança; formato `{ok}` único para quem chamar (ainda sem chamador nesta história).
  [`tasksStorage.ts:86`](../../src/storage/tasksStorage.ts#L86)

**Estado e composição**

- Init lazy do `useReducer` lê `localStorage` uma vez, síncrono, antes da primeira renderização.
  [`TaskContext.tsx:15`](../../src/state/TaskContext.tsx#L15)

- Reducer passthrough — nenhum action type de mutação ainda; Epic 2 estende.
  [`tasksReducer.ts:19`](../../src/state/tasksReducer.ts#L19)

- `TaskProvider` envolve a árvore real; `AppShell` existe só para chamar o hook dentro do Provider.
  [`App.tsx:20`](../../src/App.tsx#L20)

**Avisos de interface**

- Dois avisos distintos: estático permanente (AD-3) e condicional de erro de carga (uma vez).
  [`PersistenceNotice.tsx:12`](../../src/components/PersistenceNotice/PersistenceNotice.tsx#L12)

- Cor do aviso de erro corrigida para não tomar emprestada a semântica de prioridade/perigo do `DESIGN.md`.
  [`PersistenceNotice.module.css:18`](../../src/components/PersistenceNotice/PersistenceNotice.module.css#L18)

**Peripheral: testes e verificação de camada**

- Fecha o gap de verificação: nenhum arquivo fora de `storage/` pode conter a string `localStorage`, rodando na própria suíte.
  [`architecture.test.ts:18`](../../src/architecture.test.ts#L18)

- Cobre as 3 linhas da matriz I/O, incluindo o item malformado dentro de um array por outro lado válido.
  [`tasksStorage.test.ts:1`](../../src/storage/tasksStorage.test.ts#L1)

- Tipos novos (`Task`/`TaskState`/`Priority`) usados só pelo envelope de persistência nesta história.
  [`types/index.ts:4`](../../src/types/index.ts#L4)

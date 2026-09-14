import type { Task } from '../types';

// Estado consumido pelo `TaskContext` — envelope de `loadTasks` (tarefas +
// sinalização de erro de carregamento). Nomeado `TaskStoreState` (em vez de
// `TasksState`) para não ficar visualmente colado a `TaskState`
// (`src/types/index.ts`, o estado de progresso de uma Tarefa individual:
// `'pending'|'in_progress'|'done'`) — são conceitos completamente
// diferentes.
export interface TaskStoreState {
  tasks: Task[];
  loadError: boolean;
}

// Primeira action real (Epic 2, Story 2.1) — substitui o passthrough da
// Story 1.2. `useTaskActions.createTask` é a única chamadora: ela já
// persistiu a tarefa com sucesso (guard AD-4) antes de despachar `create`
// aqui, então este reducer nunca decide sozinho `id`/`order`/`state` iniciais
// nem tenta persistir nada — só aplica a mutação já validada ao estado em
// memória.
//
// `update` (Story 2.2): `useTaskActions.updateTask` já calculou o array
// inteiro (título/Estado aplicados + `reorderWithinGroup` se Dia/Prioridade
// mudou) e já confirmou a persistência antes de despachar — este reducer só
// substitui o array por inteiro, sem decidir nada sozinho, mesmo padrão de
// `create`.
export type TaskAction = { type: 'create'; task: Task } | { type: 'update'; tasks: Task[] };

export function tasksReducer(state: TaskStoreState, action: TaskAction): TaskStoreState {
  switch (action.type) {
    case 'create':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'update':
      return { ...state, tasks: action.tasks };
    default:
      return state;
  }
}

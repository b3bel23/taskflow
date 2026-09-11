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

// Passthrough (AD-5, fundação para o Epic 2): nenhuma ação de mutação existe
// ainda — criar/editar/excluir Tarefa é escopo do Epic 2, que introduz os
// action types reais e passa a tratá-los aqui. Por ora o reducer só permite
// que `TaskContext` use `useReducer` desde já, sem nenhuma mutação de
// estado.
export function tasksReducer(state: TaskStoreState, _action: unknown): TaskStoreState {
  return state;
}

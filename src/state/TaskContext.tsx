import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { loadTasks, subscribeToTasksStorage } from '../storage/tasksStorage';
import { tasksReducer, type TaskAction, type TaskStoreState } from './tasksReducer';

export interface TaskContextValue {
  state: TaskStoreState;
  dispatch: Dispatch<TaskAction>;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

// Init lazy síncrono: `loadTasks()` só roda uma vez, antes da primeira
// renderização, sem `useEffect` e sem estado de loading visível (AD-2,
// Carregamento inicial da ARCHITECTURE-SPINE.md).
export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tasksReducer, undefined, () => loadTasks());

  // Outra aba gravou tarefas (evento `storage`): adota o que ela salvou em vez
  // de seguir com dados velhos e, ao gravar, sobrescrevê-los (retro Epic 1,
  // item 23). O `dispatch` aqui vive na própria camada de estado, não num
  // componente de UI — e não há o que persistir (o dado já está no storage).
  useEffect(() => subscribeToTasksStorage((tasks) => dispatch({ type: 'sync', tasks })), []);

  return <TaskContext.Provider value={{ state, dispatch }}>{children}</TaskContext.Provider>;
}

export function useTaskContext(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext deve ser usado dentro de um TaskProvider');
  }
  return context;
}

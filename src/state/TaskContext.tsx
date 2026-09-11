import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import { loadTasks } from '../storage/tasksStorage';
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

  return <TaskContext.Provider value={{ state, dispatch }}>{children}</TaskContext.Provider>;
}

export function useTaskContext(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext deve ser usado dentro de um TaskProvider');
  }
  return context;
}

import { useCallback } from 'react';
import { saveTasks } from '../storage/tasksStorage';
import { getNextOrderInGroup } from './selectors';
import { useTaskContext } from './TaskContext';
import type { DayOfWeek, Priority, Task } from '../types';

export type TaskActionResult = { ok: true; task: Task } | { ok: false; error: { message: string } };

export interface CreateTaskInput {
  title: string;
  day: DayOfWeek;
  priority: Priority | null;
}

export interface TaskActions {
  createTask: (input: CreateTaskInput) => TaskActionResult;
}

// Guard de persistência atômica (AD-4, mesmo padrão de `useThemeActions`):
// monta a tarefa (Estado inicial sempre `'pending'`, `order` = último do
// grupo `(day, priority)` via `getNextOrderInGroup`, AD-7), tenta salvar
// *todas* as tarefas (síncrono) e só despacha `create` ao `tasksReducer` se
// `saveTasks` confirmar `{ ok: true }`. Em falha, o estado em memória não
// muda e a função retorna `{ ok: false, error }` — nunca lança, e quem chama
// (`TaskModal`) nunca precisa de `try/catch`. Única chamadora do reducer
// nesta história — nenhum componente despacha `create` diretamente.
export function useTaskActions(): TaskActions {
  const { state, dispatch } = useTaskContext();

  const createTask = useCallback(
    ({ title, day, priority }: CreateTaskInput): TaskActionResult => {
      const task: Task = {
        id: crypto.randomUUID(),
        title,
        day,
        state: 'pending',
        priority,
        order: getNextOrderInGroup(state.tasks, day, priority),
      };

      const result = saveTasks([...state.tasks, task]);
      if (!result.ok) {
        return result;
      }

      dispatch({ type: 'create', task });
      return { ok: true, task };
    },
    [state.tasks, dispatch],
  );

  return { createTask };
}

import { useCallback } from 'react';
import { saveTasks } from '../storage/tasksStorage';
import { closeOrderGap, getNextOrderInGroup, reorderWithinGroup } from './selectors';
import { useTaskContext } from './TaskContext';
import type { DayOfWeek, Priority, Task, TaskState } from '../types';

export type TaskActionResult = { ok: true; task: Task } | { ok: false; error: { message: string } };

// `deleteTask` não devolve uma tarefa (ela deixou de existir) — resultado
// próprio em vez de reaproveitar `TaskActionResult`, cujo `ok:true` exige
// `task`.
export type DeleteTaskResult = { ok: true } | { ok: false; error: { message: string } };

export interface CreateTaskInput {
  title: string;
  day: DayOfWeek;
  priority: Priority | null;
}

export interface UpdateTaskInput {
  id: string;
  title: string;
  day: DayOfWeek;
  priority: Priority | null;
  state: TaskState;
}

export interface TaskActions {
  createTask: (input: CreateTaskInput) => TaskActionResult;
  updateTask: (input: UpdateTaskInput) => TaskActionResult;
  deleteTask: (id: string) => DeleteTaskResult;
  cycleState: (id: string) => TaskActionResult;
}

// Ciclo fixo do Indicador de Estado (Story 3.1, FR-4): Pendente→Em
// andamento→Concluída→Pendente (wraparound), sem restrição de transição.
const STATE_CYCLE: Record<TaskState, TaskState> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
};

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

  // Guard de persistência atômica (AD-4), mesmo padrão de `createTask`:
  // aplica título/Estado direto na tarefa alvo, depois `reorderWithinGroup`
  // (AD-7) decide se Dia/Prioridade mudou — se não mudou, é no-op (o array
  // com título/Estado já atualizados volta como está); se mudou, reindexa o
  // grupo antigo e reposiciona a tarefa no fim do grupo novo. Tenta salvar o
  // array resultante *antes* de despachar `update`; falha não muda o estado
  // em memória (tarefa mantém valores antigos até sucesso) e retorna
  // `{ ok: false, error }` — nunca lança. Única chamadora do reducer para
  // `update`, igual a `createTask` para `create`.
  const updateTask = useCallback(
    ({ id, title, day, priority, state: nextState }: UpdateTaskInput): TaskActionResult => {
      const exists = state.tasks.some((t) => t.id === id);
      if (!exists) {
        return { ok: false, error: { message: 'Tarefa não encontrada.' } };
      }

      const withEdits = state.tasks.map((t) => (t.id === id ? { ...t, title, state: nextState } : t));
      const reordered = reorderWithinGroup(withEdits, id, day, priority);

      const result = saveTasks(reordered);
      if (!result.ok) {
        return result;
      }

      dispatch({ type: 'update', tasks: reordered });
      const task = reordered.find((t) => t.id === id) as Task;
      return { ok: true, task };
    },
    [state.tasks, dispatch],
  );

  // Guard de persistência atômica (AD-4), mesmo padrão de `createTask`/
  // `updateTask`: filtra a tarefa alvo do array, reindexa sequencialmente o
  // grupo `(day, priority)` de onde ela saiu via `closeOrderGap` (fecha o
  // risco latente de `deferred-work.md` — sem isto, um buraco no `order`
  // poderia colidir com uma tarefa nova), tenta salvar o array resultante
  // *antes* de despachar `delete`. Falha não muda o estado em memória (a
  // tarefa não some até sucesso) e retorna `{ ok: false, error }` — nunca
  // lança. Única chamadora do reducer para `delete`, igual a `createTask`/
  // `updateTask`. Exclusão é definitiva (sem desfazer/lixeira no MVP).
  const deleteTask = useCallback(
    (id: string): DeleteTaskResult => {
      const target = state.tasks.find((t) => t.id === id);
      if (!target) {
        return { ok: false, error: { message: 'Tarefa não encontrada.' } };
      }

      const withoutTask = state.tasks.filter((t) => t.id !== id);
      const reordered = closeOrderGap(withoutTask, target.day, target.priority);

      const result = saveTasks(reordered);
      if (!result.ok) {
        return result;
      }

      dispatch({ type: 'delete', tasks: reordered });
      return { ok: true };
    },
    [state.tasks, dispatch],
  );

  // Guard de persistência atômica (AD-4), mesmo padrão de `createTask`/
  // `updateTask`/`deleteTask`: aplica só o próximo Estado do ciclo fixo
  // (`STATE_CYCLE`) à tarefa alvo — sem tocar Título/Dia/Prioridade/`order`,
  // sem passar por `reorderWithinGroup` (ciclar Estado nunca move a tarefa de
  // grupo). Tenta salvar o array resultante *antes* de despachar `update`
  // (mesma action da 2.2, nenhuma nova no reducer); falha não muda o estado
  // em memória (Estado exibido mantém o valor antigo até sucesso) e retorna
  // `{ ok: false, error }` — nunca lança, sem nova tentativa automática.
  const cycleState = useCallback(
    (id: string): TaskActionResult => {
      const target = state.tasks.find((t) => t.id === id);
      if (!target) {
        return { ok: false, error: { message: 'Tarefa não encontrada.' } };
      }

      const updated = state.tasks.map((t) => (t.id === id ? { ...t, state: STATE_CYCLE[t.state] } : t));

      const result = saveTasks(updated);
      if (!result.ok) {
        return result;
      }

      dispatch({ type: 'update', tasks: updated });
      return { ok: true, task: updated.find((t) => t.id === id) as Task };
    },
    [state.tasks, dispatch],
  );

  return { createTask, updateTask, deleteTask, cycleState };
}

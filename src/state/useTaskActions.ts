import { useCallback } from 'react';
import { saveTasks } from '../storage/tasksStorage';
import { applyRollover as applyRolloverPure } from './applyRollover';
import { closeOrderGap, getNextOrderInGroup, reassignDate } from './selectors';
import { useTaskContext } from './TaskContext';
import { unregisterDragHandle } from '../components/WeekView/dragHandleRegistry';
import type { Priority, Task, TaskState } from '../types';

export type TaskActionResult = { ok: true; task: Task } | { ok: false; error: { message: string } };

// `deleteTask`/`applyRollover` não devolvem uma tarefa específica (a
// primeira deixou de existir; o segundo pode afetar zero, uma ou várias) —
// resultados próprios em vez de reaproveitar `TaskActionResult`, cujo
// `ok:true` exige `task`.
export type DeleteTaskResult = { ok: true } | { ok: false; error: { message: string } };
export type ApplyRolloverResult = { ok: true } | { ok: false; error: { message: string } };

export interface CreateTaskInput {
  title: string;
  date: string;
  time: string | null;
  priority: Priority | null;
}

export interface UpdateTaskInput {
  id: string;
  title: string;
  date: string;
  time: string | null;
  priority: Priority | null;
  state: TaskState;
}

export interface TaskActions {
  createTask: (input: CreateTaskInput) => TaskActionResult;
  updateTask: (input: UpdateTaskInput) => TaskActionResult;
  deleteTask: (id: string) => DeleteTaskResult;
  cycleState: (id: string) => TaskActionResult;
  cyclePriority: (id: string) => TaskActionResult;
  moveTaskToDate: (id: string, date: string) => TaskActionResult;
  applyRollover: (todayISO: string) => ApplyRolloverResult;
}

// Ciclo fixo do Indicador de Estado (Story 3.1, FR-4): Pendente→Em
// andamento→Concluída→Pendente (wraparound), sem restrição de transição.
const STATE_CYCLE: Record<TaskState, TaskState> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
};

// Ciclo fixo da Tag de Prioridade (Story 7.2, FR-8): Sem prioridade→Baixa→
// Média→Alta→Sem prioridade (wraparound), sem restrição — mesmo padrão de
// `STATE_CYCLE`. `null` (índice 0) é "Sem prioridade".
const PRIORITY_CYCLE_ORDER: (Priority | null)[] = [null, 'low', 'medium', 'high'];

function nextPriority(priority: Priority | null): Priority | null {
  const index = PRIORITY_CYCLE_ORDER.indexOf(priority);
  return PRIORITY_CYCLE_ORDER[(index + 1) % PRIORITY_CYCLE_ORDER.length];
}

// Guard de persistência atômica (AD-4, mesmo padrão de `useThemeActions`):
// monta a tarefa (Estado inicial sempre `'pending'`, `order` = último da
// Data via `getNextOrderInGroup`, AD-7 revisado), tenta salvar *todas* as
// tarefas (síncrono) e só despacha `create` ao `tasksReducer` se `saveTasks`
// confirmar `{ ok: true }`. Em falha, o estado em memória não muda e a
// função retorna `{ ok: false, error }` — nunca lança, e quem chama
// (`TaskModal`) nunca precisa de `try/catch`.
export function useTaskActions(): TaskActions {
  const { state, dispatch } = useTaskContext();

  const createTask = useCallback(
    ({ title, date, time, priority }: CreateTaskInput): TaskActionResult => {
      const task: Task = {
        id: crypto.randomUUID(),
        title,
        date,
        time,
        state: 'pending',
        priority,
        order: getNextOrderInGroup(state.tasks, date),
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
  // aplica título/Horário/Prioridade/Estado direto na tarefa alvo, depois
  // `reassignDate` (AD-7 revisado) decide se a Data mudou — se não mudou, é
  // no-op (o array já com os outros campos atualizados volta como está); se
  // mudou, reindexa a Data antiga e reposiciona a tarefa no fim da Data
  // nova. Tenta salvar o array resultante *antes* de despachar `update`;
  // falha não muda o estado em memória e retorna `{ ok: false, error }`.
  const updateTask = useCallback(
    ({ id, title, date, time, priority, state: nextState }: UpdateTaskInput): TaskActionResult => {
      const exists = state.tasks.some((t) => t.id === id);
      if (!exists) {
        return { ok: false, error: { message: 'Tarefa não encontrada.' } };
      }

      const withEdits = state.tasks.map((t) =>
        t.id === id ? { ...t, title, time, priority, state: nextState } : t,
      );
      const reassigned = reassignDate(withEdits, id, date);

      const result = saveTasks(reassigned);
      if (!result.ok) {
        return result;
      }

      dispatch({ type: 'update', tasks: reassigned });
      const task = reassigned.find((t) => t.id === id) as Task;
      return { ok: true, task };
    },
    [state.tasks, dispatch],
  );

  // Guard de persistência atômica (AD-4), mesmo padrão de `createTask`/
  // `updateTask`: filtra a tarefa alvo do array, reindexa sequencialmente a
  // Data de onde ela saiu via `closeOrderGap`, tenta salvar o array
  // resultante *antes* de despachar `delete`. Exclusão é definitiva (sem
  // desfazer/lixeira no MVP).
  const deleteTask = useCallback(
    (id: string): DeleteTaskResult => {
      const target = state.tasks.find((t) => t.id === id);
      if (!target) {
        return { ok: false, error: { message: 'Tarefa não encontrada.' } };
      }

      const withoutTask = state.tasks.filter((t) => t.id !== id);
      const reordered = closeOrderGap(withoutTask, target.date);

      const result = saveTasks(reordered);
      if (!result.ok) {
        return result;
      }

      dispatch({ type: 'delete', tasks: reordered });
      unregisterDragHandle(id);
      return { ok: true };
    },
    [state.tasks, dispatch],
  );

  // Guard de persistência atômica (AD-4), mesmo padrão de `createTask`/
  // `updateTask`/`deleteTask`: aplica só o próximo Estado do ciclo fixo
  // (`STATE_CYCLE`) à tarefa alvo — sem tocar Título/Data/Horário/
  // Prioridade/`order`.
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

  // Guard de persistência atômica (AD-4), mesmo padrão de `cycleState`
  // (Story 7.2, FR-8): aplica só o próximo nível do ciclo fixo de
  // Prioridade (`PRIORITY_CYCLE_ORDER`) à tarefa alvo — sem tocar Título/
  // Data/Horário/Estado/`order`. Prioridade é puro atributo visual (AD-7
  // obsoleto): mudar não reposiciona a tarefa em lugar nenhum.
  const cyclePriority = useCallback(
    (id: string): TaskActionResult => {
      const target = state.tasks.find((t) => t.id === id);
      if (!target) {
        return { ok: false, error: { message: 'Tarefa não encontrada.' } };
      }

      const updated = state.tasks.map((t) =>
        t.id === id ? { ...t, priority: nextPriority(t.priority) } : t,
      );

      const result = saveTasks(updated);
      if (!result.ok) {
        return result;
      }

      dispatch({ type: 'update', tasks: updated });
      return { ok: true, task: updated.find((t) => t.id === id) as Task };
    },
    [state.tasks, dispatch],
  );

  // Guard de persistência atômica (AD-4), mesmo padrão das demais: única
  // ação que o arraste (Story 4.2 revisada) chama — muda SÓ a Data
  // (`reassignDate`, AD-7 revisado), nunca Título/Horário/Prioridade/Estado.
  // A via alternativa completa a essa mudança é `updateTask` (Modal), que
  // internamente passa pela mesma `reassignDate` quando a Data muda junto
  // com outros campos — nenhuma lógica de "mover de Data" duplicada entre
  // os dois caminhos.
  const moveTaskToDate = useCallback(
    (id: string, date: string): TaskActionResult => {
      const target = state.tasks.find((t) => t.id === id);
      if (!target) {
        return { ok: false, error: { message: 'Tarefa não encontrada.' } };
      }

      const reassigned = reassignDate(state.tasks, id, date);

      const result = saveTasks(reassigned);
      if (!result.ok) {
        return result;
      }

      dispatch({ type: 'update', tasks: reassigned });
      return { ok: true, task: reassigned.find((t) => t.id === id) as Task };
    },
    [state.tasks, dispatch],
  );

  // Guard de persistência atômica (AD-4/AD-11, Story 5.4): `applyRolloverPure`
  // é pura e retorna a MESMA referência de `state.tasks` quando nada precisa
  // rolar — nesse caso nem tenta salvar (evita escrever a cada tick do timer
  // de 60s à toa). Quando algo muda, salva o array inteiro em UMA ÚNICA
  // escrita em lote (nunca uma por tarefa afetada) antes de despachar
  // `update`; falha não muda o estado em memória (nenhuma tarefa exibida
  // muda de Data até a escrita ter sucesso).
  const applyRollover = useCallback(
    (todayISO: string): ApplyRolloverResult => {
      const rolled = applyRolloverPure(state.tasks, todayISO);
      if (rolled === state.tasks) {
        return { ok: true };
      }

      const result = saveTasks(rolled);
      if (!result.ok) {
        return result;
      }

      dispatch({ type: 'update', tasks: rolled });
      return { ok: true };
    },
    [state.tasks, dispatch],
  );

  return { createTask, updateTask, deleteTask, cycleState, cyclePriority, moveTaskToDate, applyRollover };
}

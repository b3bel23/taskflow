import { DAYS_OF_WEEK } from '../constants/days';
import type { DayOfWeek, Priority, Task, TaskState } from '../types';

// Única chave de `localStorage` para tarefas (AD-2). `taskflow:theme`
// (Story 1.3) é um domínio de persistência independente, nunca misturado
// com este. Exportada para os testes reutilizarem em vez de redigitar a
// string crua.
export const TASKS_STORAGE_KEY = 'taskflow:tasks';

// Existe para permitir migração futura do formato salvo. Nenhuma migração
// está desenhada nesta história — um `schemaVersion` não reconhecido é
// tratado como dado ilegível (mesmo caminho de `loadError`).
const CURRENT_SCHEMA_VERSION = 1;

interface TasksEnvelope {
  schemaVersion: number;
  tasks: Task[];
}

export interface LoadTasksResult {
  tasks: Task[];
  loadError: boolean;
}

export type SaveTasksResult = { ok: true } | { ok: false; error: { message: string } };

const VALID_TASK_STATES: TaskState[] = ['pending', 'in_progress', 'done'];
const VALID_PRIORITIES: Priority[] = ['high', 'medium', 'low'];

// Valida a forma de uma Tarefa individual — o envelope (`schemaVersion` +
// `Array.isArray(tasks)`) sozinho deixaria passar um array de itens
// malformados como "válido". Um item que falhe aqui é tratado como o mesmo
// dado corrompido do resto de `loadTasks` (mesmo caminho de `loadError`).
function isValidTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    DAYS_OF_WEEK.includes(candidate.day as DayOfWeek) &&
    VALID_TASK_STATES.includes(candidate.state as TaskState) &&
    (candidate.priority === null || VALID_PRIORITIES.includes(candidate.priority as Priority)) &&
    typeof candidate.order === 'number' &&
    Number.isFinite(candidate.order)
  );
}

// Único módulo do app que toca `window.localStorage` para tarefas (AD-8).
// Nunca lança: chave ausente é a primeira instalação (estado vazio, sem
// erro); qualquer outra falha (leitura que lança, parse inválido, schema
// não reconhecido, `tasks` que não é array, ou qualquer item do array com
// forma inválida) cai no mesmo estado vazio, mas sinaliza `loadError` para
// a UI mostrar o aviso uma vez.
export function loadTasks(): LoadTasksResult {
  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw === null) {
      return { tasks: [], loadError: false };
    }

    const parsed = JSON.parse(raw) as Partial<TasksEnvelope> | null;
    if (
      parsed?.schemaVersion !== CURRENT_SCHEMA_VERSION ||
      !Array.isArray(parsed.tasks) ||
      !parsed.tasks.every(isValidTask)
    ) {
      return { tasks: [], loadError: true };
    }

    return { tasks: parsed.tasks, loadError: false };
  } catch {
    return { tasks: [], loadError: true };
  }
}

// Escrita síncrona, nunca lança (AD-4): quem chama trata o resultado por
// `{ ok }`, nunca por `try/catch` ao redor da chamada. Nenhum estado React é
// commitado sem que isto retorne `{ ok: true }` primeiro — base do guard de
// persistência atômica que Epic 2 vai usar via `useTaskActions` (sem
// chamador ainda nesta história).
export function saveTasks(tasks: Task[]): SaveTasksResult {
  try {
    const envelope: TasksEnvelope = { schemaVersion: CURRENT_SCHEMA_VERSION, tasks };
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(envelope));
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar as tarefas.';
    return { ok: false, error: { message } };
  }
}

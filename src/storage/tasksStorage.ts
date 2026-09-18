import { getWeekWindow, getWeekdayIndex, parseISODateLocal, toISODate } from '../constants/week';
import type { DayOfWeek, Priority, Task, TaskState } from '../types';

// Única chave de `localStorage` para tarefas (AD-2). `taskflow:theme`
// (Story 1.3) é um domínio de persistência independente, nunca misturado
// com este. Exportada para os testes reutilizarem em vez de redigitar a
// string crua.
export const TASKS_STORAGE_KEY = 'taskflow:tasks';

// Story 5.1: `schemaVersion` sobe de 1 para 2 — `Task.day` (`DayOfWeek`)
// virou `Task.date` (ISO real) + `Task.time`. `schemaVersion === 1` migra via
// `migrateFromV1` (abaixo); qualquer outro valor ≠ 1 e ≠ 2 continua no
// caminho de `loadError` já existente (dado ilegível).
const CURRENT_SCHEMA_VERSION = 2;

interface TasksEnvelope {
  schemaVersion: number;
  tasks: Task[];
}

// Formato de uma Tarefa salva em `schemaVersion: 1` (antes da Story 5.1) —
// só usado internamente por `isValidTaskV1`/`migrateFromV1`, nunca exposto
// fora deste módulo.
interface TaskV1 {
  id: string;
  title: string;
  day: DayOfWeek;
  state: TaskState;
  priority: Priority | null;
  order: number;
}

export interface LoadTasksResult {
  tasks: Task[];
  loadError: boolean;
}

export type SaveTasksResult = { ok: true } | { ok: false; error: { message: string } };

const VALID_TASK_STATES: TaskState[] = ['pending', 'in_progress', 'done'];
const VALID_PRIORITIES: Priority[] = ['high', 'medium', 'low'];
const VALID_DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// `ISO_DATE_PATTERN` sozinho aceita strings lexicamente válidas mas
// calendarialmente inexistentes (ex. `'2026-13-40'`, `'2026-02-30'`) — o
// `Date` nativo normaliza esse overflow silenciosamente (rola pro mês/dia
// seguinte) em vez de lançar. Reaproveita `parseISODateLocal`/`toISODate`
// (`constants/week.ts`, mesma via de conversão usada no resto do app) para
// checar que a data faz um round-trip idêntico — se não fizer, o dia/mês
// não existe de verdade.
function isCalendarValidISODate(dateISO: string): boolean {
  return toISODate(parseISODateLocal(dateISO)) === dateISO;
}

// `Date#getDay()` é 0-indexado a partir de domingo (0=domingo..6=sábado).
// Mapeia cada `DayOfWeek` salvo em v1 para esse mesmo índice, usado por
// `migrateFromV1` para achar a data real (dentro da janela `getWeekWindow()`)
// cujo dia-da-semana corresponde.
const DAY_OF_WEEK_TO_JS_DAY: Record<DayOfWeek, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

// Valida a forma de uma Tarefa individual no formato ATUAL (`schemaVersion:
// 2`) — o envelope (`schemaVersion` + `Array.isArray(tasks)`) sozinho
// deixaria passar um array de itens malformados como "válido". Um item que
// falhe aqui é tratado como o mesmo dado corrompido do resto de `loadTasks`
// (mesmo caminho de `loadError`).
function isValidTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    typeof candidate.date === 'string' &&
    ISO_DATE_PATTERN.test(candidate.date) &&
    isCalendarValidISODate(candidate.date) &&
    (candidate.time === null || typeof candidate.time === 'string') &&
    VALID_TASK_STATES.includes(candidate.state as TaskState) &&
    (candidate.priority === null || VALID_PRIORITIES.includes(candidate.priority as Priority)) &&
    typeof candidate.order === 'number' &&
    Number.isFinite(candidate.order)
  );
}

// Mesma validação de forma que `isValidTask`, mas para o formato ANTIGO
// (`schemaVersion: 1`, `day: DayOfWeek` em vez de `date`/`time`) — só usada
// pelo caminho de migração em `loadTasks`. Um item malformado aqui também
// cai no mesmo caminho de `loadError` (nunca migra parcialmente).
function isValidTaskV1(value: unknown): value is TaskV1 {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    VALID_DAYS_OF_WEEK.includes(candidate.day as DayOfWeek) &&
    VALID_TASK_STATES.includes(candidate.state as TaskState) &&
    (candidate.priority === null || VALID_PRIORITIES.includes(candidate.priority as Priority)) &&
    typeof candidate.order === 'number' &&
    Number.isFinite(candidate.order)
  );
}

// Acha, dentro de `window` (7 datas ISO consecutivas de `getWeekWindow()`), a
// data cujo dia-da-semana corresponde a `day`. `window` sempre cobre os 7
// dias-da-semana exatamente uma vez (7 dias consecutivos), então sempre há
// exatamente uma correspondência — o fallback pro primeiro item da janela
// nunca deveria disparar na prática, só uma rede de segurança contra
// `undefined` caso `window` algum dia deixe de ser 7 dias consecutivos.
function mapDayOfWeekToDate(day: DayOfWeek, window: string[]): string {
  const targetJsDay = DAY_OF_WEEK_TO_JS_DAY[day];
  return window.find((dateISO) => getWeekdayIndex(dateISO) === targetJsDay) ?? window[0];
}

// Migra tarefas de `schemaVersion: 1` para o formato atual (Story 5.1):
// mapeia cada `day` salvo para a data real correspondente dentro da PRIMEIRA
// janela `hoje..hoje+6` calculada no momento da migração (mesma janela para
// todas as tarefas desta chamada — nunca uma janela por tarefa), `time`
// sempre `null` (Epic 6 ainda não existe). Depois renumera `order`
// sequencialmente (0..n-1) dentro de cada grupo `(date, priority)` — mesma
// invariante que `closeOrderGap`/`reorderGroupByIndex`/`getNextOrderInGroup`
// (`selectors.ts`, AD-7) já mantêm em toda mutação normal do app — como rede
// de segurança defensiva contra qualquer buraco que os dados salvos em v1
// pudessem ter, já que o mapeamento `day`->`date` sozinho é uma bijeção que
// preserva os grupos originais.
function migrateFromV1(tasksV1: TaskV1[]): Task[] {
  const window = getWeekWindow();

  const migrated: Task[] = tasksV1.map((task) => ({
    id: task.id,
    title: task.title,
    date: mapDayOfWeekToDate(task.day, window),
    time: null,
    state: task.state,
    priority: task.priority,
    order: task.order,
  }));

  const groups = new Map<string, Task[]>();
  for (const task of migrated) {
    const groupKey = `${task.date}::${task.priority ?? 'none'}`;
    const group = groups.get(groupKey);
    if (group) {
      group.push(task);
    } else {
      groups.set(groupKey, [task]);
    }
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.order - b.order);
    group.forEach((task, index) => {
      task.order = index;
    });
  }

  return migrated;
}

// Único módulo do app que toca `window.localStorage` para tarefas (AD-8).
// Nunca lança: chave ausente é a primeira instalação (estado vazio, sem
// erro); qualquer outra falha (leitura que lança, parse inválido, schema
// não reconhecido, `tasks` que não é array, ou qualquer item do array com
// forma inválida) cai no mesmo estado vazio, mas sinaliza `loadError` para
// a UI mostrar o aviso uma vez.
//
// Story 5.1: `schemaVersion === 1` é o único valor que migra — via
// `migrateFromV1`, seguido de regravação imediata como `schemaVersion: 2`
// (`saveTasks`). Se essa regravação falhar, `loadTasks` ainda retorna as
// tarefas migradas para uso nesta sessão (`loadError: false`); a
// persistência é re-tentada na próxima mutação normal do app (nenhum retry
// automático aqui). Qualquer outro `schemaVersion` ≠ 1 e ≠
// `CURRENT_SCHEMA_VERSION` continua no caminho de dado ilegível já existente.
export function loadTasks(): LoadTasksResult {
  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw === null) {
      return { tasks: [], loadError: false };
    }

    const parsed = JSON.parse(raw) as Partial<TasksEnvelope> | null;

    if (parsed?.schemaVersion === 1) {
      if (!Array.isArray(parsed.tasks) || !parsed.tasks.every(isValidTaskV1)) {
        return { tasks: [], loadError: true };
      }

      const migrated = migrateFromV1(parsed.tasks as unknown as TaskV1[]);
      // Resultado de `saveTasks` deliberadamente ignorado aqui: falha não
      // muda o que esta chamada retorna (Boundaries "Always" da spec 5.1).
      saveTasks(migrated);
      return { tasks: migrated, loadError: false };
    }

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

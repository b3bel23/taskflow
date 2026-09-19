import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWeekWindow, getWeekdayIndex } from '../constants/week';
import type { Task } from '../types';
import { loadTasks, saveTasks, TASKS_STORAGE_KEY, type LoadTasksResult } from './tasksStorage';

const sampleTask: Task = {
  id: 'task-1',
  title: 'Escrever spec',
  date: '2026-09-21',
  time: null,
  state: 'pending',
  priority: 'high',
  order: 0,
};

// `day: 'mon'` (formato v1) na data real correspondente dentro da janela
// `hoje..hoje+6`, para os testes de migração abaixo — mesmo mapeamento que
// `migrateFromV1` calcula internamente.
const DAY_OF_WEEK_TO_JS_DAY: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function expectedDateForDayOfWeek(day: string): string {
  const window = getWeekWindow();
  const targetJsDay = DAY_OF_WEEK_TO_JS_DAY[day];
  return window.find((dateISO) => getWeekdayIndex(dateISO) === targetJsDay) as string;
}

describe('tasksStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadTasks', () => {
    it('primeira instalação: chave ausente cai no estado vazio, sem erro', () => {
      expect(loadTasks()).toEqual({ tasks: [], loadError: false });
    });

    it('lê tarefas salvas com schemaVersion reconhecido (2)', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({ schemaVersion: 2, tasks: [sampleTask] }),
      );

      expect(loadTasks()).toEqual({ tasks: [sampleTask], loadError: false });
    });

    it('dado corrompido: JSON.parse falha cai no estado vazio com loadError', () => {
      window.localStorage.setItem(TASKS_STORAGE_KEY, '{not valid json');

      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    it('dado corrompido: schemaVersion não reconhecido (nem 1 nem 2) cai no estado vazio com loadError', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({ schemaVersion: 999, tasks: [sampleTask] }),
      );

      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    it('schemaVersion ausente/corrompido: mesmo caminho de loadError já existente', () => {
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ tasks: [sampleTask] }));

      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    it('dado corrompido: `tasks` não é array cai no estado vazio com loadError', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({ schemaVersion: 2, tasks: 'não é um array' }),
      );

      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    it('dado corrompido: um item malformado dentro de um array `tasks` por outro lado válido cai no estado vazio com loadError', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 2,
          tasks: [sampleTask, { ...sampleTask, id: 'task-2', order: 'not-a-number' }],
        }),
      );

      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    it('dado corrompido: `date` calendarialmente inexistente (ex. "2026-02-30") é rejeitada mesmo batendo o padrão ISO lexical', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 2,
          tasks: [{ ...sampleTask, date: '2026-02-30' }],
        }),
      );

      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    it('`date` com ano abaixo de 100 (ex. "0099-01-01") é uma data real: carrega normalmente, sem descartar o array', () => {
      const tasks = [{ ...sampleTask, date: '0099-01-01' }];
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, tasks }));

      expect(loadTasks()).toEqual({ tasks, loadError: false });
    });

    it.each(['09:30', '00:00', '23:59'])('`time` válido "%s" carrega normalmente', (time) => {
      const tasks = [{ ...sampleTask, time }];
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, tasks }));

      expect(loadTasks()).toEqual({ tasks, loadError: false });
    });

    it.each(['', 'abc', '9:30', '24:00', '12:60', '09:30:15'])(
      'dado corrompido: `time` malformado "%s" cai no estado vazio com loadError',
      (time) => {
        window.localStorage.setItem(
          TASKS_STORAGE_KEY,
          JSON.stringify({ schemaVersion: 2, tasks: [{ ...sampleTask, time }] }),
        );

        expect(loadTasks()).toEqual({ tasks: [], loadError: true });
      },
    );

    it('dado corrompido: ids duplicados entre itens de um array por outro lado válido caem em loadError', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({ schemaVersion: 2, tasks: [sampleTask, { ...sampleTask, title: 'Outra', order: 1 }] }),
      );

      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    it('dado corrompido: getItem lança cai no estado vazio com loadError, sem propagar', () => {
      // jsdom expõe `getItem`/`setItem` via `Storage.prototype`, não como
      // propriedade própria da instância — `vi.spyOn(window.localStorage, ...)`
      // não intercepta a chamada real; é preciso mockar o protótipo.
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => loadTasks()).not.toThrow();
      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    // Story 5.1: migração de schemaVersion 1 -> 2.
    describe('migração de schemaVersion 1 para 2', () => {
      it('migração básica: cada tarefa v1 ganha `date` dentro da janela hoje..hoje+6, `time: null`, e é regravada como schemaVersion 2', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-18T12:00:00')); // sexta-feira

        window.localStorage.setItem(
          TASKS_STORAGE_KEY,
          JSON.stringify({
            schemaVersion: 1,
            tasks: [
              { id: 't1', title: 'Tarefa de quarta', day: 'wed', state: 'pending', priority: 'high', order: 0 },
            ],
          }),
        );

        const result = loadTasks();

        expect(result.loadError).toBe(false);
        expect(result.tasks).toHaveLength(1);
        expect(result.tasks[0]).toMatchObject({
          id: 't1',
          title: 'Tarefa de quarta',
          date: expectedDateForDayOfWeek('wed'),
          time: null,
          state: 'pending',
          priority: 'high',
          order: 0,
        });

        // Regravado imediatamente como schemaVersion 2 (Boundaries "Always").
        const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
        expect(saved.schemaVersion).toBe(2);
        expect(saved.tasks).toEqual(result.tasks);

        vi.useRealTimers();
      });

      it('duas tarefas, dias diferentes, hoje = sexta 2026-09-18: "mon" migra para a próxima segunda (nunca no passado), "fri" migra para hoje', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-18T12:00:00')); // sexta-feira

        window.localStorage.setItem(
          TASKS_STORAGE_KEY,
          JSON.stringify({
            schemaVersion: 1,
            tasks: [
              { id: 'seg', title: 'Tarefa de segunda', day: 'mon', state: 'pending', priority: null, order: 0 },
              { id: 'sex', title: 'Tarefa de sexta', day: 'fri', state: 'pending', priority: null, order: 0 },
            ],
          }),
        );

        const result = loadTasks();

        const byId = new Map(result.tasks.map((t) => [t.id, t]));
        expect(byId.get('seg')?.date).toBe('2026-09-21');
        expect(byId.get('sex')?.date).toBe('2026-09-18');
        // Nenhuma data migrada fica no passado.
        for (const task of result.tasks) {
          expect(task.date >= '2026-09-18').toBe(true);
        }

        vi.useRealTimers();
      });

      it('nenhuma tarefa é perdida ou duplicada na migração', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-18T12:00:00'));

        const v1Tasks = [
          { id: 'a', title: 'A', day: 'mon', state: 'pending', priority: 'high', order: 0 },
          { id: 'b', title: 'B', day: 'tue', state: 'done', priority: null, order: 0 },
          { id: 'c', title: 'C', day: 'sun', state: 'in_progress', priority: 'low', order: 0 },
        ];
        window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, tasks: v1Tasks }));

        const result = loadTasks();

        expect(result.tasks.map((t) => t.id).sort()).toEqual(['a', 'b', 'c']);

        vi.useRealTimers();
      });

      it('já em schemaVersion 2: não roda migração nenhuma (idempotente) — lê direto', () => {
        window.localStorage.setItem(
          TASKS_STORAGE_KEY,
          JSON.stringify({ schemaVersion: 2, tasks: [sampleTask] }),
        );

        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

        const result = loadTasks();

        expect(result).toEqual({ tasks: [sampleTask], loadError: false });
        expect(setItemSpy).not.toHaveBeenCalled();
      });

      it('migração + escrita de regravação falha: ainda retorna as tarefas migradas em memória (loadError: false), nunca trava', () => {
        window.localStorage.setItem(
          TASKS_STORAGE_KEY,
          JSON.stringify({
            schemaVersion: 1,
            tasks: [{ id: 't1', title: 'Tarefa', day: 'mon', state: 'pending', priority: null, order: 0 }],
          }),
        );

        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new Error('quota exceeded');
        });

        let result: LoadTasksResult | undefined;
        expect(() => {
          result = loadTasks();
        }).not.toThrow();

        expect(result).toMatchObject({ loadError: false });
        expect(result?.tasks).toHaveLength(1);
        expect(result?.tasks[0]).toMatchObject({ id: 't1', title: 'Tarefa' });
      });

      it('item malformado em v1 (day inválido): mesmo caminho de dado ilegível, não migra parcialmente', () => {
        window.localStorage.setItem(
          TASKS_STORAGE_KEY,
          JSON.stringify({
            schemaVersion: 1,
            tasks: [
              { id: 't1', title: 'Válida', day: 'mon', state: 'pending', priority: null, order: 0 },
              { id: 't2', title: 'Inválida', day: 'not-a-day', state: 'pending', priority: null, order: 1 },
            ],
          }),
        );

        expect(loadTasks()).toEqual({ tasks: [], loadError: true });
      });

      it('item malformado em v1 (order não numérico): mesmo caminho de dado ilegível', () => {
        window.localStorage.setItem(
          TASKS_STORAGE_KEY,
          JSON.stringify({
            schemaVersion: 1,
            tasks: [{ id: 't1', title: 'Inválida', day: 'mon', state: 'pending', priority: null, order: 'zero' }],
          }),
        );

        expect(loadTasks()).toEqual({ tasks: [], loadError: true });
      });

      it('v1 com `tasks` que não é array: mesmo caminho de dado ilegível', () => {
        window.localStorage.setItem(
          TASKS_STORAGE_KEY,
          JSON.stringify({ schemaVersion: 1, tasks: 'não é um array' }),
        );

        expect(loadTasks()).toEqual({ tasks: [], loadError: true });
      });

      it('order renumerado sequencialmente por grupo (date) após a migração — escopo (date, priority) obsoleto, AD-7 revisado', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-18T12:00:00'));

        window.localStorage.setItem(
          TASKS_STORAGE_KEY,
          JSON.stringify({
            schemaVersion: 1,
            tasks: [
              { id: 'primeira', title: 'Primeira', day: 'mon', state: 'pending', priority: 'high', order: 3 },
              { id: 'segunda', title: 'Segunda', day: 'mon', state: 'pending', priority: 'high', order: 7 },
            ],
          }),
        );

        const result = loadTasks();
        const byId = new Map(result.tasks.map((t) => [t.id, t]));

        expect(byId.get('primeira')).toMatchObject({ order: 0 });
        expect(byId.get('segunda')).toMatchObject({ order: 1 });

        vi.useRealTimers();
      });

      it('renumeração agrupa só por date — duas tarefas do mesmo dia com Prioridades diferentes dividem a mesma sequência de order', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-18T12:00:00'));

        window.localStorage.setItem(
          TASKS_STORAGE_KEY,
          JSON.stringify({
            schemaVersion: 1,
            tasks: [
              { id: 'alta', title: 'Alta', day: 'mon', state: 'pending', priority: 'high', order: 5 },
              { id: 'baixa', title: 'Baixa', day: 'mon', state: 'pending', priority: 'low', order: 9 },
            ],
          }),
        );

        const result = loadTasks();
        const byId = new Map(result.tasks.map((t) => [t.id, t]));

        expect(byId.get('alta')).toMatchObject({ order: 0 });
        expect(byId.get('baixa')).toMatchObject({ order: 1 });

        vi.useRealTimers();
      });
    });
  });

  describe('saveTasks', () => {
    it('escreve o envelope {schemaVersion: 2, tasks} e retorna {ok: true}', () => {
      const result = saveTasks([sampleTask]);

      expect(result).toEqual({ ok: true });
      expect(JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '')).toEqual({
        schemaVersion: 2,
        tasks: [sampleTask],
      });
    });

    it('escrita falha: setItem lança, retorna {ok: false, error} e nunca lança', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      let result;
      expect(() => {
        result = saveTasks([sampleTask]);
      }).not.toThrow();
      expect(result).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    });
  });
});

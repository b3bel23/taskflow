import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../types';
import { loadTasks, saveTasks, TASKS_STORAGE_KEY } from './tasksStorage';

const sampleTask: Task = {
  id: 'task-1',
  title: 'Escrever spec',
  day: 'mon',
  state: 'pending',
  priority: 'high',
  order: 0,
};

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

    it('lê tarefas salvas com schemaVersion reconhecido', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({ schemaVersion: 1, tasks: [sampleTask] }),
      );

      expect(loadTasks()).toEqual({ tasks: [sampleTask], loadError: false });
    });

    it('dado corrompido: JSON.parse falha cai no estado vazio com loadError', () => {
      window.localStorage.setItem(TASKS_STORAGE_KEY, '{not valid json');

      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    it('dado corrompido: schemaVersion não reconhecido cai no estado vazio com loadError', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({ schemaVersion: 999, tasks: [sampleTask] }),
      );

      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    it('dado corrompido: `tasks` não é array cai no estado vazio com loadError', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({ schemaVersion: 1, tasks: 'não é um array' }),
      );

      expect(loadTasks()).toEqual({ tasks: [], loadError: true });
    });

    it('dado corrompido: um item malformado dentro de um array `tasks` por outro lado válido cai no estado vazio com loadError', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 1,
          tasks: [sampleTask, { ...sampleTask, id: 'task-2', order: 'not-a-number' }],
        }),
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
  });

  describe('saveTasks', () => {
    it('escreve o envelope {schemaVersion, tasks} e retorna {ok: true}', () => {
      const result = saveTasks([sampleTask]);

      expect(result).toEqual({ ok: true });
      expect(JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '')).toEqual({
        schemaVersion: 1,
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

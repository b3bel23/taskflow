import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { getNextOrderInGroup, sortTasksInDay } from './selectors';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'id',
    title: overrides.title ?? 'Tarefa',
    day: overrides.day ?? 'mon',
    state: overrides.state ?? 'pending',
    priority: overrides.priority ?? null,
    order: overrides.order ?? 0,
  };
}

describe('sortTasksInDay', () => {
  it('filtra só as tarefas do dia pedido', () => {
    const tasks = [makeTask({ id: '1', day: 'mon' }), makeTask({ id: '2', day: 'tue' })];

    expect(sortTasksInDay(tasks, 'tue').map((t) => t.id)).toEqual(['2']);
  });

  it('ordena por prioridade Alta->Média->Baixa->sem prioridade', () => {
    const tasks = [
      makeTask({ id: 'sem', day: 'mon', priority: null, order: 0 }),
      makeTask({ id: 'baixa', day: 'mon', priority: 'low', order: 0 }),
      makeTask({ id: 'alta', day: 'mon', priority: 'high', order: 0 }),
      makeTask({ id: 'media', day: 'mon', priority: 'medium', order: 0 }),
    ];

    expect(sortTasksInDay(tasks, 'mon').map((t) => t.id)).toEqual(['alta', 'media', 'baixa', 'sem']);
  });

  it('dentro do mesmo grupo (day, priority), ordena por order crescente', () => {
    const tasks = [
      makeTask({ id: 'segunda', day: 'mon', priority: 'high', order: 1 }),
      makeTask({ id: 'primeira', day: 'mon', priority: 'high', order: 0 }),
    ];

    expect(sortTasksInDay(tasks, 'mon').map((t) => t.id)).toEqual(['primeira', 'segunda']);
  });

  it('grupo "sem prioridade" também respeita order crescente', () => {
    const tasks = [
      makeTask({ id: 'segunda', day: 'fri', priority: null, order: 1 }),
      makeTask({ id: 'primeira', day: 'fri', priority: null, order: 0 }),
    ];

    expect(sortTasksInDay(tasks, 'fri').map((t) => t.id)).toEqual(['primeira', 'segunda']);
  });
});

describe('getNextOrderInGroup', () => {
  it('grupo vazio: retorna 0', () => {
    expect(getNextOrderInGroup([], 'mon', 'high')).toBe(0);
  });

  it('conta só tarefas do mesmo dia e mesma prioridade (incluindo o grupo "sem prioridade")', () => {
    const tasks = [
      makeTask({ day: 'mon', priority: 'high' }),
      makeTask({ day: 'mon', priority: 'high' }),
      makeTask({ day: 'mon', priority: null }),
      makeTask({ day: 'tue', priority: 'high' }),
    ];

    expect(getNextOrderInGroup(tasks, 'mon', 'high')).toBe(2);
    expect(getNextOrderInGroup(tasks, 'mon', null)).toBe(1);
    expect(getNextOrderInGroup(tasks, 'tue', 'high')).toBe(1);
  });
});

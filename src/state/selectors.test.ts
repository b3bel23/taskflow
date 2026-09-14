import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { closeOrderGap, getNextOrderInGroup, reorderWithinGroup, sortTasksInDay } from './selectors';

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

describe('reorderWithinGroup', () => {
  it('grupo (day, priority) igual: no-op, retorna o mesmo array de tasks sem alterar nada', () => {
    const tasks = [
      makeTask({ id: 'a', day: 'mon', priority: 'high', order: 0 }),
      makeTask({ id: 'b', day: 'mon', priority: 'high', order: 1 }),
    ];

    const result = reorderWithinGroup(tasks, 'a', 'mon', 'high');

    expect(result).toBe(tasks);
  });

  it('id inexistente: no-op, retorna o mesmo array de tasks', () => {
    const tasks = [makeTask({ id: 'a', day: 'mon', priority: 'high', order: 0 })];

    const result = reorderWithinGroup(tasks, 'inexistente', 'tue', 'low');

    expect(result).toBe(tasks);
  });

  it('muda de dia: sai do grupo antigo (fecha o buraco, reindexa sequencialmente) e entra no fim do grupo novo', () => {
    const tasks = [
      makeTask({ id: 'a', day: 'mon', priority: 'high', order: 0 }),
      makeTask({ id: 'b', day: 'mon', priority: 'high', order: 1 }),
      makeTask({ id: 'c', day: 'mon', priority: 'high', order: 2 }),
      makeTask({ id: 'x', day: 'tue', priority: 'high', order: 0 }),
    ];

    const result = reorderWithinGroup(tasks, 'b', 'tue', 'high');

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ day: 'mon', priority: 'high', order: 0 });
    expect(byId.get('c')).toMatchObject({ day: 'mon', priority: 'high', order: 1 });
    expect(byId.get('x')).toMatchObject({ day: 'tue', priority: 'high', order: 0 });
    expect(byId.get('b')).toMatchObject({ day: 'tue', priority: 'high', order: 1 });
  });

  it('muda de prioridade (mesmo dia): sai do grupo antigo (fecha o buraco) e entra no fim do grupo novo', () => {
    const tasks = [
      makeTask({ id: 'a', day: 'mon', priority: 'high', order: 0 }),
      makeTask({ id: 'b', day: 'mon', priority: 'high', order: 1 }),
      makeTask({ id: 'low1', day: 'mon', priority: 'low', order: 0 }),
    ];

    const result = reorderWithinGroup(tasks, 'a', 'mon', 'low');

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('b')).toMatchObject({ day: 'mon', priority: 'high', order: 0 });
    expect(byId.get('low1')).toMatchObject({ day: 'mon', priority: 'low', order: 0 });
    expect(byId.get('a')).toMatchObject({ day: 'mon', priority: 'low', order: 1 });
  });

  it('muda para prioridade nula (sem prioridade): grupo novo é o grupo "sem prioridade" daquele dia', () => {
    const tasks = [
      makeTask({ id: 'a', day: 'mon', priority: 'high', order: 0 }),
      makeTask({ id: 'sem1', day: 'mon', priority: null, order: 0 }),
    ];

    const result = reorderWithinGroup(tasks, 'a', 'mon', null);

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ day: 'mon', priority: null, order: 1 });
    expect(byId.get('sem1')).toMatchObject({ day: 'mon', priority: null, order: 0 });
  });

  it('outras tarefas fora do grupo antigo/novo permanecem intocadas', () => {
    const tasks = [
      makeTask({ id: 'a', day: 'mon', priority: 'high', order: 0 }),
      makeTask({ id: 'other', day: 'wed', priority: 'medium', order: 5 }),
    ];

    const result = reorderWithinGroup(tasks, 'a', 'tue', 'low');

    expect(result.find((t) => t.id === 'other')).toMatchObject({ day: 'wed', priority: 'medium', order: 5 });
  });
});

describe('closeOrderGap', () => {
  it('grupo vazio: retorna o array como está (sem tasks para reindexar)', () => {
    const tasks = [makeTask({ id: 'a', day: 'tue', priority: 'high', order: 0 })];

    expect(closeOrderGap(tasks, 'mon', 'high')).toEqual(tasks);
  });

  it('remoção do meio de um grupo de 3: as 2 remanescentes ficam reindexadas sequencialmente (0,1), sem buraco', () => {
    // A tarefa "removida" (order=1) já não está mais no array recebido —
    // `closeOrderGap` só reindexa o que sobrou (I/O "Exclui com grupo maior").
    const tasks = [
      makeTask({ id: 'a', day: 'mon', priority: 'high', order: 0 }),
      makeTask({ id: 'c', day: 'mon', priority: 'high', order: 2 }),
    ];

    const result = closeOrderGap(tasks, 'mon', 'high');

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ order: 0 });
    expect(byId.get('c')).toMatchObject({ order: 1 });
  });

  it('grupo "sem prioridade" (null) também é reindexado', () => {
    const tasks = [
      makeTask({ id: 'a', day: 'fri', priority: null, order: 0 }),
      makeTask({ id: 'b', day: 'fri', priority: null, order: 3 }),
    ];

    const result = closeOrderGap(tasks, 'fri', null);

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ order: 0 });
    expect(byId.get('b')).toMatchObject({ order: 1 });
  });

  it('tarefas fora do grupo (day,priority) alvo permanecem intocadas (mesmo order antigo)', () => {
    const tasks = [
      makeTask({ id: 'a', day: 'mon', priority: 'high', order: 0 }),
      makeTask({ id: 'other-day', day: 'tue', priority: 'high', order: 5 }),
      makeTask({ id: 'other-priority', day: 'mon', priority: 'low', order: 7 }),
    ];

    const result = closeOrderGap(tasks, 'mon', 'high');

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('other-day')).toMatchObject({ day: 'tue', priority: 'high', order: 5 });
    expect(byId.get('other-priority')).toMatchObject({ day: 'mon', priority: 'low', order: 7 });
  });

  it('não reordena nada além do order: título/estado/prioridade preservados', () => {
    const tasks = [makeTask({ id: 'a', day: 'mon', priority: 'high', order: 5, title: 'Original', state: 'done' })];

    const [result] = closeOrderGap(tasks, 'mon', 'high');

    expect(result).toMatchObject({ id: 'a', title: 'Original', state: 'done', order: 0 });
  });
});

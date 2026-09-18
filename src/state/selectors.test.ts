import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  closeOrderGap,
  getNextOrderInGroup,
  reorderGroupByIndex,
  reorderWithinGroup,
  sortTasksInDay,
} from './selectors';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'id',
    title: overrides.title ?? 'Tarefa',
    date: overrides.date ?? '2026-09-21',
    time: overrides.time ?? null,
    state: overrides.state ?? 'pending',
    priority: overrides.priority ?? null,
    order: overrides.order ?? 0,
  };
}

describe('sortTasksInDay', () => {
  it('filtra só as tarefas da data pedida', () => {
    const tasks = [makeTask({ id: '1', date: '2026-09-21' }), makeTask({ id: '2', date: '2026-09-22' })];

    expect(sortTasksInDay(tasks, '2026-09-22').map((t) => t.id)).toEqual(['2']);
  });

  it('ordena por prioridade Alta->Média->Baixa->sem prioridade', () => {
    const tasks = [
      makeTask({ id: 'sem', date: '2026-09-21', priority: null, order: 0 }),
      makeTask({ id: 'baixa', date: '2026-09-21', priority: 'low', order: 0 }),
      makeTask({ id: 'alta', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'media', date: '2026-09-21', priority: 'medium', order: 0 }),
    ];

    expect(sortTasksInDay(tasks, '2026-09-21').map((t) => t.id)).toEqual(['alta', 'media', 'baixa', 'sem']);
  });

  it('dentro do mesmo grupo (date, priority), ordena por order crescente', () => {
    const tasks = [
      makeTask({ id: 'segunda', date: '2026-09-21', priority: 'high', order: 1 }),
      makeTask({ id: 'primeira', date: '2026-09-21', priority: 'high', order: 0 }),
    ];

    expect(sortTasksInDay(tasks, '2026-09-21').map((t) => t.id)).toEqual(['primeira', 'segunda']);
  });

  it('grupo "sem prioridade" também respeita order crescente', () => {
    const tasks = [
      makeTask({ id: 'segunda', date: '2026-09-18', priority: null, order: 1 }),
      makeTask({ id: 'primeira', date: '2026-09-18', priority: null, order: 0 }),
    ];

    expect(sortTasksInDay(tasks, '2026-09-18').map((t) => t.id)).toEqual(['primeira', 'segunda']);
  });
});

describe('getNextOrderInGroup', () => {
  it('grupo vazio: retorna 0', () => {
    expect(getNextOrderInGroup([], '2026-09-21', 'high')).toBe(0);
  });

  it('conta só tarefas da mesma data e mesma prioridade (incluindo o grupo "sem prioridade")', () => {
    const tasks = [
      makeTask({ date: '2026-09-21', priority: 'high' }),
      makeTask({ date: '2026-09-21', priority: 'high' }),
      makeTask({ date: '2026-09-21', priority: null }),
      makeTask({ date: '2026-09-22', priority: 'high' }),
    ];

    expect(getNextOrderInGroup(tasks, '2026-09-21', 'high')).toBe(2);
    expect(getNextOrderInGroup(tasks, '2026-09-21', null)).toBe(1);
    expect(getNextOrderInGroup(tasks, '2026-09-22', 'high')).toBe(1);
  });
});

describe('reorderWithinGroup', () => {
  it('grupo (date, priority) igual: no-op, retorna o mesmo array de tasks sem alterar nada', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'b', date: '2026-09-21', priority: 'high', order: 1 }),
    ];

    const result = reorderWithinGroup(tasks, 'a', '2026-09-21', 'high');

    expect(result).toBe(tasks);
  });

  it('id inexistente: no-op, retorna o mesmo array de tasks', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 })];

    const result = reorderWithinGroup(tasks, 'inexistente', '2026-09-22', 'low');

    expect(result).toBe(tasks);
  });

  it('muda de data: sai do grupo antigo (fecha o buraco, reindexa sequencialmente) e entra no fim do grupo novo', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'b', date: '2026-09-21', priority: 'high', order: 1 }),
      makeTask({ id: 'c', date: '2026-09-21', priority: 'high', order: 2 }),
      makeTask({ id: 'x', date: '2026-09-22', priority: 'high', order: 0 }),
    ];

    const result = reorderWithinGroup(tasks, 'b', '2026-09-22', 'high');

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ date: '2026-09-21', priority: 'high', order: 0 });
    expect(byId.get('c')).toMatchObject({ date: '2026-09-21', priority: 'high', order: 1 });
    expect(byId.get('x')).toMatchObject({ date: '2026-09-22', priority: 'high', order: 0 });
    expect(byId.get('b')).toMatchObject({ date: '2026-09-22', priority: 'high', order: 1 });
  });

  it('muda de prioridade (mesma data): sai do grupo antigo (fecha o buraco) e entra no fim do grupo novo', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'b', date: '2026-09-21', priority: 'high', order: 1 }),
      makeTask({ id: 'low1', date: '2026-09-21', priority: 'low', order: 0 }),
    ];

    const result = reorderWithinGroup(tasks, 'a', '2026-09-21', 'low');

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('b')).toMatchObject({ date: '2026-09-21', priority: 'high', order: 0 });
    expect(byId.get('low1')).toMatchObject({ date: '2026-09-21', priority: 'low', order: 0 });
    expect(byId.get('a')).toMatchObject({ date: '2026-09-21', priority: 'low', order: 1 });
  });

  it('muda para prioridade nula (sem prioridade): grupo novo é o grupo "sem prioridade" daquela data', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'sem1', date: '2026-09-21', priority: null, order: 0 }),
    ];

    const result = reorderWithinGroup(tasks, 'a', '2026-09-21', null);

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ date: '2026-09-21', priority: null, order: 1 });
    expect(byId.get('sem1')).toMatchObject({ date: '2026-09-21', priority: null, order: 0 });
  });

  it('outras tarefas fora do grupo antigo/novo permanecem intocadas', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'other', date: '2026-09-23', priority: 'medium', order: 5 }),
    ];

    const result = reorderWithinGroup(tasks, 'a', '2026-09-22', 'low');

    expect(result.find((t) => t.id === 'other')).toMatchObject({ date: '2026-09-23', priority: 'medium', order: 5 });
  });
});

describe('reorderGroupByIndex', () => {
  it('move para trás (toIndex maior): reindexa sequencialmente o grupo, data/prioridade preservados', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'b', date: '2026-09-21', priority: 'high', order: 1 }),
      makeTask({ id: 'c', date: '2026-09-21', priority: 'high', order: 2 }),
    ];

    const result = reorderGroupByIndex(tasks, 'a', '2026-09-21', 'high', 2);

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('b')).toMatchObject({ order: 0, date: '2026-09-21', priority: 'high' });
    expect(byId.get('c')).toMatchObject({ order: 1, date: '2026-09-21', priority: 'high' });
    expect(byId.get('a')).toMatchObject({ order: 2, date: '2026-09-21', priority: 'high' });
  });

  it('move para frente (toIndex menor): reindexa sequencialmente o grupo', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'b', date: '2026-09-21', priority: 'high', order: 1 }),
      makeTask({ id: 'c', date: '2026-09-21', priority: 'high', order: 2 }),
    ];

    const result = reorderGroupByIndex(tasks, 'c', '2026-09-21', 'high', 0);

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('c')).toMatchObject({ order: 0 });
    expect(byId.get('a')).toMatchObject({ order: 1 });
    expect(byId.get('b')).toMatchObject({ order: 2 });
  });

  it('id inexistente: no-op, retorna o mesmo array de tasks', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 })];

    const result = reorderGroupByIndex(tasks, 'inexistente', '2026-09-21', 'high', 0);

    expect(result).toBe(tasks);
  });

  it('grupo "sem prioridade" (null) também é reindexado corretamente', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-18', priority: null, order: 0 }),
      makeTask({ id: 'b', date: '2026-09-18', priority: null, order: 1 }),
    ];

    const result = reorderGroupByIndex(tasks, 'a', '2026-09-18', null, 1);

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('b')).toMatchObject({ order: 0 });
    expect(byId.get('a')).toMatchObject({ order: 1 });
  });

  it('grupo com 1 tarefa: reindexa para a mesma posição (0), no-op semântico', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 })];

    const result = reorderGroupByIndex(tasks, 'a', '2026-09-21', 'high', 0);

    expect(result[0]).toMatchObject({ id: 'a', order: 0 });
  });

  it('tarefas de outras datas/prioridades permanecem intocadas (mesmo order antigo)', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'b', date: '2026-09-21', priority: 'high', order: 1 }),
      makeTask({ id: 'other-day', date: '2026-09-22', priority: 'high', order: 5 }),
      makeTask({ id: 'other-priority', date: '2026-09-21', priority: 'low', order: 7 }),
    ];

    const result = reorderGroupByIndex(tasks, 'a', '2026-09-21', 'high', 1);

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('other-day')).toMatchObject({ date: '2026-09-22', priority: 'high', order: 5 });
    expect(byId.get('other-priority')).toMatchObject({ date: '2026-09-21', priority: 'low', order: 7 });
  });

  it('não altera nada além do order: título/estado/prioridade preservados', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0, title: 'Original', state: 'done' }),
      makeTask({ id: 'b', date: '2026-09-21', priority: 'high', order: 1 }),
    ];

    const result = reorderGroupByIndex(tasks, 'a', '2026-09-21', 'high', 1);

    expect(result.find((t) => t.id === 'a')).toMatchObject({ title: 'Original', state: 'done', order: 1 });
  });
});

describe('closeOrderGap', () => {
  it('grupo vazio: retorna o array como está (sem tasks para reindexar)', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-22', priority: 'high', order: 0 })];

    expect(closeOrderGap(tasks, '2026-09-21', 'high')).toEqual(tasks);
  });

  it('remoção do meio de um grupo de 3: as 2 remanescentes ficam reindexadas sequencialmente (0,1), sem buraco', () => {
    // A tarefa "removida" (order=1) já não está mais no array recebido —
    // `closeOrderGap` só reindexa o que sobrou (I/O "Exclui com grupo maior").
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'c', date: '2026-09-21', priority: 'high', order: 2 }),
    ];

    const result = closeOrderGap(tasks, '2026-09-21', 'high');

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ order: 0 });
    expect(byId.get('c')).toMatchObject({ order: 1 });
  });

  it('grupo "sem prioridade" (null) também é reindexado', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-18', priority: null, order: 0 }),
      makeTask({ id: 'b', date: '2026-09-18', priority: null, order: 3 }),
    ];

    const result = closeOrderGap(tasks, '2026-09-18', null);

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ order: 0 });
    expect(byId.get('b')).toMatchObject({ order: 1 });
  });

  it('tarefas fora do grupo (date,priority) alvo permanecem intocadas (mesmo order antigo)', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'other-day', date: '2026-09-22', priority: 'high', order: 5 }),
      makeTask({ id: 'other-priority', date: '2026-09-21', priority: 'low', order: 7 }),
    ];

    const result = closeOrderGap(tasks, '2026-09-21', 'high');

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('other-day')).toMatchObject({ date: '2026-09-22', priority: 'high', order: 5 });
    expect(byId.get('other-priority')).toMatchObject({ date: '2026-09-21', priority: 'low', order: 7 });
  });

  it('não reordena nada além do order: título/estado/prioridade preservados', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 5, title: 'Original', state: 'done' })];

    const [result] = closeOrderGap(tasks, '2026-09-21', 'high');

    expect(result).toMatchObject({ id: 'a', title: 'Original', state: 'done', order: 0 });
  });
});

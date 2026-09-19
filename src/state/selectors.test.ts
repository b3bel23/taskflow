import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { closeOrderGap, getNextOrderInGroup, reassignDate, sortTasksInDay } from './selectors';

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

  it('Story 6.2: tarefas sem Horário aparecem primeiro, seguidas das com Horário em ordem crescente', () => {
    const tasks = [
      makeTask({ id: 'tarde', date: '2026-09-21', time: '15:00', order: 0 }),
      makeTask({ id: 'sem', date: '2026-09-21', time: null, order: 1 }),
      makeTask({ id: 'manha', date: '2026-09-21', time: '09:00', order: 2 }),
    ];

    expect(sortTasksInDay(tasks, '2026-09-21').map((t) => t.id)).toEqual(['sem', 'manha', 'tarde']);
  });

  it('Prioridade não influencia a ordem em nenhum caso, mesmo com níveis opostos', () => {
    const tasks = [
      makeTask({ id: 'baixa-cedo', date: '2026-09-21', time: '08:00', priority: 'low', order: 0 }),
      makeTask({ id: 'alta-tarde', date: '2026-09-21', time: '18:00', priority: 'high', order: 1 }),
    ];

    // A de baixa prioridade, mas mais cedo, vem primeiro — Horário manda.
    expect(sortTasksInDay(tasks, '2026-09-21').map((t) => t.id)).toEqual(['baixa-cedo', 'alta-tarde']);
  });

  it('duas tarefas sem Horário: mantêm ordem de criação entre si (order crescente)', () => {
    const tasks = [
      makeTask({ id: 'segunda', date: '2026-09-21', time: null, order: 1 }),
      makeTask({ id: 'primeira', date: '2026-09-21', time: null, order: 0 }),
    ];

    expect(sortTasksInDay(tasks, '2026-09-21').map((t) => t.id)).toEqual(['primeira', 'segunda']);
  });

  it('duas tarefas com exatamente o mesmo Horário: order desempata (ordem de criação)', () => {
    const tasks = [
      makeTask({ id: 'criada-depois', date: '2026-09-21', time: '10:00', order: 1 }),
      makeTask({ id: 'criada-antes', date: '2026-09-21', time: '10:00', order: 0 }),
    ];

    expect(sortTasksInDay(tasks, '2026-09-21').map((t) => t.id)).toEqual(['criada-antes', 'criada-depois']);
  });
});

describe('getNextOrderInGroup', () => {
  it('grupo vazio: retorna 0', () => {
    expect(getNextOrderInGroup([], '2026-09-21')).toBe(0);
  });

  it('conta só tarefas da mesma Data, independente de Horário/Prioridade', () => {
    const tasks = [
      makeTask({ date: '2026-09-21', time: '08:00', priority: 'high' }),
      makeTask({ date: '2026-09-21', time: null, priority: null }),
      makeTask({ date: '2026-09-22', time: '08:00', priority: 'high' }),
    ];

    expect(getNextOrderInGroup(tasks, '2026-09-21')).toBe(2);
    expect(getNextOrderInGroup(tasks, '2026-09-22')).toBe(1);
  });
});

describe('reassignDate', () => {
  it('data igual à de antes: no-op, retorna o mesmo array de tasks sem alterar nada', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', order: 0 }),
      makeTask({ id: 'b', date: '2026-09-21', order: 1 }),
    ];

    const result = reassignDate(tasks, 'a', '2026-09-21');

    expect(result).toBe(tasks);
  });

  it('id inexistente: no-op, retorna o mesmo array de tasks', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-21', order: 0 })];

    const result = reassignDate(tasks, 'inexistente', '2026-09-22');

    expect(result).toBe(tasks);
  });

  it('muda de data: sai da Data antiga (fecha o buraco, reindexa sequencialmente) e entra no fim da Data nova', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', order: 0 }),
      makeTask({ id: 'b', date: '2026-09-21', order: 1 }),
      makeTask({ id: 'c', date: '2026-09-21', order: 2 }),
      makeTask({ id: 'x', date: '2026-09-22', order: 0 }),
    ];

    const result = reassignDate(tasks, 'b', '2026-09-22');

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ date: '2026-09-21', order: 0 });
    expect(byId.get('c')).toMatchObject({ date: '2026-09-21', order: 1 });
    expect(byId.get('x')).toMatchObject({ date: '2026-09-22', order: 0 });
    expect(byId.get('b')).toMatchObject({ date: '2026-09-22', order: 1 });
  });

  it('não altera Título/Horário/Prioridade/Estado — só Data e order', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', order: 0, title: 'Original', time: '09:00', priority: 'high', state: 'in_progress' }),
    ];

    const [result] = reassignDate(tasks, 'a', '2026-09-22');

    expect(result).toMatchObject({
      title: 'Original',
      time: '09:00',
      priority: 'high',
      state: 'in_progress',
      date: '2026-09-22',
    });
  });

  it('outras tarefas fora da Data antiga/nova permanecem intocadas', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', order: 0 }),
      makeTask({ id: 'other', date: '2026-09-23', order: 5 }),
    ];

    const result = reassignDate(tasks, 'a', '2026-09-22');

    expect(result.find((t) => t.id === 'other')).toMatchObject({ date: '2026-09-23', order: 5 });
  });
});

describe('closeOrderGap', () => {
  it('grupo vazio: retorna o array como está (sem tasks para reindexar)', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-22', order: 0 })];

    expect(closeOrderGap(tasks, '2026-09-21')).toEqual(tasks);
  });

  it('remoção do meio de um grupo de 3: as 2 remanescentes ficam reindexadas sequencialmente (0,1), sem buraco', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', order: 0 }),
      makeTask({ id: 'c', date: '2026-09-21', order: 2 }),
    ];

    const result = closeOrderGap(tasks, '2026-09-21');

    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get('a')).toMatchObject({ order: 0 });
    expect(byId.get('c')).toMatchObject({ order: 1 });
  });

  it('tarefas fora da Data alvo permanecem intocadas (mesmo order antigo)', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', order: 0 }),
      makeTask({ id: 'other-day', date: '2026-09-22', order: 5 }),
    ];

    const result = closeOrderGap(tasks, '2026-09-21');

    expect(result.find((t) => t.id === 'other-day')).toMatchObject({ date: '2026-09-22', order: 5 });
  });

  it('tarefa que já está com o order certo mantém a mesma referência de objeto; a que muda, não', () => {
    const certa = makeTask({ id: 'certa', date: '2026-09-21', order: 0 });
    const errada = makeTask({ id: 'errada', date: '2026-09-21', order: 4 });

    const result = closeOrderGap([certa, errada], '2026-09-21');

    expect(result[0]).toBe(certa);
    expect(result[1]).not.toBe(errada);
    expect(result[1]).toMatchObject({ id: 'errada', order: 1 });
    expect(errada.order).toBe(4);
  });

  it('empate de order mantém a posição relativa no array (ordenação estável)', () => {
    const tasks = [
      makeTask({ id: 'primeira', date: '2026-09-21', order: 1 }),
      makeTask({ id: 'segunda', date: '2026-09-21', order: 1 }),
    ];

    const result = closeOrderGap(tasks, '2026-09-21');

    expect(result.find((t) => t.id === 'primeira')?.order).toBe(0);
    expect(result.find((t) => t.id === 'segunda')?.order).toBe(1);
  });

  it('não reordena nada além do order: título/estado/prioridade/horário preservados', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', order: 5, title: 'Original', state: 'done', time: '10:00' }),
    ];

    const [result] = closeOrderGap(tasks, '2026-09-21');

    expect(result).toMatchObject({ id: 'a', title: 'Original', state: 'done', time: '10:00', order: 0 });
  });
});

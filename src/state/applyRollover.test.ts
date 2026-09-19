import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { applyRollover } from './applyRollover';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'id',
    title: overrides.title ?? 'Tarefa',
    date: overrides.date ?? '2026-09-15',
    time: overrides.time ?? null,
    state: overrides.state ?? 'pending',
    priority: overrides.priority ?? null,
    order: overrides.order ?? 0,
  };
}

const TODAY = '2026-09-18';

describe('applyRollover', () => {
  it('tarefa pending com date anterior à janela: date reatribuída direto para hoje', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-15', state: 'pending' })];

    const result = applyRollover(tasks, TODAY);

    expect(result[0]).toMatchObject({ id: 'a', date: TODAY, state: 'pending' });
  });

  it('tarefa in_progress com date anterior à janela: também sofre rollover', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-10', state: 'in_progress' })];

    const result = applyRollover(tasks, TODAY);

    expect(result[0]).toMatchObject({ date: TODAY, state: 'in_progress' });
  });

  it('tarefa done com date anterior à janela: NUNCA sofre rollover, mantém a date original', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-10', state: 'done' })];

    const result = applyRollover(tasks, TODAY);

    expect(result[0]).toMatchObject({ date: '2026-09-10', state: 'done' });
  });

  it('tarefa com date dentro da janela atual (>= hoje): não é tocada', () => {
    const tasks = [makeTask({ id: 'a', date: '2026-09-20', state: 'pending' })];

    const result = applyRollover(tasks, TODAY);

    expect(result[0]).toMatchObject({ date: '2026-09-20' });
  });

  it('tarefa com date == hoje: não é tocada (não é "anterior")', () => {
    const tasks = [makeTask({ id: 'a', date: TODAY, state: 'pending' })];

    const result = applyRollover(tasks, TODAY);

    expect(result[0]).toMatchObject({ date: TODAY });
  });

  it('Título, Horário e Prioridade são preservados; a tarefa não é duplicada', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-15', state: 'pending', title: 'Revisar PR', time: '09:00', priority: 'high' }),
    ];

    const result = applyRollover(tasks, TODAY);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: 'Revisar PR', time: '09:00', priority: 'high', date: TODAY });
  });

  it('nada para rolar: retorna a MESMA referência do array (permite ao chamador pular a escrita)', () => {
    const tasks = [makeTask({ id: 'a', date: TODAY, state: 'pending' }), makeTask({ id: 'b', date: '2026-09-20', state: 'pending' })];

    const result = applyRollover(tasks, TODAY);

    expect(result).toBe(tasks);
  });

  it('mistura: só as tarefas atrasadas e não concluídas mudam, o resto do array preserva referência de item', () => {
    const untouched = makeTask({ id: 'untouched', date: TODAY, state: 'pending' });
    const rolled = makeTask({ id: 'rolled', date: '2026-09-10', state: 'pending' });
    const doneOld = makeTask({ id: 'done-old', date: '2026-09-10', state: 'done' });
    const tasks = [untouched, rolled, doneOld];

    const result = applyRollover(tasks, TODAY);

    expect(result).not.toBe(tasks);
    expect(result.find((t) => t.id === 'untouched')).toBe(untouched);
    expect(result.find((t) => t.id === 'done-old')).toBe(doneOld);
    expect(result.find((t) => t.id === 'rolled')).toMatchObject({ date: TODAY });
    expect(result.find((t) => t.id === 'rolled')).not.toBe(rolled);
  });

  it('várias tarefas atrasadas de datas diferentes: todas convergem para hoje, nenhuma perdida', () => {
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-01', state: 'pending' }),
      makeTask({ id: 'b', date: '2026-09-10', state: 'in_progress' }),
      makeTask({ id: 'c', date: '2026-09-17', state: 'pending' }),
    ];

    const result = applyRollover(tasks, TODAY);

    expect(result.map((t) => t.id).sort()).toEqual(['a', 'b', 'c']);
    expect(result.every((t) => t.date === TODAY)).toBe(true);
  });
  describe('order do grupo de hoje (AD-7 revisado: sequencial 0..n-1, sem duplicar)', () => {
    it('tarefas atrasadas entram DEPOIS das que já estavam em hoje, sem order repetido', () => {
      const tasks = [
        makeTask({ id: 'hoje-0', date: TODAY, order: 0 }),
        makeTask({ id: 'hoje-1', date: TODAY, order: 1 }),
        makeTask({ id: 'atrasada-0', date: '2026-09-15', order: 0 }),
        makeTask({ id: 'atrasada-1', date: '2026-09-15', order: 1 }),
        makeTask({ id: 'atrasada-2', date: '2026-09-15', order: 2 }),
      ];

      const result = applyRollover(tasks, TODAY);

      const orderById = Object.fromEntries(result.map((t) => [t.id, t.order]));
      expect(orderById).toEqual({ 'hoje-0': 0, 'hoje-1': 1, 'atrasada-0': 2, 'atrasada-1': 3, 'atrasada-2': 4 });
    });

    it('atrasadas de datas diferentes mantêm a ordem cronológica original entre si (data, depois order)', () => {
      const tasks = [
        makeTask({ id: 'b-recente', date: '2026-09-17', order: 0 }),
        makeTask({ id: 'a-antiga-1', date: '2026-09-10', order: 1 }),
        makeTask({ id: 'a-antiga-0', date: '2026-09-10', order: 0 }),
      ];

      const result = applyRollover(tasks, TODAY);

      const sorted = [...result].sort((a, b) => a.order - b.order).map((t) => t.id);
      expect(sorted).toEqual(['a-antiga-0', 'a-antiga-1', 'b-recente']);
      expect(result.map((t) => t.order).sort()).toEqual([0, 1, 2]);
    });

    it('hoje sem tarefas prévias: atrasadas começam em order 0', () => {
      const tasks = [makeTask({ id: 'a', date: '2026-09-10', order: 5 })];

      expect(applyRollover(tasks, TODAY)[0]).toMatchObject({ date: TODAY, order: 0 });
    });

    it('tarefas de hoje que já estão em ordem sequencial mantêm a referência do item', () => {
      const hoje = makeTask({ id: 'hoje', date: TODAY, order: 0 });
      const result = applyRollover([hoje, makeTask({ id: 'atrasada', date: '2026-09-10', order: 0 })], TODAY);

      expect(result[0]).toBe(hoje);
    });

    it('hoje com buraco no order (0 e 5): atrasadas entram DEPOIS do 5 e o grupo é renumerado 0..n-1', () => {
      const tasks = [
        makeTask({ id: 'hoje-0', date: TODAY, order: 0 }),
        makeTask({ id: 'hoje-5', date: TODAY, order: 5 }),
        makeTask({ id: 'atrasada', date: '2026-09-10', order: 0 }),
      ];

      const result = applyRollover(tasks, TODAY);

      const orderById = Object.fromEntries(result.map((t) => [t.id, t.order]));
      expect(orderById).toEqual({ 'hoje-0': 0, 'hoje-5': 1, atrasada: 2 });
    });

    it('tarefa concluída no passado não ocupa order em hoje', () => {
      const tasks = [
        makeTask({ id: 'feita', date: '2026-09-10', state: 'done', order: 0 }),
        makeTask({ id: 'atrasada', date: '2026-09-10', order: 1 }),
      ];

      const result = applyRollover(tasks, TODAY);

      expect(result.find((t) => t.id === 'atrasada')).toMatchObject({ date: TODAY, order: 0 });
      expect(result.find((t) => t.id === 'feita')).toMatchObject({ date: '2026-09-10', order: 0 });
    });
  });
});

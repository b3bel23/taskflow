import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { TASKS_STORAGE_KEY } from '../storage/tasksStorage';
import type { TaskState } from '../types';
import { TaskProvider, useTaskContext } from './TaskContext';
import {
  useTaskActions,
  type ApplyRolloverResult,
  type DeleteTaskResult,
  type TaskActionResult,
} from './useTaskActions';

// Sem JSX neste arquivo (`.test.ts`) — `createElement` monta o wrapper do
// `renderHook` (mesmo padrão de `useThemeActions.test.ts`).
function wrapper({ children }: { children: ReactNode }) {
  return createElement(TaskProvider, null, children);
}

function useProbe() {
  return { ...useTaskContext(), ...useTaskActions() };
}

describe('createTask', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sucesso: salva antes de despachar; tarefa nasce pending, com order=0 da sua Data', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.createTask({
        title: 'Escrever spec',
        date: '2026-09-21',
        time: '09:00',
        priority: 'high',
      });
    });

    expect(actionResult?.ok).toBe(true);
    expect(result.current.state.tasks).toHaveLength(1);

    const [task] = result.current.state.tasks;
    expect(task).toMatchObject({
      title: 'Escrever spec',
      date: '2026-09-21',
      time: '09:00',
      state: 'pending',
      priority: 'high',
      order: 0,
    });
    expect(typeof task.id).toBe('string');
    expect(task.id.length).toBeGreaterThan(0);

    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toEqual([task]);
  });

  it('sem Horário: salva com time null (campo nunca bloqueia o salvamento, Story 6.1)', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Sem horário', date: '2026-09-21', time: null, priority: null });
    });

    expect(result.current.state.tasks[0]).toMatchObject({ time: null });
  });

  it('2ª tarefa na mesma Data recebe order maior que a 1ª e ids distintos', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Primeira', date: '2026-09-22', time: null, priority: null });
    });
    act(() => {
      result.current.createTask({ title: 'Segunda', date: '2026-09-22', time: null, priority: null });
    });

    const tasks = result.current.state.tasks;
    expect(tasks.map((t) => t.order)).toEqual([0, 1]);
    expect(tasks[0].id).not.toBe(tasks[1].id);
  });

  it('tarefa em Data diferente começa seu próprio grupo em order=0 (Prioridade não participa do agrupamento)', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Alta na segunda', date: '2026-09-21', time: null, priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Baixa na segunda', date: '2026-09-21', time: null, priority: 'low' });
    });
    act(() => {
      result.current.createTask({ title: 'Alta na terça', date: '2026-09-22', time: null, priority: 'high' });
    });

    // Mesma Data (2026-09-21): 2 tarefas já existentes -> order 0 e 1,
    // independente da Prioridade de cada uma (nunca mais agrupa por ela).
    expect(result.current.state.tasks.map((t) => t.order)).toEqual([0, 1, 0]);
  });

  it('falha: setItem lança, retorna {ok:false,error}, nunca lança, nenhuma tarefa é despachada nem persistida', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() => useProbe(), { wrapper });

    let actionResult: TaskActionResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.createTask({ title: 'Falha', date: '2026-09-23', time: null, priority: null });
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.state.tasks).toHaveLength(0);
    expect(window.localStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
  });
});

describe('updateTask', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('só muda o Nome: salva antes de despachar, Data/Horário/Prioridade/Estado ficam intactos', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Original', date: '2026-09-21', time: '09:00', priority: 'high' });
    });
    const [created] = result.current.state.tasks;

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.updateTask({
        id: created.id,
        title: 'Renomeada',
        date: created.date,
        time: created.time,
        priority: created.priority,
        state: created.state,
      });
    });

    expect(actionResult?.ok).toBe(true);
    expect(result.current.state.tasks[0]).toMatchObject({
      id: created.id,
      title: 'Renomeada',
      date: '2026-09-21',
      time: '09:00',
      priority: 'high',
      state: 'pending',
      order: 0,
    });
  });

  it('muda o Horário: reposiciona conforme a ordenação cronológica (Story 6.1/6.2)', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Cedo', date: '2026-09-21', time: '08:00', priority: null });
    });
    const [created] = result.current.state.tasks;

    act(() => {
      result.current.updateTask({
        id: created.id,
        title: created.title,
        date: created.date,
        time: '20:00',
        priority: created.priority,
        state: created.state,
      });
    });

    expect(result.current.state.tasks[0]).toMatchObject({ time: '20:00' });
  });

  it('muda a Data: sai da Data antiga (fecha o buraco), entra no fim do grupo novo, Estado/Horário não mudam', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Fica em 21', date: '2026-09-21', time: null, priority: null });
    });
    act(() => {
      result.current.createTask({ title: 'Muda de data', date: '2026-09-21', time: '10:00', priority: null });
    });
    act(() => {
      result.current.createTask({ title: 'Já em 22', date: '2026-09-22', time: null, priority: null });
    });
    const moving = result.current.state.tasks[1];

    act(() => {
      result.current.updateTask({
        id: moving.id,
        title: moving.title,
        date: '2026-09-22',
        time: moving.time,
        priority: moving.priority,
        state: moving.state,
      });
    });

    const tasks = result.current.state.tasks;
    const stayed = tasks.find((t) => t.title === 'Fica em 21')!;
    const moved = tasks.find((t) => t.id === moving.id)!;
    const alreadyThere = tasks.find((t) => t.title === 'Já em 22')!;

    expect(stayed).toMatchObject({ date: '2026-09-21', order: 0 });
    expect(moved).toMatchObject({ date: '2026-09-22', time: '10:00', state: 'pending', order: 1 });
    expect(alreadyThere).toMatchObject({ date: '2026-09-22', order: 0 });
  });

  it('muda a Prioridade: NUNCA reposiciona a tarefa (puro atributo visual, Epic 7) — order/Data intactos', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa 1', date: '2026-09-23', time: null, priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Tarefa 2 (vai mudar prioridade)', date: '2026-09-23', time: null, priority: 'high' });
    });
    const changing = result.current.state.tasks[1];

    act(() => {
      result.current.updateTask({
        id: changing.id,
        title: changing.title,
        date: '2026-09-23',
        time: changing.time,
        priority: 'low',
        state: changing.state,
      });
    });

    const tasks = result.current.state.tasks;
    expect(tasks.find((t) => t.title === 'Tarefa 1')).toMatchObject({ priority: 'high', order: 0 });
    expect(tasks.find((t) => t.id === changing.id)).toMatchObject({ priority: 'low', order: 1, date: '2026-09-23' });
  });

  it('muda o Estado: novo Estado persistido, Data/Horário/Nome inalterados', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-24', time: null, priority: null });
    });
    const [created] = result.current.state.tasks;

    act(() => {
      result.current.updateTask({
        id: created.id,
        title: created.title,
        date: created.date,
        time: created.time,
        priority: created.priority,
        state: 'in_progress',
      });
    });

    expect(result.current.state.tasks[0]).toMatchObject({
      title: 'Tarefa',
      date: '2026-09-24',
      priority: null,
      state: 'in_progress',
    });
  });

  it('escrita falha: retorna {ok:false,error}, nunca lança, tarefa mantém os valores antigos até sucesso', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Original', date: '2026-09-18', time: null, priority: 'medium' });
    });
    const [created] = result.current.state.tasks;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    let actionResult: TaskActionResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.updateTask({
          id: created.id,
          title: 'Não deveria salvar',
          date: '2026-09-19',
          time: '12:00',
          priority: 'low',
          state: 'done',
        });
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.state.tasks[0]).toEqual(created);
  });

  it('id inexistente: retorna {ok:false,error}, nunca lança, nada é persistido/despachado', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Existente', date: '2026-09-21', time: null, priority: null });
    });

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.updateTask({
        id: 'id-que-nao-existe',
        title: 'Não deveria salvar',
        date: '2026-09-22',
        time: null,
        priority: 'high',
        state: 'done',
      });
    });

    expect(actionResult).toEqual({ ok: false, error: { message: 'Tarefa não encontrada.' } });
    expect(result.current.state.tasks).toHaveLength(1);
  });
});

describe('deleteTask', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sucesso: salva antes de despachar, tarefa some do estado e dos dados persistidos', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Vai sumir', date: '2026-09-21', time: null, priority: 'high' });
    });
    const [created] = result.current.state.tasks;

    let actionResult: DeleteTaskResult | undefined;
    act(() => {
      actionResult = result.current.deleteTask(created.id);
    });

    expect(actionResult).toEqual({ ok: true });
    expect(result.current.state.tasks).toHaveLength(0);
  });

  it('Data com 3 tarefas, exclui a do meio: as 2 remanescentes reindexadas sequencialmente (0,1), sem buraco', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Primeira', date: '2026-09-23', time: null, priority: 'medium' });
    });
    act(() => {
      result.current.createTask({ title: 'Do meio', date: '2026-09-23', time: null, priority: 'medium' });
    });
    act(() => {
      result.current.createTask({ title: 'Última', date: '2026-09-23', time: null, priority: 'medium' });
    });
    const middle = result.current.state.tasks[1];

    act(() => {
      result.current.deleteTask(middle.id);
    });

    const tasks = result.current.state.tasks;
    expect(tasks).toHaveLength(2);
    expect(tasks.find((t) => t.title === 'Primeira')).toMatchObject({ order: 0 });
    expect(tasks.find((t) => t.title === 'Última')).toMatchObject({ order: 1 });
  });

  it('Data com 3 tarefas, exclui a do meio e cria uma 4ª: order único e sequencial (0,1,2), sem colisão', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    for (const title of ['Primeira', 'Do meio', 'Última']) {
      act(() => {
        result.current.createTask({ title, date: '2026-09-23', time: null, priority: null });
      });
    }
    const middle = result.current.state.tasks[1];
    act(() => {
      result.current.deleteTask(middle.id);
    });
    act(() => {
      result.current.createTask({ title: 'Quarta', date: '2026-09-23', time: null, priority: null });
    });

    const orders = result.current.state.tasks.map((t) => t.order).sort();
    expect(orders).toEqual([0, 1, 2]);
    expect(result.current.state.tasks.find((t) => t.title === 'Quarta')?.order).toBe(2);
  });

  it('escrita falha: retorna {ok:false,error}, nunca lança, tarefa não some do estado nem dos dados', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Não deve sumir', date: '2026-09-24', time: null, priority: null });
    });
    const [created] = result.current.state.tasks;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    let actionResult: DeleteTaskResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.deleteTask(created.id);
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.state.tasks).toHaveLength(1);
  });

  it('id inexistente: retorna {ok:false,error}, nunca lança, nada é persistido/despachado', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Existente', date: '2026-09-21', time: null, priority: null });
    });

    let actionResult: DeleteTaskResult | undefined;
    act(() => {
      actionResult = result.current.deleteTask('id-que-nao-existe');
    });

    expect(actionResult).toEqual({ ok: false, error: { message: 'Tarefa não encontrada.' } });
    expect(result.current.state.tasks).toHaveLength(1);
  });
});

describe('cycleState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each<[TaskState, TaskState]>([
    ['pending', 'in_progress'],
    ['in_progress', 'done'],
    ['done', 'pending'],
  ])('ciclo fixo: %s -> %s, salva antes de despachar, Título/Data/Prioridade/order intactos', (from, to) => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-21', time: null, priority: 'high' });
    });
    const [created] = result.current.state.tasks;
    act(() => {
      result.current.updateTask({
        id: created.id,
        title: created.title,
        date: created.date,
        time: created.time,
        priority: created.priority,
        state: from,
      });
    });

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.cycleState(created.id);
    });

    expect(actionResult?.ok).toBe(true);
    expect(result.current.state.tasks[0]).toMatchObject({
      id: created.id,
      title: 'Tarefa',
      date: '2026-09-21',
      priority: 'high',
      state: to,
      order: 0,
    });
  });

  it('escrita falha: retorna {ok:false,error}, nunca lança, Estado exibido não muda', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-18', time: null, priority: 'medium' });
    });
    const [created] = result.current.state.tasks;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.cycleState(created.id);
    });

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.state.tasks[0]).toEqual(created);
  });

  it('id inexistente: retorna {ok:false,error}, nunca lança', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.cycleState('id-que-nao-existe');
    });

    expect(actionResult).toEqual({ ok: false, error: { message: 'Tarefa não encontrada.' } });
  });
});

describe('cyclePriority (Story 7.2)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each<[null | 'low' | 'medium' | 'high', null | 'low' | 'medium' | 'high']>([
    [null, 'low'],
    ['low', 'medium'],
    ['medium', 'high'],
    ['high', null],
  ])('ciclo fixo: %s -> %s (wraparound Sem prioridade->Baixa->Média->Alta->Sem prioridade)', (from, to) => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-21', time: null, priority: from });
    });
    const [created] = result.current.state.tasks;

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.cyclePriority(created.id);
    });

    expect(actionResult?.ok).toBe(true);
    expect(result.current.state.tasks[0]).toMatchObject({ priority: to });
  });

  it('nunca muda Título/Data/Horário/Estado/order — só a Prioridade', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-21', time: '09:00', priority: null });
    });
    const [created] = result.current.state.tasks;
    act(() => {
      result.current.updateTask({
        id: created.id,
        title: created.title,
        date: created.date,
        time: created.time,
        priority: created.priority,
        state: 'in_progress',
      });
    });

    act(() => {
      result.current.cyclePriority(created.id);
    });

    expect(result.current.state.tasks[0]).toMatchObject({
      title: 'Tarefa',
      date: '2026-09-21',
      time: '09:00',
      state: 'in_progress',
      order: 0,
      priority: 'low',
    });
  });

  it('escrita falha: retorna {ok:false,error}, nunca lança, Prioridade exibida não muda', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-18', time: null, priority: null });
    });
    const [created] = result.current.state.tasks;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.cyclePriority(created.id);
    });

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.state.tasks[0]).toEqual(created);
  });

  it('id inexistente: retorna {ok:false,error}, nunca lança', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.cyclePriority('id-que-nao-existe');
    });

    expect(actionResult).toEqual({ ok: false, error: { message: 'Tarefa não encontrada.' } });
  });
});

describe('moveTaskToDate (Story 4.2 revisada — arraste entre dias)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('move para outra Data: sai da Data antiga (fecha o buraco), entra no fim da Data nova', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Fica', date: '2026-09-21', time: null, priority: null });
    });
    act(() => {
      result.current.createTask({ title: 'Move', date: '2026-09-21', time: null, priority: null });
    });
    act(() => {
      result.current.createTask({ title: 'Já lá', date: '2026-09-22', time: null, priority: null });
    });
    const [, moving] = result.current.state.tasks;

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.moveTaskToDate(moving.id, '2026-09-22');
    });

    expect(actionResult?.ok).toBe(true);
    const tasks = result.current.state.tasks;
    expect(tasks.find((t) => t.title === 'Fica')).toMatchObject({ date: '2026-09-21', order: 0 });
    expect(tasks.find((t) => t.title === 'Move')).toMatchObject({ date: '2026-09-22', order: 1 });
    expect(tasks.find((t) => t.title === 'Já lá')).toMatchObject({ date: '2026-09-22', order: 0 });
  });

  it('NUNCA muda Horário/Prioridade/Estado — só a Data (AC Story 4.2)', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-21', time: '14:30', priority: 'high' });
    });
    const [created] = result.current.state.tasks;
    act(() => {
      result.current.cycleState(created.id); // pending -> in_progress
    });

    act(() => {
      result.current.moveTaskToDate(created.id, '2026-09-24');
    });

    expect(result.current.state.tasks[0]).toMatchObject({
      date: '2026-09-24',
      time: '14:30',
      priority: 'high',
      state: 'in_progress',
    });
  });

  it('mesma Data (drop na própria coluna): no-op, mas ainda retorna {ok:true}', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-21', time: null, priority: null });
    });
    const [created] = result.current.state.tasks;

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.moveTaskToDate(created.id, '2026-09-21');
    });

    expect(actionResult?.ok).toBe(true);
    expect(result.current.state.tasks[0]).toEqual(created);
  });

  it('escrita falha: retorna {ok:false,error}, nunca lança, a tarefa permanece na Data original', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-21', time: null, priority: null });
    });
    const [created] = result.current.state.tasks;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    let actionResult: TaskActionResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.moveTaskToDate(created.id, '2026-09-22');
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.state.tasks[0]).toEqual(created);
  });

  it('id inexistente: retorna {ok:false,error}, nunca lança, nada é persistido/despachado', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.moveTaskToDate('id-que-nao-existe', '2026-09-22');
    });

    expect(actionResult).toEqual({ ok: false, error: { message: 'Tarefa não encontrada.' } });
  });
});

describe('applyRollover (Story 5.4)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reatribui direto para hoje as tarefas não concluídas com date anterior à janela, em uma única escrita', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Atrasada', date: '2026-09-10', time: null, priority: null });
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    let actionResult: ApplyRolloverResult | undefined;
    act(() => {
      actionResult = result.current.applyRollover('2026-09-18');
    });

    expect(actionResult).toEqual({ ok: true });
    expect(result.current.state.tasks[0]).toMatchObject({ date: '2026-09-18' });
    // Uma única escrita em lote para esta chamada de applyRollover (AD-11).
    expect(setItemSpy).toHaveBeenCalledTimes(1);
  });

  it('tarefa done com date passada: NUNCA sofre rollover', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Concluída antiga', date: '2026-09-10', time: null, priority: null });
    });
    const [created] = result.current.state.tasks;
    act(() => {
      result.current.updateTask({
        id: created.id,
        title: created.title,
        date: created.date,
        time: created.time,
        priority: created.priority,
        state: 'done',
      });
    });

    act(() => {
      result.current.applyRollover('2026-09-18');
    });

    expect(result.current.state.tasks[0]).toMatchObject({ date: '2026-09-10', state: 'done' });
  });

  it('nada para rolar: retorna {ok:true} sem tentar escrever em localStorage', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Em dia', date: '2026-09-18', time: null, priority: null });
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    let actionResult: ApplyRolloverResult | undefined;
    act(() => {
      actionResult = result.current.applyRollover('2026-09-18');
    });

    expect(actionResult).toEqual({ ok: true });
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('escrita falha: retorna {ok:false,error}, nunca lança, nenhuma tarefa exibida muda de Data', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Atrasada', date: '2026-09-10', time: null, priority: null });
    });
    const [created] = result.current.state.tasks;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    let actionResult: ApplyRolloverResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.applyRollover('2026-09-18');
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.state.tasks[0]).toEqual(created);
  });
});

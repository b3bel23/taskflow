import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { TASKS_STORAGE_KEY } from '../storage/tasksStorage';
import type { TaskState } from '../types';
import { TaskProvider, useTaskContext } from './TaskContext';
import { useTaskActions, type DeleteTaskResult, type TaskActionResult } from './useTaskActions';

// Sem JSX neste arquivo (`.test.ts`, como o Code Map da spec pede) —
// `createElement` monta o wrapper do `renderHook` (mesmo padrão de
// `useThemeActions.test.ts`).
function wrapper({ children }: { children: ReactNode }) {
  return createElement(TaskProvider, null, children);
}

function useProbe() {
  return { ...useTaskContext(), ...useTaskActions() };
}

describe('useTaskActions', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createTask com sucesso: salva antes de despachar; tarefa nasce pending, com order=0 do seu grupo', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.createTask({ title: 'Escrever spec', date: '2026-09-21', priority: 'high' });
    });

    expect(actionResult?.ok).toBe(true);
    expect(result.current.state.tasks).toHaveLength(1);

    const [task] = result.current.state.tasks;
    expect(task).toMatchObject({
      title: 'Escrever spec',
      date: '2026-09-21',
      state: 'pending',
      priority: 'high',
      order: 0,
    });
    expect(typeof task.id).toBe('string');
    expect(task.id.length).toBeGreaterThan(0);

    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toEqual([task]);
  });

  it('2ª tarefa no mesmo grupo (date+priority) recebe order maior que a 1ª e ids distintos', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Primeira', date: '2026-09-22', priority: null });
    });
    act(() => {
      result.current.createTask({ title: 'Segunda', date: '2026-09-22', priority: null });
    });

    const tasks = result.current.state.tasks;
    expect(tasks.map((t) => t.order)).toEqual([0, 1]);
    expect(tasks[0].id).not.toBe(tasks[1].id);
  });

  it('tarefa em grupo (date+priority) diferente começa seu próprio grupo em order=0', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Alta na segunda', date: '2026-09-21', priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Baixa na segunda', date: '2026-09-21', priority: 'low' });
    });
    act(() => {
      result.current.createTask({ title: 'Alta na terça', date: '2026-09-22', priority: 'high' });
    });

    expect(result.current.state.tasks.map((t) => t.order)).toEqual([0, 0, 0]);
  });

  it('createTask com falha: setItem lança, retorna {ok:false,error}, nunca lança, nenhuma tarefa é despachada nem persistida', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() => useProbe(), { wrapper });

    let actionResult: TaskActionResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.createTask({ title: 'Falha', date: '2026-09-23', priority: null });
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

  it('só muda o Nome: salva antes de despachar, Dia/Prioridade/Estado ficam intactos', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Original', date: '2026-09-21', priority: 'high' });
    });
    const [created] = result.current.state.tasks;

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.updateTask({
        id: created.id,
        title: 'Renomeada',
        date: created.date,
        priority: created.priority,
        state: created.state,
      });
    });

    expect(actionResult?.ok).toBe(true);
    expect(result.current.state.tasks).toHaveLength(1);
    expect(result.current.state.tasks[0]).toMatchObject({
      id: created.id,
      title: 'Renomeada',
      date: '2026-09-21',
      priority: 'high',
      state: 'pending',
      order: 0,
    });

    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toEqual(result.current.state.tasks);
  });

  it('muda o Dia: sai da coluna antiga (fecha o buraco), entra no fim do grupo novo, Estado não muda', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Fica em mon', date: '2026-09-21', priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Muda de dia', date: '2026-09-21', priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Já em tue', date: '2026-09-22', priority: 'high' });
    });
    const moving = result.current.state.tasks[1];

    act(() => {
      result.current.updateTask({
        id: moving.id,
        title: moving.title,
        date: '2026-09-22',
        priority: moving.priority,
        state: moving.state,
      });
    });

    const tasks = result.current.state.tasks;
    const stayed = tasks.find((t) => t.title === 'Fica em mon')!;
    const moved = tasks.find((t) => t.id === moving.id)!;
    const alreadyThere = tasks.find((t) => t.title === 'Já em tue')!;

    expect(stayed).toMatchObject({ date: '2026-09-21', order: 0 });
    expect(moved).toMatchObject({ date: '2026-09-22', priority: 'high', state: 'pending', order: 1 });
    expect(alreadyThere).toMatchObject({ date: '2026-09-22', order: 0 });
  });

  it('muda a Prioridade (mesmo dia): reposicionada no grupo novo, grupo antigo sem buraco', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Alta 1', date: '2026-09-23', priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Alta 2 (vai virar baixa)', date: '2026-09-23', priority: 'high' });
    });
    const changing = result.current.state.tasks[1];

    act(() => {
      result.current.updateTask({
        id: changing.id,
        title: changing.title,
        date: '2026-09-23',
        priority: 'low',
        state: changing.state,
      });
    });

    const tasks = result.current.state.tasks;
    expect(tasks.find((t) => t.title === 'Alta 1')).toMatchObject({ priority: 'high', order: 0 });
    expect(tasks.find((t) => t.id === changing.id)).toMatchObject({ priority: 'low', order: 0, date: '2026-09-23' });
  });

  it('muda o Estado: novo Estado persistido, Dia/Prioridade/Nome inalterados', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-24', priority: null });
    });
    const [created] = result.current.state.tasks;

    act(() => {
      result.current.updateTask({
        id: created.id,
        title: created.title,
        date: created.date,
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
      result.current.createTask({ title: 'Original', date: '2026-09-18', priority: 'medium' });
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
      result.current.createTask({ title: 'Existente', date: '2026-09-21', priority: null });
    });

    let actionResult: TaskActionResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.updateTask({
          id: 'id-que-nao-existe',
          title: 'Não deveria salvar',
          date: '2026-09-22',
          priority: 'high',
          state: 'done',
        });
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'Tarefa não encontrada.' } });
    expect(result.current.state.tasks).toHaveLength(1);
    expect(result.current.state.tasks[0].title).toBe('Existente');
    // Nada além da 1ª tarefa (já persistida pelo createTask acima) foi salvo —
    // o id inexistente nunca chega a tentar escrever em localStorage.
    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toHaveLength(1);
    expect(saved.tasks[0].title).toBe('Existente');
  });
});

describe('deleteTask', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exclui com sucesso: salva antes de despachar, tarefa some do estado e dos dados persistidos', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Vai sumir', date: '2026-09-21', priority: 'high' });
    });
    const [created] = result.current.state.tasks;

    let actionResult: DeleteTaskResult | undefined;
    act(() => {
      actionResult = result.current.deleteTask(created.id);
    });

    expect(actionResult).toEqual({ ok: true });
    expect(result.current.state.tasks).toHaveLength(0);

    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toEqual([]);
  });

  it('grupo (date,priority) com 3 tarefas, exclui a do meio: as 2 remanescentes reindexadas sequencialmente (0,1), sem buraco', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Primeira', date: '2026-09-23', priority: 'medium' });
    });
    act(() => {
      result.current.createTask({ title: 'Do meio (vai ser excluída)', date: '2026-09-23', priority: 'medium' });
    });
    act(() => {
      result.current.createTask({ title: 'Última', date: '2026-09-23', priority: 'medium' });
    });
    const middle = result.current.state.tasks[1];

    act(() => {
      result.current.deleteTask(middle.id);
    });

    const tasks = result.current.state.tasks;
    expect(tasks).toHaveLength(2);
    const first = tasks.find((t) => t.title === 'Primeira')!;
    const last = tasks.find((t) => t.title === 'Última')!;
    expect(first).toMatchObject({ order: 0 });
    expect(last).toMatchObject({ order: 1 });

    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toEqual(tasks);
  });

  it('tarefas de outros grupos (date,priority) não são afetadas pela exclusão', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Grupo A', date: '2026-09-21', priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Outro grupo', date: '2026-09-22', priority: 'low' });
    });
    const [toDelete] = result.current.state.tasks;

    act(() => {
      result.current.deleteTask(toDelete.id);
    });

    const remaining = result.current.state.tasks;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ title: 'Outro grupo', date: '2026-09-22', priority: 'low', order: 0 });
  });

  it('escrita falha: confirmação continua íntegra — retorna {ok:false,error}, nunca lança, tarefa não some do estado nem dos dados', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Não deve sumir', date: '2026-09-24', priority: null });
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
    expect(result.current.state.tasks[0]).toEqual(created);
  });

  it('id inexistente: retorna {ok:false,error}, nunca lança, nada é persistido/despachado', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Existente', date: '2026-09-21', priority: null });
    });

    let actionResult: DeleteTaskResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.deleteTask('id-que-nao-existe');
      });
    }).not.toThrow();

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
  ])('ciclo fixo: %s -> %s, salva antes de despachar, Título/Dia/Prioridade/order intactos', (from, to) => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-21', priority: 'high' });
    });
    const [created] = result.current.state.tasks;
    // Ajusta diretamente o Estado inicial via updateTask (reaproveitado já
    // testado acima) para exercitar `cycleState` a partir de cada Estado do
    // ciclo, sem depender de chamadas repetidas.
    act(() => {
      result.current.updateTask({
        id: created.id,
        title: created.title,
        date: created.date,
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

    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toEqual(result.current.state.tasks);
  });

  it('wraparound sem restrição: 3 cliques seguidos voltam ao Estado inicial (pending)', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-21', priority: null });
    });
    const [created] = result.current.state.tasks;

    act(() => {
      result.current.cycleState(created.id);
    });
    expect(result.current.state.tasks[0].state).toBe('in_progress');

    act(() => {
      result.current.cycleState(created.id);
    });
    expect(result.current.state.tasks[0].state).toBe('done');

    act(() => {
      result.current.cycleState(created.id);
    });
    expect(result.current.state.tasks[0].state).toBe('pending');
  });

  it('escrita falha: retorna {ok:false,error}, nunca lança, Estado exibido não muda, sem nova tentativa automática', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-18', priority: 'medium' });
    });
    const [created] = result.current.state.tasks;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    let actionResult: TaskActionResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.cycleState(created.id);
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.state.tasks[0]).toEqual(created);
  });

  it('id inexistente: retorna {ok:false,error}, nunca lança, nada é persistido/despachado', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Existente', date: '2026-09-21', priority: null });
    });

    let actionResult: TaskActionResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.cycleState('id-que-nao-existe');
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'Tarefa não encontrada.' } });
    expect(result.current.state.tasks).toHaveLength(1);
    expect(result.current.state.tasks[0].state).toBe('pending');
  });
});

describe('reorderTask (Story 4.1)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reposiciona dentro do mesmo grupo (date,priority): reindexa sequencialmente, salva antes de despachar', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Primeira', date: '2026-09-21', priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Segunda', date: '2026-09-21', priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Terceira', date: '2026-09-21', priority: 'high' });
    });
    const [first] = result.current.state.tasks;

    let actionResult: TaskActionResult | undefined;
    act(() => {
      actionResult = result.current.reorderTask(first.id, 2);
    });

    expect(actionResult?.ok).toBe(true);
    const tasks = result.current.state.tasks;
    expect(tasks.find((t) => t.title === 'Segunda')).toMatchObject({ order: 0 });
    expect(tasks.find((t) => t.title === 'Terceira')).toMatchObject({ order: 1 });
    expect(tasks.find((t) => t.title === 'Primeira')).toMatchObject({ order: 2, date: '2026-09-21', priority: 'high' });

    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toEqual(tasks);
  });

  it('nunca muda Dia/Prioridade/Título/Estado — só a posição relativa (order) dentro do grupo', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Tarefa', date: '2026-09-23', priority: 'low' });
    });
    act(() => {
      result.current.createTask({ title: 'Outra', date: '2026-09-23', priority: 'low' });
    });
    const [created] = result.current.state.tasks;
    act(() => {
      result.current.updateTask({
        id: created.id,
        title: created.title,
        date: created.date,
        priority: created.priority,
        state: 'in_progress',
      });
    });

    act(() => {
      result.current.reorderTask(created.id, 1);
    });

    const moved = result.current.state.tasks.find((t) => t.id === created.id);
    expect(moved).toMatchObject({ title: 'Tarefa', date: '2026-09-23', priority: 'low', state: 'in_progress', order: 1 });
  });

  it('outros grupos (date,priority) permanecem intocados', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Grupo A - 1', date: '2026-09-21', priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Grupo A - 2', date: '2026-09-21', priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Outro grupo', date: '2026-09-22', priority: 'low' });
    });
    const [first] = result.current.state.tasks;

    act(() => {
      result.current.reorderTask(first.id, 1);
    });

    const untouched = result.current.state.tasks.find((t) => t.title === 'Outro grupo');
    expect(untouched).toMatchObject({ date: '2026-09-22', priority: 'low', order: 0 });
  });

  it('escrita falha: retorna {ok:false,error}, nunca lança, ordem em memória permanece a original (Card volta à posição)', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Primeira', date: '2026-09-24', priority: null });
    });
    act(() => {
      result.current.createTask({ title: 'Segunda', date: '2026-09-24', priority: null });
    });
    const [first, second] = result.current.state.tasks;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    let actionResult: TaskActionResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.reorderTask(first.id, 1);
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.state.tasks).toEqual([first, second]);
  });

  it('id inexistente: retorna {ok:false,error}, nunca lança, nada é persistido/despachado', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Existente', date: '2026-09-21', priority: null });
    });

    let actionResult: TaskActionResult | undefined;
    expect(() => {
      act(() => {
        actionResult = result.current.reorderTask('id-que-nao-existe', 0);
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'Tarefa não encontrada.' } });
    expect(result.current.state.tasks).toHaveLength(1);
  });
});

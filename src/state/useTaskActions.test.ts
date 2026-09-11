import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { TASKS_STORAGE_KEY } from '../storage/tasksStorage';
import { TaskProvider, useTaskContext } from './TaskContext';
import { useTaskActions, type TaskActionResult } from './useTaskActions';

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
      actionResult = result.current.createTask({ title: 'Escrever spec', day: 'mon', priority: 'high' });
    });

    expect(actionResult?.ok).toBe(true);
    expect(result.current.state.tasks).toHaveLength(1);

    const [task] = result.current.state.tasks;
    expect(task).toMatchObject({
      title: 'Escrever spec',
      day: 'mon',
      state: 'pending',
      priority: 'high',
      order: 0,
    });
    expect(typeof task.id).toBe('string');
    expect(task.id.length).toBeGreaterThan(0);

    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toEqual([task]);
  });

  it('2ª tarefa no mesmo grupo (day+priority) recebe order maior que a 1ª e ids distintos', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Primeira', day: 'tue', priority: null });
    });
    act(() => {
      result.current.createTask({ title: 'Segunda', day: 'tue', priority: null });
    });

    const tasks = result.current.state.tasks;
    expect(tasks.map((t) => t.order)).toEqual([0, 1]);
    expect(tasks[0].id).not.toBe(tasks[1].id);
  });

  it('tarefa em grupo (day+priority) diferente começa seu próprio grupo em order=0', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.createTask({ title: 'Alta na segunda', day: 'mon', priority: 'high' });
    });
    act(() => {
      result.current.createTask({ title: 'Baixa na segunda', day: 'mon', priority: 'low' });
    });
    act(() => {
      result.current.createTask({ title: 'Alta na terça', day: 'tue', priority: 'high' });
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
        actionResult = result.current.createTask({ title: 'Falha', day: 'wed', priority: null });
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.state.tasks).toHaveLength(0);
    expect(window.localStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
  });
});

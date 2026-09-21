import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { TASKS_STORAGE_KEY } from '../storage/tasksStorage';
import { TaskProvider, useTaskContext } from './TaskContext';

function TaskContextProbe() {
  const { state } = useTaskContext();
  return (
    <p data-testid="probe">
      {JSON.stringify({ taskCount: state.tasks.length, loadError: state.loadError })}
    </p>
  );
}

function readProbe() {
  return JSON.parse(screen.getByTestId('probe').textContent ?? '{}') as {
    taskCount: number;
    loadError: boolean;
  };
}

describe('TaskContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('primeira instalação: sem chave salva, estado inicial é vazio sem loadError', () => {
    render(
      <TaskProvider>
        <TaskContextProbe />
      </TaskProvider>,
    );

    expect(readProbe()).toEqual({ taskCount: 0, loadError: false });
  });

  it('init lazy lê localStorage síncrono uma vez, antes da primeira renderização', () => {
    window.localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [
          { id: 't1', title: 'A', day: 'mon', state: 'pending', priority: null, order: 0 },
        ],
      }),
    );

    render(
      <TaskProvider>
        <TaskContextProbe />
      </TaskProvider>,
    );

    expect(readProbe()).toEqual({ taskCount: 1, loadError: false });
  });

  it('dado corrompido: estado cai vazio com loadError, sem o app travar', () => {
    window.localStorage.setItem(TASKS_STORAGE_KEY, '{not valid json');

    expect(() =>
      render(
        <TaskProvider>
          <TaskContextProbe />
        </TaskProvider>,
      ),
    ).not.toThrow();
    expect(readProbe()).toEqual({ taskCount: 0, loadError: true });
  });

  it('useTaskContext fora de um TaskProvider lança um erro claro', () => {
    expect(() => render(<TaskContextProbe />)).toThrow(
      'useTaskContext deve ser usado dentro de um TaskProvider',
    );
  });
});

// Retro Epic 1, item 23: o provider adota o que outra aba gravou.
describe('TaskContext — sincronização entre abas', () => {
  const task = (id: string) => ({
    id,
    title: `Tarefa ${id}`,
    date: '2026-09-21',
    time: null,
    state: 'pending',
    priority: null,
    order: 0,
  });
  const save = (ids: string[]) =>
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, tasks: ids.map(task) }));
  const otherTabWrote = () =>
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: TASKS_STORAGE_KEY }));
    });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('outra aba gravou tarefas: o estado desta aba passa a refletir o que foi salvo, sem reload', () => {
    save(['a']);
    render(
      <TaskProvider>
        <TaskContextProbe />
      </TaskProvider>,
    );
    expect(readProbe().taskCount).toBe(1);

    save(['a', 'b', 'c']);
    otherTabWrote();

    expect(readProbe()).toEqual({ taskCount: 3, loadError: false });
  });

  it('dado corrompido escrito por outra aba: mantém as tarefas que esta aba já tinha', () => {
    save(['a', 'b']);
    render(
      <TaskProvider>
        <TaskContextProbe />
      </TaskProvider>,
    );

    window.localStorage.setItem(TASKS_STORAGE_KEY, '{quebrado');
    otherTabWrote();

    expect(readProbe()).toEqual({ taskCount: 2, loadError: false });
  });

  it('ao desmontar, cancela a assinatura do evento storage', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(
      <TaskProvider>
        <TaskContextProbe />
      </TaskProvider>,
    );

    unmount();

    expect(removeSpy.mock.calls.some(([type]) => type === 'storage')).toBe(true);
    removeSpy.mockRestore();
  });
});

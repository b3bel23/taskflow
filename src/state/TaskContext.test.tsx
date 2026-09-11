import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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

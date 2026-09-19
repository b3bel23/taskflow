import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { DndContextProps } from '@dnd-kit/core';
import { WeekView } from './WeekView';
import { formatDayHeading } from '../../constants/week';
import { TaskProvider } from '../../state/TaskContext';
import { TASKS_STORAGE_KEY } from '../../storage/tasksStorage';
import type { Task } from '../../types';

// Simular um gesto físico de arraste não é viável sob jsdom (ver
// `dragChange.ts`) — em vez disso, captura as props reais que `WeekView`
// passa ao `DndContext` e chama o `onDragEnd` de produção direto, com um
// `DragEndEvent` sintético. Isso exercita a fiação real (`handleDragEnd` →
// `moveTaskToDate` → foco pós-render), que os testes só da função pura
// `resolveWeekDragChange` não cobrem (retro Epic 4, item 12).
let capturedDndProps: DndContextProps | null = null;

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: DndContextProps) => {
      capturedDndProps = props;
      return <actual.DndContext {...props} />;
    },
  };
});

const TODAY = '2026-09-18';
const TOMORROW = '2026-09-19';

function seed(tasks: Partial<Task>[]) {
  const full: Task[] = tasks.map((t, index) => ({
    id: t.id ?? `t${index}`,
    title: t.title ?? `Tarefa ${index}`,
    date: t.date ?? TODAY,
    time: t.time ?? null,
    state: t.state ?? 'pending',
    priority: t.priority ?? null,
    order: t.order ?? index,
  }));
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, tasks: full }));
}

function column(date: string): HTMLElement {
  return screen.getByRole('heading', { name: formatDayHeading(date) }).closest('section') as HTMLElement;
}

function drop(activeId: string, overId: string | null) {
  act(() => {
    capturedDndProps?.onDragEnd?.({
      active: { id: activeId },
      over: overId === null ? null : { id: overId },
    } as never);
  });
}

function handleOf(title: string): HTMLElement {
  return screen.getByRole('button', { name: `Arrastar tarefa: ${title}` });
}

function savedTasks(): Task[] {
  return JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}').tasks;
}

describe('WeekView — fiação do arraste (handleDragEnd)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    capturedDndProps = null;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('soltar em outro dia move a tarefa (só a Data), persiste e restaura o foco na alça remontada', () => {
    seed([{ id: 'a', title: 'Alvo', priority: 'high', time: '09:30' }]);
    render(
      <TaskProvider>
        <WeekView />
      </TaskProvider>,
    );

    act(() => handleOf('Alvo').focus());
    drop('a', TOMORROW);

    expect(within(column(TODAY)).queryByText('Alvo')).toBeNull();
    expect(within(column(TOMORROW)).getByText('Alvo')).toBeTruthy();
    expect(savedTasks()[0]).toMatchObject({ id: 'a', date: TOMORROW, priority: 'high', time: '09:30' });
    expect(document.activeElement).toBe(handleOf('Alvo'));
  });

  it('soltar fora de qualquer alvo não muda nada', () => {
    seed([{ id: 'a', title: 'Alvo' }]);
    render(
      <TaskProvider>
        <WeekView />
      </TaskProvider>,
    );

    drop('a', null);

    expect(within(column(TODAY)).getByText('Alvo')).toBeTruthy();
    expect(savedTasks()[0].date).toBe(TODAY);
  });

  it('soltar na própria coluna com a alça em foco não deixa o foco "armado" para roubá-lo depois', () => {
    seed([
      { id: 'a', title: 'Alvo', order: 0 },
      { id: 'b', title: 'Outra', order: 1 },
    ]);
    render(
      <TaskProvider>
        <WeekView />
      </TaskProvider>,
    );

    act(() => handleOf('Alvo').focus());
    drop('a', TODAY);

    // Mudança de tarefas sem relação alguma com o arraste anterior.
    const otherCard = within(column(TODAY)).getByRole('button', { name: /Editar tarefa: Outra/ });
    const indicator = within(otherCard).getByRole('button', { name: 'Pendente' });
    act(() => indicator.focus());
    fireEvent.click(indicator);

    expect(document.activeElement).not.toBe(handleOf('Alvo'));
  });
});

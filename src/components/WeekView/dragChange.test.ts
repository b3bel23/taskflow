import { describe, expect, it, vi } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/core';
import { applyWeekDragChange, resolveWeekDragChange } from './dragChange';
import type { Task } from '../../types';

// Constrói um `DragEndEvent` sintético — `resolveWeekDragChange` só lê
// `active.id`/`over.id`, não precisa de instâncias reais de `Draggable`/
// `Droppable` nem de gesto físico simulado (inviável sob jsdom).
function makeDragEndEvent(overrides: { sourceId?: string; targetId?: string }): DragEndEvent {
  const { sourceId, targetId } = overrides;
  return {
    active: sourceId === undefined ? null : { id: sourceId },
    over: targetId === undefined ? null : { id: targetId },
  } as unknown as DragEndEvent;
}

describe('resolveWeekDragChange', () => {
  it('origem e destino válidos: retorna { id, date } lidos de active.id/over.id', () => {
    const event = makeDragEndEvent({ sourceId: 'task-1', targetId: '2026-09-22' });

    expect(resolveWeekDragChange(event)).toEqual({ id: 'task-1', date: '2026-09-22' });
  });

  it('solto na própria coluna de origem (mesma Data): ainda retorna a mudança — moveTaskToDate decide o no-op', () => {
    const event = makeDragEndEvent({ sourceId: 'task-1', targetId: '2026-09-21' });

    expect(resolveWeekDragChange(event)).toEqual({ id: 'task-1', date: '2026-09-21' });
  });

  it('sem origem identificável (active null): retorna null', () => {
    const event = makeDragEndEvent({ targetId: '2026-09-22' });

    expect(resolveWeekDragChange(event)).toBeNull();
  });

  it('origem válida sem destino (solta fora de toda a grade, over null): retorna null', () => {
    const event = makeDragEndEvent({ sourceId: 'task-1' });

    expect(resolveWeekDragChange(event)).toBeNull();
  });

  it('id de origem ou destino não é string: retorna null em vez de lançar', () => {
    const event = { active: { id: 42 }, over: { id: '2026-09-22' } } as unknown as DragEndEvent;

    expect(resolveWeekDragChange(event)).toBeNull();
  });
});

describe('applyWeekDragChange', () => {
  function makeTask(overrides: Partial<Task> = {}): Task {
    return {
      id: overrides.id ?? 't1',
      title: overrides.title ?? 'Tarefa',
      date: overrides.date ?? '2026-09-21',
      time: overrides.time ?? null,
      state: overrides.state ?? 'pending',
      priority: overrides.priority ?? null,
      order: overrides.order ?? 0,
    };
  }

  it('delega inteiramente a moveTaskToDate, com id/date do change', () => {
    const task = makeTask({ id: 'a', date: '2026-09-22' });
    const moveTaskToDate = vi.fn().mockReturnValue({ ok: true, task });

    const result = applyWeekDragChange({ id: 'a', date: '2026-09-22' }, { moveTaskToDate });

    expect(moveTaskToDate).toHaveBeenCalledWith('a', '2026-09-22');
    expect(moveTaskToDate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, task });
  });

  it('propaga falha de escrita sem lançar', () => {
    const moveTaskToDate = vi.fn().mockReturnValue({ ok: false, error: { message: 'quota exceeded' } });

    const result = applyWeekDragChange({ id: 'a', date: '2026-09-22' }, { moveTaskToDate });

    expect(result).toEqual({ ok: false, error: { message: 'quota exceeded' } });
  });
});

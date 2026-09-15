import { describe, expect, it, vi } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/react';
import { applyWeekDragChange, groupKey, parseGroupKey, resolveWeekDragChange } from './dragChange';
import type { DayOfWeek, Task } from '../../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 't1',
    title: overrides.title ?? 'Tarefa',
    day: overrides.day ?? 'mon',
    state: overrides.state ?? 'pending',
    priority: overrides.priority ?? null,
    order: overrides.order ?? 0,
  };
}

// Constrói um `DragEndEvent` sintético — mesma técnica de
// `DayColumn.test.tsx` (Story 4.1): `move()` (`@dnd-kit/helpers`) e
// `resolveWeekDragChange` só leem `operation.{source,target,canceled}` (mais
// `source.group`/`source.initialGroup`, novidade da 4.2) — não precisa de
// instâncias reais de `Draggable`/`Droppable` (`SortableDraggable`) nem de
// gesto físico simulado, inviável sob jsdom. `source.group`/`initialGroup`
// aqui representam o par que o `OptimisticSortingPlugin` do @dnd-kit mantém
// ao vivo durante o arraste real.
function makeDragEndEvent(overrides: {
  sourceId?: string;
  sourceIndex?: number;
  sourceGroup?: string;
  sourceInitialGroup?: string;
  targetId?: string;
  canceled?: boolean;
}): DragEndEvent {
  const { sourceId, sourceIndex, sourceGroup, sourceInitialGroup, targetId, canceled = false } = overrides;
  return {
    operation: {
      source:
        sourceId === undefined
          ? null
          : { id: sourceId, index: sourceIndex, group: sourceGroup, initialGroup: sourceInitialGroup },
      target: targetId === undefined ? null : { id: targetId },
      canceled,
    },
    canceled,
    nativeEvent: undefined,
    suspend: () => ({ resume: () => {}, abort: () => {} }),
  } as unknown as DragEndEvent;
}

describe('groupKey / parseGroupKey', () => {
  it('codifica e decodifica (day, priority) de ida e volta', () => {
    const days: DayOfWeek[] = ['mon', 'sun'];
    for (const day of days) {
      for (const priority of ['high', 'medium', 'low', null] as const) {
        expect(parseGroupKey(groupKey(day, priority))).toEqual({ day, priority });
      }
    }
  });

  it('ausência de prioridade usa a chave "none", distinta dos níveis nomeados', () => {
    expect(groupKey('tue', null)).toBe('tue::none');
  });
});

describe('resolveWeekDragChange', () => {
  // Mesmo grupo (initialGroup === group): delega à MESMA lógica pura da
  // Story 4.1 — resultado 'reorder', nunca 'move'.
  describe('mesmo grupo (Story 4.1, sem regressão)', () => {
    const groupA = groupKey('mon', 'high');
    const tasks = [
      makeTask({ id: 'a', day: 'mon', priority: 'high', order: 0 }),
      makeTask({ id: 'b', day: 'mon', priority: 'high', order: 1 }),
      makeTask({ id: 'c', day: 'mon', priority: 'high', order: 2 }),
    ];

    it('reordena dentro do grupo: solta "b" na posição 2', () => {
      const event = makeDragEndEvent({
        sourceId: 'b',
        sourceIndex: 2,
        sourceGroup: groupA,
        sourceInitialGroup: groupA,
        targetId: 'c',
      });

      expect(resolveWeekDragChange(tasks, event)).toEqual({ kind: 'reorder', id: 'b', toIndex: 2 });
    });

    it('origem = destino exato (mesma posição): nada a persistir, retorna null', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceIndex: 0,
        sourceGroup: groupA,
        sourceInitialGroup: groupA,
        targetId: 'a',
      });

      expect(resolveWeekDragChange(tasks, event)).toBeNull();
    });

    it('grupo com 1 tarefa: soltar sobre si mesma não move nada, retorna null', () => {
      const single = [makeTask({ id: 'only', day: 'mon', priority: 'high' })];
      const event = makeDragEndEvent({
        sourceId: 'only',
        sourceIndex: 0,
        sourceGroup: groupA,
        sourceInitialGroup: groupA,
        targetId: 'only',
      });

      expect(resolveWeekDragChange(single, event)).toBeNull();
    });
  });

  // Grupo diferente: cruzou Prioridade e/ou Dia — resultado 'move', nunca
  // 'reorder'. A chamadora (`WeekView`) é quem decide chamar `updateTask` com
  // uma ÚNICA chamada cobrindo Dia+Prioridade juntos (nunca dois passos).
  describe('grupo diferente (cruzamento, Story 4.2)', () => {
    it('mudar só a Prioridade (mesmo dia): "move" com o novo priority, dia preservado', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('mon', 'low'),
        sourceInitialGroup: groupKey('mon', 'high'),
        targetId: 'placeholder',
      });

      expect(resolveWeekDragChange([], event)).toEqual({ kind: 'move', id: 'a', day: 'mon', priority: 'low' });
    });

    it('mudar só o Dia (mesma faixa de Prioridade): "move" com o novo day, prioridade preservada', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('fri', 'medium'),
        sourceInitialGroup: groupKey('mon', 'medium'),
        targetId: 'placeholder',
      });

      expect(resolveWeekDragChange([], event)).toEqual({ kind: 'move', id: 'a', day: 'fri', priority: 'medium' });
    });

    it('mudar Dia E Prioridade juntos: "move" único com os dois novos valores', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('wed', 'low'),
        sourceInitialGroup: groupKey('mon', 'high'),
        targetId: 'placeholder',
      });

      expect(resolveWeekDragChange([], event)).toEqual({ kind: 'move', id: 'a', day: 'wed', priority: 'low' });
    });

    it('destino é uma zona de Prioridade sem nenhuma tarefa: "move" funciona igual (a zona sempre existe)', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('sun', 'high'),
        sourceInitialGroup: groupKey('mon', null),
        targetId: 'empty:sun::high',
      });

      expect(resolveWeekDragChange([], event)).toEqual({ kind: 'move', id: 'a', day: 'sun', priority: 'high' });
    });

    it('destino sem Prioridade nenhuma ("Sem prioridade"): "move" com priority null', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('tue', null),
        sourceInitialGroup: groupKey('mon', 'high'),
        targetId: 'placeholder',
      });

      expect(resolveWeekDragChange([], event)).toEqual({ kind: 'move', id: 'a', day: 'tue', priority: null });
    });
  });

  describe('casos sem mudança/identificáveis', () => {
    it('cancelado (Esc): retorna null, nada a persistir', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('mon', 'high'),
        sourceInitialGroup: groupKey('mon', 'high'),
        targetId: 'a',
        canceled: true,
      });

      expect(resolveWeekDragChange([], event)).toBeNull();
    });

    it('sem origem identificável (solta fora de qualquer alvo): retorna null', () => {
      const event = makeDragEndEvent({});

      expect(resolveWeekDragChange([], event)).toBeNull();
    });

    // Revisão da Story 4.2 (blind-hunter): origem válida, mas sem destino —
    // ex. solta fora de toda a grade da semana depois de ter sobrevoado uma
    // zona válida. `source.group` poderia continuar refletindo o último
    // grupo sobrevoado; o guard de `target` ausente (adicionado na revisão)
    // impede que isso seja tratado como um cruzamento de grupo válido.
    it('origem válida sem destino (solta fora de toda a grade): retorna null mesmo com group/initialGroup diferentes', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('wed', 'low'),
        sourceInitialGroup: groupKey('mon', 'high'),
      });

      expect(resolveWeekDragChange([], event)).toBeNull();
    });

    it('origem sem group/initialGroup (não-sortable): retorna null em vez de lançar', () => {
      const event = {
        operation: { source: { id: 'a' }, target: { id: 'b' }, canceled: false },
        canceled: false,
      } as unknown as DragEndEvent;

      expect(resolveWeekDragChange([], event)).toBeNull();
    });
  });
});

// Revisão da Story 4.2 (achado confirmado por 2 lentes — blind-hunter e
// verification-gap): antes desta extração, a decisão "mesmo grupo ->
// reorderTask, cruzou grupo -> updateTask com título/Estado preservados"
// vivia inteira dentro do `handleDragEnd` de `WeekView.tsx`, não exportada,
// sem nenhum teste direto verificando qual ação é chamada, com quais
// argumentos. `applyWeekDragChange` isola exatamente essa decisão — testável
// com `reorderTask`/`updateTask` mockados (`vi.fn()`), sem precisar de nenhum
// gesto físico de arraste nem de `@dnd-kit` de verdade.
describe('applyWeekDragChange', () => {
  function makeTask(overrides: Partial<Task> = {}): Task {
    return {
      id: overrides.id ?? 't1',
      title: overrides.title ?? 'Tarefa',
      day: overrides.day ?? 'mon',
      state: overrides.state ?? 'pending',
      priority: overrides.priority ?? null,
      order: overrides.order ?? 0,
    };
  }

  it('mesmo grupo (kind: reorder): chama reorderTask com id/toIndex, nunca updateTask', () => {
    const reorderTask = vi.fn().mockReturnValue({ ok: true, task: makeTask() });
    const updateTask = vi.fn();

    const result = applyWeekDragChange({ kind: 'reorder', id: 'a', toIndex: 2 }, [], { reorderTask, updateTask });

    expect(reorderTask).toHaveBeenCalledWith('a', 2);
    expect(updateTask).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, task: expect.anything() });
  });

  it('cruzamento de grupo (kind: move): uma única chamada a updateTask, título/Estado preservados, nunca reorderTask', () => {
    const task = makeTask({ id: 'a', title: 'Revisar PR', day: 'mon', priority: 'high', state: 'in_progress' });
    const reorderTask = vi.fn();
    const updateTask = vi.fn().mockReturnValue({ ok: true, task });

    const result = applyWeekDragChange({ kind: 'move', id: 'a', day: 'fri', priority: 'low' }, [task], {
      reorderTask,
      updateTask,
    });

    expect(updateTask).toHaveBeenCalledTimes(1);
    expect(updateTask).toHaveBeenCalledWith({
      id: 'a',
      title: 'Revisar PR',
      day: 'fri',
      priority: 'low',
      state: 'in_progress',
    });
    expect(reorderTask).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, task });
  });

  it('cruzamento de grupo: id não encontrado em tasks, retorna null sem chamar nenhuma ação', () => {
    const reorderTask = vi.fn();
    const updateTask = vi.fn();

    const result = applyWeekDragChange({ kind: 'move', id: 'inexistente', day: 'fri', priority: null }, [], {
      reorderTask,
      updateTask,
    });

    expect(result).toBeNull();
    expect(reorderTask).not.toHaveBeenCalled();
    expect(updateTask).not.toHaveBeenCalled();
  });

  it('cruzamento de grupo com falha de escrita: devolve o {ok:false} de updateTask, sem lançar', () => {
    const task = makeTask({ id: 'a' });
    const updateTask = vi.fn().mockReturnValue({ ok: false, error: { message: 'quota exceeded' } });

    const result = applyWeekDragChange(
      { kind: 'move', id: 'a', day: 'fri', priority: 'low' },
      [task],
      { reorderTask: vi.fn(), updateTask },
    );

    expect(result).toEqual({ ok: false, error: { message: 'quota exceeded' } });
  });
});

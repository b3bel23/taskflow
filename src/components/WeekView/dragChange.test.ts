import { describe, expect, it, vi } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/core';
import { applyWeekDragChange, groupKey, parseGroupKey, resolveWeekDragChange } from './dragChange';
import type { Task } from '../../types';

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

// Constrói um `DragEndEvent` sintético — mesma técnica de
// `DayColumn.test.tsx` (Story 4.1): `resolveWeekDragChange` só lê
// `active`/`over` (mais `.data.current.group`, novidade da 4.2 — migração
// Epic 4 retro item 11 pro `@dnd-kit/core`+`@dnd-kit/sortable`: `group` não
// é mais atualizado ao vivo no `source` durante o gesto, é lido de
// `active`/`over` no momento do soltar — ver comentário de `dragChange.ts`)
// — não precisa de instâncias reais de `Draggable`/`Droppable` nem de gesto
// físico simulado, inviável sob jsdom.
function makeDragEndEvent(overrides: {
  sourceId?: string;
  sourceGroup?: string;
  targetId?: string;
  targetGroup?: string;
}): DragEndEvent {
  const { sourceId, sourceGroup, targetId, targetGroup } = overrides;
  return {
    active:
      sourceId === undefined
        ? null
        : { id: sourceId, data: { current: sourceGroup === undefined ? undefined : { group: sourceGroup } } },
    over:
      targetId === undefined
        ? null
        : { id: targetId, data: { current: targetGroup === undefined ? undefined : { group: targetGroup } } },
  } as unknown as DragEndEvent;
}

describe('groupKey / parseGroupKey', () => {
  it('codifica e decodifica (date, priority) de ida e volta', () => {
    const dates = ['2026-09-21', '2026-09-20'];
    for (const date of dates) {
      for (const priority of ['high', 'medium', 'low', null] as const) {
        expect(parseGroupKey(groupKey(date, priority))).toEqual({ date, priority });
      }
    }
  });

  it('ausência de prioridade usa a chave "none", distinta dos níveis nomeados', () => {
    expect(groupKey('2026-09-22', null)).toBe('2026-09-22::none');
  });
});

describe('resolveWeekDragChange', () => {
  // Mesmo grupo (initialGroup === group): delega à MESMA lógica pura da
  // Story 4.1 — resultado 'reorder', nunca 'move'.
  describe('mesmo grupo (Story 4.1, sem regressão)', () => {
    const groupA = groupKey('2026-09-21', 'high');
    const tasks = [
      makeTask({ id: 'a', date: '2026-09-21', priority: 'high', order: 0 }),
      makeTask({ id: 'b', date: '2026-09-21', priority: 'high', order: 1 }),
      makeTask({ id: 'c', date: '2026-09-21', priority: 'high', order: 2 }),
    ];

    it('reordena dentro do grupo: solta "b" na posição 2', () => {
      const event = makeDragEndEvent({
        sourceId: 'b',
        sourceGroup: groupA,
        targetId: 'c',
        targetGroup: groupA,
      });

      expect(resolveWeekDragChange(tasks, event)).toEqual({ kind: 'reorder', id: 'b', toIndex: 2 });
    });

    it('origem = destino exato (mesma posição): nada a persistir, retorna null', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupA,
        targetId: 'a',
        targetGroup: groupA,
      });

      expect(resolveWeekDragChange(tasks, event)).toBeNull();
    });

    it('grupo com 1 tarefa: soltar sobre si mesma não move nada, retorna null', () => {
      const single = [makeTask({ id: 'only', date: '2026-09-21', priority: 'high' })];
      const event = makeDragEndEvent({
        sourceId: 'only',
        sourceGroup: groupA,
        targetId: 'only',
        targetGroup: groupA,
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
        sourceGroup: groupKey('2026-09-21', 'high'),
        targetId: 'placeholder',
        targetGroup: groupKey('2026-09-21', 'low'),
      });

      expect(resolveWeekDragChange([], event)).toEqual({ kind: 'move', id: 'a', date: '2026-09-21', priority: 'low' });
    });

    it('mudar só o Dia (mesma faixa de Prioridade): "move" com a nova date, prioridade preservada', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('2026-09-21', 'medium'),
        targetId: 'placeholder',
        targetGroup: groupKey('2026-09-18', 'medium'),
      });

      expect(resolveWeekDragChange([], event)).toEqual({ kind: 'move', id: 'a', date: '2026-09-18', priority: 'medium' });
    });

    it('mudar Dia E Prioridade juntos: "move" único com os dois novos valores', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('2026-09-21', 'high'),
        targetId: 'placeholder',
        targetGroup: groupKey('2026-09-23', 'low'),
      });

      expect(resolveWeekDragChange([], event)).toEqual({ kind: 'move', id: 'a', date: '2026-09-23', priority: 'low' });
    });

    it('destino é uma zona de Prioridade sem nenhuma tarefa: "move" funciona igual (a zona sempre existe)', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('2026-09-21', null),
        targetId: 'empty:sun::high',
        targetGroup: groupKey('2026-09-20', 'high'),
      });

      expect(resolveWeekDragChange([], event)).toEqual({ kind: 'move', id: 'a', date: '2026-09-20', priority: 'high' });
    });

    it('destino sem Prioridade nenhuma ("Sem prioridade"): "move" com priority null', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('2026-09-21', 'high'),
        targetId: 'placeholder',
        targetGroup: groupKey('2026-09-22', null),
      });

      expect(resolveWeekDragChange([], event)).toEqual({ kind: 'move', id: 'a', date: '2026-09-22', priority: null });
    });
  });

  describe('casos sem mudança/identificáveis', () => {
    // Cancelamento (Esc): no `@dnd-kit/core` (migração Epic 4 retro item 11),
    // um arraste cancelado nunca chega a `onDragEnd` — dispara `onDragCancel`,
    // um callback estruturalmente separado, que `WeekView` não liga a
    // `handleDragEnd`. Não há mais um `DragEndEvent` "cancelado" possível de
    // testar aqui (diferente da versão anterior, `@dnd-kit/react`, cujo
    // `DragEndEvent` carregava `canceled` no próprio evento) — por isso este
    // teste foi removido em vez de adaptado.

    it('sem origem identificável (solta fora de qualquer alvo): retorna null', () => {
      const event = makeDragEndEvent({});

      expect(resolveWeekDragChange([], event)).toBeNull();
    });

    // Revisão da Story 4.2 (blind-hunter): origem válida, mas sem destino —
    // ex. solta fora de toda a grade da semana. `event.over` é `null` nesse
    // caso (contrato do `@dnd-kit/core`) — o guard de `over` ausente impede
    // que isso seja tratado como qualquer tipo de mudança válida.
    it('origem válida sem destino (solta fora de toda a grade): retorna null', () => {
      const event = makeDragEndEvent({
        sourceId: 'a',
        sourceGroup: groupKey('2026-09-21', 'high'),
      });

      expect(resolveWeekDragChange([], event)).toBeNull();
    });

    it('origem sem group (não-sortable): retorna null em vez de lançar', () => {
      const event = {
        active: { id: 'a', data: { current: undefined } },
        over: { id: 'b', data: { current: undefined } },
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
      date: overrides.date ?? '2026-09-21',
      time: overrides.time ?? null,
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
    const task = makeTask({ id: 'a', title: 'Revisar PR', date: '2026-09-21', priority: 'high', state: 'in_progress' });
    const reorderTask = vi.fn();
    const updateTask = vi.fn().mockReturnValue({ ok: true, task });

    const result = applyWeekDragChange({ kind: 'move', id: 'a', date: '2026-09-18', priority: 'low' }, [task], {
      reorderTask,
      updateTask,
    });

    expect(updateTask).toHaveBeenCalledTimes(1);
    expect(updateTask).toHaveBeenCalledWith({
      id: 'a',
      title: 'Revisar PR',
      date: '2026-09-18',
      priority: 'low',
      state: 'in_progress',
    });
    expect(reorderTask).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, task });
  });

  it('cruzamento de grupo: id não encontrado em tasks, retorna null sem chamar nenhuma ação', () => {
    const reorderTask = vi.fn();
    const updateTask = vi.fn();

    const result = applyWeekDragChange({ kind: 'move', id: 'inexistente', date: '2026-09-18', priority: null }, [], {
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
      { kind: 'move', id: 'a', date: '2026-09-18', priority: 'low' },
      [task],
      { reorderTask: vi.fn(), updateTask },
    );

    expect(result).toEqual({ ok: false, error: { message: 'quota exceeded' } });
  });
});

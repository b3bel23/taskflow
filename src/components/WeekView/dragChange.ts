import type { DragEndEvent } from '@dnd-kit/core';
import type { TaskActionResult } from '../../state/useTaskActions';

// Story 4.2 revisada (Epic 4, 2026-09-18): o arraste passa a fazer UMA ÚNICA
// coisa — mover a Tarefa para a coluna de outro Dia (`date`). Não há mais
// zonas de Prioridade como alvo de drop (`PriorityZone`/
// `EmptyZoneDropTarget` removidas, AD-7 obsoleto) nem reordenação manual
// dentro do dia (Story 4.1 "[REMOVIDA 2026-09-18]") — cada `DayColumn`
// INTEIRA é o único alvo soltável da semana, registrada com `id` = a própria
// `date` ISO da coluna (`useDroppable`, ver `DayColumn.tsx`). Por isso não há
// mais distinção "mesmo grupo" vs. "grupo diferente": todo drop bem-sucedido
// é a mesma mudança (`{ id, date }`), e `moveTaskToDate`
// (`useTaskActions`) já é um no-op quando a Data não muda de verdade.
export interface WeekDragChange {
  id: string;
  date: string;
}

// Formato mínimo lido de `event.active`/`event.over` — lido estruturalmente
// (não via tipos concretos do `@dnd-kit/core`) pelo motivo de sempre: um
// `DragEndEvent` sintético em teste não precisa de instâncias reais de
// `Draggable`/`Droppable` — simular um gesto físico de arraste não é viável
// sob jsdom.
interface DragEndPointLike {
  id: unknown;
}

// Soltar fora de qualquer alvo válido (`event.over === null`, contrato do
// `@dnd-kit/core`) ou sem uma origem identificável é sempre um no-op —
// `null`, nunca lança.
export function resolveWeekDragChange(event: DragEndEvent): WeekDragChange | null {
  const active = event.active as DragEndPointLike | null;
  const over = event.over as DragEndPointLike | null;
  if (!active || !over) {
    return null;
  }

  const id = active.id;
  const date = over.id;
  if (typeof id !== 'string' || typeof date !== 'string') {
    return null;
  }

  return { id, date };
}

export interface WeekDragActions {
  moveTaskToDate: (id: string, date: string) => TaskActionResult;
}

// Fina camada de aplicação — existe para `WeekView.handleDragEnd` permanecer
// testável (`moveTaskToDate` mockado, `vi.fn()`) sem precisar de nenhum
// gesto físico de arraste nem de `@dnd-kit` de verdade.
export function applyWeekDragChange(change: WeekDragChange, actions: WeekDragActions): TaskActionResult {
  return actions.moveTaskToDate(change.id, change.date);
}

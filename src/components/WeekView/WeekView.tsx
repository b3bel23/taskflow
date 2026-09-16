import { useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { DAYS_OF_WEEK, getTodayDayOfWeek } from '../../constants/days';
import { sortTasksInDay } from '../../state/selectors';
import { useTaskContext } from '../../state/TaskContext';
import { useTaskActions } from '../../state/useTaskActions';
import { DayColumn } from '../DayColumn/DayColumn';
import { applyWeekDragChange, resolveWeekDragChange } from './dragChange';
import { getDragHandle, isDragHandleFocused } from './dragHandleRegistry';
import styles from './WeekView.module.css';

// Grade das 7 Colunas do Dia, Segunda->Domingo, todas simultâneas, sem
// navegação. Lê `TaskContext` e entrega a cada `DayColumn` só as tarefas do
// seu próprio dia, já ordenadas por prioridade (`sortTasksInDay`, AD-7) —
// `DayColumn` só renderiza o que recebe, nunca filtra/ordena por conta
// própria.
//
// Story 4.2 (Epic 4): único `<DndContext>` para a semana inteira —
// substitui os providers isolados por grupo `(day,priority)` da Story 4.1
// (um por `TaskPriorityGroup` dentro de cada `DayColumn`). Isso é o que
// permite um arraste alcançar QUALQUER zona de Prioridade de QUALQUER dia:
// as 28 zonas (7 dias x 4 níveis) agora compartilham a mesma instância de
// contexto, então cruzar grupo é só uma colisão normal contra outro alvo
// soltável registrado nele — nunca estruturalmente impossível como na 4.1.
// `resolveWeekDragChange` (`./dragChange`) decide se o `DragEndEvent`
// resultante ficou no mesmo grupo (delega a `reorderTask`, MESMA função da
// 4.1, comportamento intocado) ou cruzou grupo (Dia e/ou Prioridade mudaram
// juntos, sempre numa ÚNICA chamada a `updateTask` — a mesma função que o
// Modal usa, nunca uma função de ação nova).
//
// Migração Epic 4 retro item 11: `@dnd-kit/core`+`@dnd-kit/sortable`
// (pacotes clássicos/estáveis) no lugar de `@dnd-kit/react`+`@dnd-kit/dom`
// (pre-1.0) — decisão registrada em
// `_bmad-output/implementation-artifacts/epic-4-item-11-investigation-2026-09-16.md`.
// `sortableKeyboardCoordinates` (`@dnd-kit/sortable`) não é limitado ao
// grupo atual: considera TODOS os alvos soltáveis registrados, filtrados por
// direção — é isso que permite a seta do teclado alcançar a zona de
// Prioridade/Dia vizinha, não só reordenar dentro do mesmo `<ul>`. Sem
// `<DragOverlay>` (decisão consciente, "menor migração possível" + só decide
// grupo no soltar — ver comentário de `dragChange.ts`): o próprio Card
// arrastado recebe o `transform` do `useSortable` e flutua no lugar (visual
// de sombra+rotação já vinha de `.dragging` em `TaskCard.module.css`, via
// `isDragging` — nenhuma mutação imperativa de DOM em nenhum dos dois casos,
// só CSS transform).
export function WeekView() {
  const { state } = useTaskContext();
  const { reorderTask, updateTask } = useTaskActions();
  const today = getTodayDayOfWeek();

  // Foco pós-cruzamento de grupo (Boundaries "Foco", Story 4.2): a tarefa
  // movida sai da lista de uma zona/`DayColumn` e entra em outra — o React
  // desmonta o nó DOM antigo da alça e monta um novo (possivelmente numa
  // instância de `DayColumn` diferente, outro dia). Se essa alça tinha o
  // foco no instante do drop (arraste por teclado), o desmonte derruba o
  // foco para `<body>` antes do próximo render aplicar o nó novo. Este ref
  // só guarda o id quando a alça movida de fato tinha o foco — nunca no caso
  // de mouse sem foco nela — e o efeito abaixo, disparado pela mudança de
  // `state.tasks` que a própria ação (`reorderTask`/`updateTask`) provoca,
  // decide o foco só depois que o React já commitou o próximo render (mesmo
  // padrão do efeito pós-render de `DayColumn.tsx`, retro Epic 2 achado 1).
  const focusRestoreTaskIdRef = useRef<string | null>(null);

  // Sensor de ponteiro (mouse/touch) + sensor de teclado com o mesmo
  // detector de colisão do resto da lib (`closestCenter`, padrão oficial
  // para listas sortable) — AD-6 ("sensor de teclado é a mesma lógica usada
  // pelo mouse") continua valendo: os dois passam pelo mesmo `onDragEnd`.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const change = resolveWeekDragChange(state.tasks, event);
      if (!change) {
        return;
      }

      // A checagem de foco acontece ANTES de chamar a ação — nesse instante
      // nada ainda foi desmontado (mesmo raciocínio de timing da retro Epic
      // 2, achado 1: nunca checar depois que uma mutação já foi disparada).
      // Só interessa no caminho de cruzamento de grupo (`move`): mesmo grupo
      // (`reorder`, Story 4.1) nunca desmonta a alça, o nó DOM é reordenado
      // no lugar.
      const wasHandleFocused = change.kind === 'move' && isDragHandleFocused(change.id);

      const result = applyWeekDragChange(change, state.tasks, { reorderTask, updateTask });

      // Revisão da Story 4.2 (blind-hunter/edge-case-hunter): só agenda a
      // restauração de foco quando a ação de fato confirmou sucesso
      // (`result?.ok`) — nunca antes de saber isso. Numa falha de escrita
      // (guard AD-4: `updateTask` não muda `state.tasks`, o efeito abaixo
      // nem chega a rodar de novo por essa causa), nada é agendado, então
      // não sobra nenhuma referência obsoleta esperando a próxima mudança
      // não relacionada de `state.tasks` para "roubar" o foco de volta.
      if (wasHandleFocused && result?.ok) {
        focusRestoreTaskIdRef.current = change.id;
      }
    },
    [state.tasks, reorderTask, updateTask],
  );

  useEffect(() => {
    const taskId = focusRestoreTaskIdRef.current;
    if (!taskId) {
      return;
    }
    focusRestoreTaskIdRef.current = null;
    // Fallback seguro se a alça remontada não for encontrada: `?.focus()`
    // simplesmente não faz nada, nunca lança nem força o foco para outro
    // lugar arbitrário.
    getDragHandle(taskId)?.focus();
  }, [state.tasks]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <main className={styles.grid}>
        {DAYS_OF_WEEK.map((day) => (
          <DayColumn key={day} day={day} isToday={day === today} tasks={sortTasksInDay(state.tasks, day)} />
        ))}
      </main>
    </DndContext>
  );
}

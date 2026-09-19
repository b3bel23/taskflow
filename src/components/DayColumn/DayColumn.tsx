import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../types';
import { formatDayHeading } from '../../constants/week';
import { useTaskActions } from '../../state/useTaskActions';
import { registerDragHandle } from '../WeekView/dragHandleRegistry';
import { TaskCard } from '../TaskCard/TaskCard';
import { TaskModal } from '../TaskModal/TaskModal';
import styles from './DayColumn.module.css';

export interface DayColumnProps {
  date: string;
  isToday: boolean;
  tasks: Task[];
}

interface DraggableTaskItemProps {
  task: Task;
  onOpenEdit: (event: MouseEvent<HTMLButtonElement>) => void;
  onCycleState: () => void;
  onCyclePriority: () => void;
}

// Um Card arrastável (`useDraggable`, `@dnd-kit/core`) por tarefa. Story 4.2
// revisada (Epic 4, 2026-09-18): não é mais `useSortable`/parte de uma
// `SortableContext` — não existe mais reordenação manual dentro do dia
// (Story 4.1 "[REMOVIDA 2026-09-18]", AD-7 obsoleto); a posição de cada Card
// na lista é sempre derivada de `sortTasksInDay` (Horário, Story 6.2), nunca
// de um gesto de arraste. `setActivatorNodeRef`+`attributes`+`listeners` vão
// só na alça dedicada dentro do `TaskCard` (via `dragHandleProps`) — é isso
// que faz o sensor de ponteiro/teclado ligar só nela, nunca no Card/
// Indicadores. `registerDragHandle` alimenta o registro module-scope que
// `WeekView` usa para restaurar o foco na alça remontada depois de mover
// para outro dia.
function DraggableTaskItem({ task, onOpenEdit, onCycleState, onCyclePriority }: DraggableTaskItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const combinedHandleRef = useCallback(
    (element: Element | null) => {
      setActivatorNodeRef(element as HTMLElement | null);
      registerDragHandle(task.id, element);
    },
    [setActivatorNodeRef, task.id],
  );

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <li ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onClick={onOpenEdit}
        onCycleState={onCycleState}
        onCyclePriority={onCyclePriority}
        dragHandleRef={combinedHandleRef}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </li>
  );
}

// Coluna do Dia: renderiza as tarefas reais (já filtradas+ordenadas por
// `WeekView` via `sortTasksInDay`, Horário — Story 6.2) ou "Nenhuma tarefa"
// quando vazia. "+ Adicionar tarefa" abre o `TaskModal` em criação; clicar
// num `TaskCard` (Story 2.2) abre o mesmo `TaskModal` em edição,
// pré-preenchido.
//
// Story 4.2 revisada (Epic 4, 2026-09-18): a coluna INTEIRA é o único alvo
// soltável (`useDroppable`, `id`/`data.date` = a própria `date` ISO) — não
// há mais zonas de Prioridade (`PriorityZone`/`EmptyZoneDropTarget`
// removidas, AD-7 obsoleto, junto com as 4 faixas fixas por dia da Story
// 4.2 original). Soltar em qualquer lugar da coluna só muda a Data da
// tarefa (`useTaskActions.moveTaskToDate`), nunca a Prioridade nem a posição
// dentro do dia — Prioridade agora só muda por clique na própria
// `PriorityTag` do Card (Story 7.2, `cyclePriority`).
export function DayColumn({ date, isToday, tasks }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: date, data: { date } });
  const columnClassName = [styles.column, isToday && styles.today, isOver && styles.dropActive]
    .filter(Boolean)
    .join(' ');
  const labelId = `day-label-${date}`;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedCardRef = useRef<HTMLButtonElement | null>(null);
  const { cycleState, cyclePriority } = useTaskActions();

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    addButtonRef.current?.focus();
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingTask(null);
  }, []);

  const handleOpenEdit = useCallback(
    (task: Task) => (event: MouseEvent<HTMLButtonElement>) => {
      lastFocusedCardRef.current = event.currentTarget;
      setEditingTask(task);
    },
    [],
  );

  // Retrospectiva Epic 2 (achado 1): a checagem `.isConnected` não pode
  // rodar dentro do próprio `closeEditModal` — nesse instante `onClose()`
  // ainda está no meio do mesmo handler que disparou `setEditingTask(null)`,
  // então o React ainda não comitou o re-render. Este efeito só decide o
  // foco depois que o React já aplicou esse re-render.
  const wasEditingRef = useRef(false);
  useEffect(() => {
    if (editingTask) {
      wasEditingRef.current = true;
      return;
    }
    if (!wasEditingRef.current) {
      return;
    }
    wasEditingRef.current = false;
    if (lastFocusedCardRef.current?.isConnected) {
      lastFocusedCardRef.current.focus();
    } else {
      addButtonRef.current?.focus();
    }
  }, [editingTask]);

  return (
    <section
      ref={setNodeRef}
      className={columnClassName}
      data-today={isToday}
      aria-current={isToday ? 'date' : undefined}
      aria-labelledby={labelId}
    >
      <h2 id={labelId} className={styles.dayLabel}>
        {formatDayHeading(date)}
      </h2>
      {tasks.length === 0 && <p className={styles.emptyState}>Nenhuma tarefa</p>}
      <ul className={styles.taskList}>
        {tasks.map((task) => (
          <DraggableTaskItem
            key={task.id}
            task={task}
            onOpenEdit={handleOpenEdit(task)}
            onCycleState={() => cycleState(task.id)}
            onCyclePriority={() => cyclePriority(task.id)}
          />
        ))}
      </ul>
      <button
        type="button"
        ref={addButtonRef}
        className={styles.addTaskButton}
        onClick={() => setIsAddModalOpen(true)}
      >
        + Adicionar tarefa
      </button>
      {isAddModalOpen && <TaskModal date={date} onClose={closeAddModal} />}
      {editingTask && <TaskModal key={editingTask.id} date={date} task={editingTask} onClose={closeEditModal} />}
    </section>
  );
}

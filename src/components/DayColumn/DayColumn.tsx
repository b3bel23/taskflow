import { useCallback, useEffect, useRef, useState } from 'react';
import type { DayOfWeek, Task } from '../../types';
import { DAY_LABELS } from '../../constants/days';
import { TaskCard } from '../TaskCard/TaskCard';
import { TaskModal } from '../TaskModal/TaskModal';
import styles from './DayColumn.module.css';

export interface DayColumnProps {
  day: DayOfWeek;
  isToday: boolean;
  tasks: Task[];
}

// Coluna do Dia: renderiza as tarefas reais (já filtradas+ordenadas por
// `WeekView` via `sortTasksInDay`) ou "Nenhuma tarefa" quando vazia.
// "+ Adicionar tarefa" abre o `TaskModal` em criação; clicar num `TaskCard`
// (Story 2.2) abre o mesmo `TaskModal` em edição, pré-preenchido. Em ambos
// os casos, `Esc`/sucesso fecham o modal e devolvem o foco ao controle que
// abriu (o botão "+ Adicionar tarefa" ou o próprio Card clicado).
export function DayColumn({ day, isToday, tasks }: DayColumnProps) {
  const columnClassName = isToday ? `${styles.column} ${styles.today}` : styles.column;
  const labelId = `day-label-${day}`;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedCardRef = useRef<HTMLButtonElement | null>(null);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    addButtonRef.current?.focus();
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingTask(null);
  }, []);

  // Retrospectiva Epic 2 (achado 1): a checagem `.isConnected` não pode
  // rodar dentro do próprio `closeEditModal` — nesse instante `onClose()`
  // ainda está no meio do mesmo handler que disparou `setEditingTask(null)`,
  // então o React ainda não comitou o re-render (o `<button>` do Card antigo
  // ainda está conectado mesmo quando a edição mudou o Dia da tarefa ou a
  // excluiu, casos em que ele está prestes a ser desmontado). Este efeito só
  // decide o foco depois que o React já aplicou esse re-render — reage à
  // transição `editingTask` de "aberto" para `null`, quando o DOM já reflete
  // a lista de tarefas atualizada desta coluna.
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
      className={columnClassName}
      data-today={isToday}
      aria-current={isToday ? 'date' : undefined}
      aria-labelledby={labelId}
    >
      <h2 id={labelId} className={styles.dayLabel}>
        {DAY_LABELS[day]}
      </h2>
      {tasks.length === 0 ? (
        <p className={styles.emptyState}>Nenhuma tarefa</p>
      ) : (
        <ul className={styles.taskList}>
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onClick={(event) => {
                  lastFocusedCardRef.current = event.currentTarget;
                  setEditingTask(task);
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        ref={addButtonRef}
        className={styles.addTaskButton}
        onClick={() => setIsAddModalOpen(true)}
      >
        + Adicionar tarefa
      </button>
      {isAddModalOpen && <TaskModal day={day} onClose={closeAddModal} />}
      {editingTask && <TaskModal key={editingTask.id} day={day} task={editingTask} onClose={closeEditModal} />}
    </section>
  );
}

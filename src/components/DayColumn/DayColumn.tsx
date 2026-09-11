import { useCallback, useRef, useState } from 'react';
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
// `WeekView` via `sortTasksInDay`) ou "Nenhuma tarefa" quando vazia. "+
// Adicionar tarefa" abre o `TaskModal` (só criação nesta história); `Esc`/
// sucesso na criação fecham o modal e devolvem o foco a este mesmo botão.
export function DayColumn({ day, isToday, tasks }: DayColumnProps) {
  const columnClassName = isToday ? `${styles.column} ${styles.today}` : styles.column;
  const labelId = `day-label-${day}`;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    addButtonRef.current?.focus();
  }, []);

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
              <TaskCard task={task} />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        ref={addButtonRef}
        className={styles.addTaskButton}
        onClick={() => setIsModalOpen(true)}
      >
        + Adicionar tarefa
      </button>
      {isModalOpen && <TaskModal day={day} onClose={closeModal} />}
    </section>
  );
}

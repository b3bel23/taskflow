import type { DayOfWeek } from '../../types';
import { DAY_LABELS } from '../../constants/days';
import styles from './DayColumn.module.css';

export interface DayColumnProps {
  day: DayOfWeek;
  isToday: boolean;
}

// Estado vazio da Coluna do Dia. Sem dado real de tarefa e sem modal
// funcional ainda (Epic 2) — "+ Adicionar tarefa" é visível mas inerte.
export function DayColumn({ day, isToday }: DayColumnProps) {
  const columnClassName = isToday ? `${styles.column} ${styles.today}` : styles.column;

  const labelId = `day-label-${day}`;

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
      <p className={styles.emptyState}>Nenhuma tarefa</p>
      {/* Intencionalmente não-funcional: o Modal de Tarefa (Epic 2) é
          quem liga este botão a uma ação real. */}
      <button type="button" className={styles.addTaskButton}>
        + Adicionar tarefa
      </button>
    </section>
  );
}

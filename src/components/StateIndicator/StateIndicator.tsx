import type { TaskState } from '../../types';
import styles from './StateIndicator.module.css';

export interface StateIndicatorProps {
  state: TaskState;
}

const STATE_LABELS: Record<TaskState, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluída',
};

const STATE_CLASS: Record<TaskState, string> = {
  pending: styles.pending,
  in_progress: styles.inProgress,
  done: styles.done,
};

// Indicador de Estado (DESIGN.md `state-indicator`): renderiza os 3 estados
// mesmo só `'pending'` ser alcançável nesta história (só a criação existe) —
// fiel ao tipo completo de `TaskState`. Sem `onClick`: o ciclo por clique no
// indicador é Epic 3, não antecipado aqui.
export function StateIndicator({ state }: StateIndicatorProps) {
  return (
    <span
      className={`${styles.indicator} ${STATE_CLASS[state]}`}
      role="img"
      aria-label={STATE_LABELS[state]}
    />
  );
}

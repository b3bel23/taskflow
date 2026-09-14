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

// Indicador de Estado (DESIGN.md `state-indicator`): renderiza os 3 estados,
// fiel ao tipo completo de `TaskState`. A partir da Story 2.2, `TaskCard`
// inteiro é clicável (abre edição) — este `onClick` só existe para chamar
// `stopPropagation()` e impedir que o clique aqui abra o modal também; sem
// nenhum efeito próprio (nem ciclo de Estado, nem mudança visual). O ciclo
// por clique no indicador em si é Epic 3, não antecipado aqui.
export function StateIndicator({ state }: StateIndicatorProps) {
  return (
    <span
      className={`${styles.indicator} ${STATE_CLASS[state]}`}
      role="img"
      aria-label={STATE_LABELS[state]}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

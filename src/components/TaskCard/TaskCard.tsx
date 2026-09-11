import type { Task } from '../../types';
import { PriorityTag } from '../PriorityTag/PriorityTag';
import { StateIndicator } from '../StateIndicator/StateIndicator';
import styles from './TaskCard.module.css';

export interface TaskCardProps {
  task: Task;
}

// Card de Tarefa (DESIGN.md `task-card`): compõe `StateIndicator` +
// `PriorityTag` (quando definida) + nome. Sem `onClick` — abrir edição ao
// clicar no card é Story 2.2, não antecipado aqui.
export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <StateIndicator state={task.state} />
        <PriorityTag priority={task.priority} />
      </div>
      <p className={styles.title}>{task.title}</p>
    </div>
  );
}

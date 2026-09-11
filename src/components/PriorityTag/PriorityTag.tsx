import type { Priority } from '../../types';
import styles from './PriorityTag.module.css';

export interface PriorityTagProps {
  priority: Priority | null;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const PRIORITY_CLASS: Record<Priority, string> = {
  high: styles.high,
  medium: styles.medium,
  low: styles.low,
};

// Tag de Prioridade (DESIGN.md `priority-tag`): cor por nível + texto.
// Ausente por completo — nunca um placeholder vazio — quando a tarefa não
// tem prioridade definida (`priority === null`).
export function PriorityTag({ priority }: PriorityTagProps) {
  if (priority === null) {
    return null;
  }

  return <span className={`${styles.tag} ${PRIORITY_CLASS[priority]}`}>{PRIORITY_LABELS[priority]}</span>;
}

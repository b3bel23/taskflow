import type { MouseEvent } from 'react';
import type { Task } from '../../types';
import { PriorityTag } from '../PriorityTag/PriorityTag';
import { StateIndicator } from '../StateIndicator/StateIndicator';
import styles from './TaskCard.module.css';

export interface TaskCardProps {
  task: Task;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

// Card de Tarefa (DESIGN.md `task-card`): compõe `StateIndicator` +
// `PriorityTag` (quando definida) + nome. Desde a Story 2.2, é um `<button>`
// (focável e operável por teclado nativamente, foco visível via CSS) —
// clicar em qualquer área abre o Modal em edição, exceto no
// `StateIndicator`, que intercepta o clique (`stopPropagation`) sem efeito
// (ciclar é Epic 3). `aria-label` explícito evita que o nome acessível vire
// a concatenação estranha do conteúdo dos filhos (aria-label do
// StateIndicator + texto da PriorityTag + título).
export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label={`Editar tarefa: ${task.title}`}
    >
      <div className={styles.topRow}>
        <StateIndicator state={task.state} />
        <PriorityTag priority={task.priority} />
      </div>
      <p className={styles.title}>{task.title}</p>
    </button>
  );
}

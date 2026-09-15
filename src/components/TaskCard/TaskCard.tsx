import type { MouseEvent } from 'react';
import type { Task } from '../../types';
import { PriorityTag } from '../PriorityTag/PriorityTag';
import { StateIndicator } from '../StateIndicator/StateIndicator';
import styles from './TaskCard.module.css';

export interface TaskCardProps {
  task: Task;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onCycleState: () => void;
}

// Card de Tarefa (DESIGN.md `task-card`): compõe `StateIndicator` +
// `PriorityTag` (quando definida) + nome. Desde a Story 2.2, é um `<button>`
// (focável e operável por teclado nativamente, foco visível via CSS) —
// clicar em qualquer área abre o Modal em edição, exceto no
// `StateIndicator`, que desde a Story 3.1 intercepta o clique
// (`stopPropagation`) e cicla o Estado via `onCycleState`
// (`useTaskActions.cycleState`, repassado por quem monta o Card) em vez de
// abrir o Modal. `aria-label` explícito evita que o nome acessível vire a
// concatenação estranha do conteúdo dos filhos (aria-label do StateIndicator
// + texto da PriorityTag + título). Story 3.2: quando `task.state === 'done'`,
// aplica opacidade reduzida ao Card inteiro e risco no nome — juntos, nunca
// um sem o outro — puramente visual (CSS), sem afetar posição/coluna.
export function TaskCard({ task, onClick, onCycleState }: TaskCardProps) {
  const isCompleted = task.state === 'done';

  return (
    <button
      type="button"
      className={isCompleted ? `${styles.card} ${styles.completed}` : styles.card}
      onClick={onClick}
      aria-label={`Editar tarefa: ${task.title}`}
    >
      <div className={styles.topRow}>
        <StateIndicator state={task.state} onCycle={onCycleState} />
        <PriorityTag priority={task.priority} />
      </div>
      <p className={isCompleted ? `${styles.title} ${styles.titleCompleted}` : styles.title}>
        {task.title}
      </p>
    </button>
  );
}

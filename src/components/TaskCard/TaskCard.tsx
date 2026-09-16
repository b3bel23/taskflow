import type { MouseEvent } from 'react';
import type { Task } from '../../types';
import { PriorityTag } from '../PriorityTag/PriorityTag';
import { StateIndicator } from '../StateIndicator/StateIndicator';
import styles from './TaskCard.module.css';

export interface TaskCardProps {
  task: Task;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onCycleState: () => void;
  // Story 4.1 (Epic 4): `DayColumn` é quem monta o contexto `@dnd-kit`
  // (`useSortable`) escopado ao grupo `(day, priority)` — `TaskCard` só
  // recebe e planta o `dragHandleRef` na alça (a lib liga o sensor de
  // ponteiro/teclado a este elemento DOM) e o booleano `isDragging` para o
  // visual "levantado". Migração Epic 4 retro item 11 (`@dnd-kit/core`+
  // `@dnd-kit/sortable`): diferente da versão anterior, o sensor de
  // ponteiro/teclado clássico do `@dnd-kit` precisa de `attributes`+
  // `listeners` (do `useSortable`) espalhados como props DOM na própria alça
  // — `dragHandleProps` carrega esse par pronto, num tipo opaco (`Record`)
  // pra `TaskCard` continuar sem importar nenhum tipo do `@dnd-kit`.
  dragHandleRef?: (element: Element | null) => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
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
//
// Story 4.1: alça de arraste dedicada (mesmo `role="button"`+`tabIndex=0`+
// `stopPropagation` de `StateIndicator`, elemento próprio, nunca o Card nem
// o `StateIndicator` ativando o sensor de arraste — decisão já confirmada
// com Isabel, ver "Ask First" da spec). `aria-label` "Arrastar tarefa:
// {título}" é o nome acessível dela, distinto do "Editar tarefa: {título}"
// do Card — os dois compartilham o título, então buscas por nome de botão
// devem usar o texto completo, não um trecho que combine com os dois.
export function TaskCard({
  task,
  onClick,
  onCycleState,
  dragHandleRef,
  dragHandleProps,
  isDragging = false,
}: TaskCardProps) {
  const isCompleted = task.state === 'done';

  const cardClassNames = [styles.card, isCompleted && styles.completed, isDragging && styles.dragging]
    .filter(Boolean)
    .join(' ');

  const handleDragHandleClick = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
  };

  return (
    <button
      type="button"
      className={cardClassNames}
      onClick={onClick}
      aria-label={`Editar tarefa: ${task.title}`}
    >
      <div className={styles.topRow}>
        <div className={styles.leftControls}>
          {dragHandleRef && (
            // Revisão da Story 4.1 (edge-case-hunter): renderizada só quando
            // `dragHandleRef` é fornecida — sem isto, um `TaskCard` montado
            // sem contexto de arraste (ex. direto num teste) ainda expunha
            // um "botão" focável de arrastar sem nenhum sensor ligado a ele.
            <span
              className={styles.dragHandle}
              role="button"
              tabIndex={0}
              aria-label={`Arrastar tarefa: ${task.title}`}
              ref={dragHandleRef}
              {...dragHandleProps}
              onClick={handleDragHandleClick}
            >
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
                <circle cx="5" cy="3" r="1.4" fill="currentColor" />
                <circle cx="11" cy="3" r="1.4" fill="currentColor" />
                <circle cx="5" cy="8" r="1.4" fill="currentColor" />
                <circle cx="11" cy="8" r="1.4" fill="currentColor" />
                <circle cx="5" cy="13" r="1.4" fill="currentColor" />
                <circle cx="11" cy="13" r="1.4" fill="currentColor" />
              </svg>
            </span>
          )}
          <StateIndicator state={task.state} onCycle={onCycleState} />
        </div>
        <PriorityTag priority={task.priority} />
      </div>
      <p className={isCompleted ? `${styles.title} ${styles.titleCompleted}` : styles.title}>
        {task.title}
      </p>
    </button>
  );
}

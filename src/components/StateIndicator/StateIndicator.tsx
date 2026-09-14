import type { KeyboardEvent, MouseEvent } from 'react';
import type { TaskState } from '../../types';
import styles from './StateIndicator.module.css';

export interface StateIndicatorProps {
  state: TaskState;
  onCycle: () => void;
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
// fiel ao tipo completo de `TaskState`. Desde a Story 3.1, é seu próprio
// ponto de interação — clique ou Enter/Espaço chamam `onCycle`
// (`useTaskActions.cycleState`) sem abrir o Modal do `TaskCard`. `role="button"`
// + `tabIndex={0}` em vez da tag `<button>` literal: `TaskCard` já é um
// `<button>` (Story 2.2) e HTML proíbe `<button>` aninhado em `<button>` (ver
// Ask First da spec 3.1). `aria-label` dobra como o anúncio do Estado atual
// para leitor de tela (mesmo texto de antes, já cumpria isso) e como o nome
// acessível do "botão" ARIA. `stopPropagation()` só em `onClick` — impede que
// o clique também abra o Modal do Card; em `onKeyDown` o foco já está no
// Indicador (nunca no `TaskCard`), então não há o que propagar.
export function StateIndicator({ state, onCycle }: StateIndicatorProps) {
  const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    onCycle();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Revisão da Story 3.1 (edge-case-hunter): segurar a tecla repete
      // `keydown` (event.repeat) — sem este guard, um único pressionamento
      // físico sustentado ciclaria o Estado várias vezes.
      if (event.repeat) {
        return;
      }
      onCycle();
    }
  };

  return (
    <span
      className={`${styles.indicator} ${STATE_CLASS[state]}`}
      role="button"
      tabIndex={0}
      aria-label={STATE_LABELS[state]}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
  );
}

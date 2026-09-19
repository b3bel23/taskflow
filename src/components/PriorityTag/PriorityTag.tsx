import type { KeyboardEvent, MouseEvent } from 'react';
import type { Priority } from '../../types';
import styles from './PriorityTag.module.css';

export interface PriorityTagProps {
  priority: Priority | null;
  onCycle: () => void;
}

type PriorityKey = 'none' | Priority;

const PRIORITY_LABELS: Record<PriorityKey, string> = {
  none: 'Sem prioridade',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const PRIORITY_CLASS: Record<PriorityKey, string> = {
  none: styles.none,
  high: styles.high,
  medium: styles.medium,
  low: styles.low,
};

function priorityKey(priority: Priority | null): PriorityKey {
  return priority ?? 'none';
}

// Tag de Prioridade (DESIGN.md `priority-tag`, revisada Story 7.1/7.2):
// SEMPRE visível, mesmo sem Prioridade definida — estado neutro/discreto
// (`.none`), nunca ausente por completo (revoga a regra anterior de
// UX-DR6, que retornava `null` quando `priority === null`). Desde a Story
// 7.2, é seu próprio ponto de interação — mesmo padrão de `StateIndicator`
// (Story 3.1): clique ou Enter/Espaço ciclam a Prioridade
// (`useTaskActions.cyclePriority`, Sem prioridade→Baixa→Média→Alta→Sem
// prioridade) sem abrir o Modal do `TaskCard` nem tocar o Estado.
// `role="button"` + `tabIndex={0}` em vez da tag `<button>` literal:
// `TaskCard` já é um `<button>` e HTML proíbe `<button>` aninhado.
// `aria-label` dobra como o anúncio do nível atual para leitor de tela
// (inclusive "Sem prioridade") e como o nome acessível do "botão" ARIA —
// mesmo padrão de `StateIndicator`, sem prefixo redundante.
export function PriorityTag({ priority, onCycle }: PriorityTagProps) {
  const key = priorityKey(priority);

  const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    onCycle();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Mesmo guard de `StateIndicator` (Story 3.1, edge-case-hunter):
      // segurar a tecla repete `keydown` (event.repeat) — sem isto, um único
      // pressionamento físico sustentado ciclaria a Prioridade várias vezes.
      if (event.repeat) {
        return;
      }
      onCycle();
    }
  };

  return (
    <span
      className={`${styles.tag} ${PRIORITY_CLASS[key]}`}
      role="button"
      tabIndex={0}
      aria-label={PRIORITY_LABELS[key]}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {PRIORITY_LABELS[key]}
    </span>
  );
}

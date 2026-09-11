import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Task } from '../../types';
import { TaskCard } from './TaskCard';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Escrever spec',
    day: 'mon',
    state: 'pending',
    priority: null,
    order: 0,
    ...overrides,
  };
}

describe('TaskCard', () => {
  it('mostra o nome, o StateIndicator e a PriorityTag quando definida', () => {
    render(<TaskCard task={makeTask({ priority: 'high' })} />);

    expect(screen.getByText('Escrever spec')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Pendente' })).toBeTruthy();
    expect(screen.getByText('Alta')).toBeTruthy();
  });

  it('sem prioridade: PriorityTag ausente por completo', () => {
    render(<TaskCard task={makeTask({ priority: null })} />);

    expect(screen.queryByText('Alta')).toBeNull();
    expect(screen.queryByText('Média')).toBeNull();
    expect(screen.queryByText('Baixa')).toBeNull();
  });

  it('não tem onClick — clicar no card não deve fazer nada (edição é Story 2.2)', () => {
    const { container } = render(<TaskCard task={makeTask()} />);
    const card = container.firstElementChild as HTMLElement;

    expect(card.tagName).not.toBe('BUTTON');
    expect(card.onclick).toBeNull();
  });
});

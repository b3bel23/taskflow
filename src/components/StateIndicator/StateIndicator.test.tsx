import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StateIndicator } from './StateIndicator';
import styles from './StateIndicator.module.css';

describe('StateIndicator', () => {
  it('estado pendente: contorno ink-secondary, sem preenchimento', () => {
    render(<StateIndicator state="pending" />);

    const indicator = screen.getByRole('img', { name: 'Pendente' });
    expect(indicator.classList.contains(styles.indicator)).toBe(true);
    expect(indicator.classList.contains(styles.pending)).toBe(true);
  });

  it('estado em andamento: metade preenchida com accent', () => {
    render(<StateIndicator state="in_progress" />);

    const indicator = screen.getByRole('img', { name: 'Em andamento' });
    expect(indicator.classList.contains(styles.inProgress)).toBe(true);
  });

  it('estado concluída: preenchida com ink-secondary', () => {
    render(<StateIndicator state="done" />);

    const indicator = screen.getByRole('img', { name: 'Concluída' });
    expect(indicator.classList.contains(styles.done)).toBe(true);
  });

  it('não é interativo: nenhum onClick, não é um botão (o ciclo por clique é Epic 3)', () => {
    render(<StateIndicator state="pending" />);

    const indicator = screen.getByRole('img', { name: 'Pendente' });
    expect(indicator.tagName).toBe('SPAN');
    expect(indicator.onclick).toBeNull();
  });
});

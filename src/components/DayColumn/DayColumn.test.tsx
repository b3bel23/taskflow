import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayColumn } from './DayColumn';
import styles from './DayColumn.module.css';

describe('DayColumn', () => {
  it('mostra "Nenhuma tarefa" e o controle "+ Adicionar tarefa" sempre visível', () => {
    render(<DayColumn day="mon" isToday={false} />);

    expect(screen.getByText('Nenhuma tarefa')).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ Adicionar tarefa' })).toBeTruthy();
  });

  it('recebe o destaque de hoje quando isToday é true', () => {
    const { container } = render(<DayColumn day="wed" isToday />);
    const column = container.firstElementChild;

    expect(column?.getAttribute('data-today')).toBe('true');
    // A classe CSS Module é o que de fato aplica o destaque visual
    // (fundo + borda) — o atributo data-today sozinho não garante isso.
    expect(column?.classList.contains(styles.today)).toBe(true);
  });

  it('não recebe o destaque de hoje quando isToday é false', () => {
    const { container } = render(<DayColumn day="wed" isToday={false} />);
    const column = container.firstElementChild;

    expect(column?.getAttribute('data-today')).toBe('false');
    expect(column?.classList.contains(styles.today)).toBe(false);
  });

  it('identifica a coluna pelo nome do dia', () => {
    render(<DayColumn day="sun" isToday={false} />);

    expect(screen.getByLabelText('Domingo')).toBeTruthy();
  });
});

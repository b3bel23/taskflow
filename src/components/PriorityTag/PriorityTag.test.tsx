import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityTag } from './PriorityTag';
import styles from './PriorityTag.module.css';

describe('PriorityTag', () => {
  it('ausente por completo quando priority é null — nenhum placeholder vazio', () => {
    const { container } = render(<PriorityTag priority={null} />);

    expect(container.firstChild).toBeNull();
  });

  it('Alta: cor + texto', () => {
    render(<PriorityTag priority="high" />);

    const tag = screen.getByText('Alta');
    expect(tag.classList.contains(styles.tag)).toBe(true);
    expect(tag.classList.contains(styles.high)).toBe(true);
  });

  it('Média: cor + texto', () => {
    render(<PriorityTag priority="medium" />);

    const tag = screen.getByText('Média');
    expect(tag.classList.contains(styles.medium)).toBe(true);
  });

  it('Baixa: cor + texto', () => {
    render(<PriorityTag priority="low" />);

    const tag = screen.getByText('Baixa');
    expect(tag.classList.contains(styles.low)).toBe(true);
  });
});

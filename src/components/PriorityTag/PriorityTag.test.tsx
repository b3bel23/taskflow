import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PriorityTag } from './PriorityTag';
import styles from './PriorityTag.module.css';

describe('PriorityTag', () => {
  // Story 7.1: SEMPRE visível, mesmo sem Prioridade definida (revoga a regra
  // anterior de ausência total).
  it('sem prioridade: renderiza em estado neutro/discreto, nunca ausente', () => {
    render(<PriorityTag priority={null} onCycle={vi.fn()} />);

    const tag = screen.getByText('Sem prioridade');
    expect(tag.classList.contains(styles.tag)).toBe(true);
    expect(tag.classList.contains(styles.none)).toBe(true);
  });

  it('Alta: cor + texto', () => {
    render(<PriorityTag priority="high" onCycle={vi.fn()} />);

    const tag = screen.getByText('Alta');
    expect(tag.classList.contains(styles.tag)).toBe(true);
    expect(tag.classList.contains(styles.high)).toBe(true);
  });

  it('Média: cor + texto', () => {
    render(<PriorityTag priority="medium" onCycle={vi.fn()} />);

    const tag = screen.getByText('Média');
    expect(tag.classList.contains(styles.medium)).toBe(true);
  });

  it('Baixa: cor + texto', () => {
    render(<PriorityTag priority="low" onCycle={vi.fn()} />);

    const tag = screen.getByText('Baixa');
    expect(tag.classList.contains(styles.low)).toBe(true);
  });

  // Story 7.2: ponto de interação próprio — clique/teclado ciclam, nunca
  // abrem o Modal nem tocam o Estado (o próprio componente não sabe nada
  // sobre isso, só chama `onCycle`).
  describe('Ciclar por clique/teclado (Story 7.2)', () => {
    it('é acionável por teclado: role="button", tabIndex=0, foco funciona', () => {
      render(<PriorityTag priority={null} onCycle={vi.fn()} />);

      const tag = screen.getByRole('button', { name: 'Sem prioridade' });
      expect(tag.getAttribute('tabindex')).toBe('0');

      tag.focus();
      expect(document.activeElement).toBe(tag);
    });

    it('anuncia o nível atual para leitor de tela via aria-label, inclusive "Sem prioridade"', () => {
      render(<PriorityTag priority="high" onCycle={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Alta' })).toBeTruthy();
    });

    it('clique chama onCycle e propaga stopPropagation (não deixa o clique "vazar" para o Card)', () => {
      // `<div onClick>` (não `<button>`) só para não colidir com o role
      // "button" + nome acessível "Baixa" da própria Tag (um `<button>`
      // ancestral sem `aria-label` próprio herdaria o texto do filho como
      // nome acessível, tornando a query ambígua) — o que importa aqui é só
      // provar que `stopPropagation` impede a propagação do clique.
      const onCycle = vi.fn();
      const onCardClick = vi.fn();
      render(
        <div onClick={onCardClick}>
          <PriorityTag priority="low" onCycle={onCycle} />
        </div>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Baixa' }));

      expect(onCycle).toHaveBeenCalledTimes(1);
      expect(onCardClick).not.toHaveBeenCalled();
    });

    it('Enter chama onCycle', () => {
      const onCycle = vi.fn();
      render(<PriorityTag priority={null} onCycle={onCycle} />);

      fireEvent.keyDown(screen.getByRole('button', { name: 'Sem prioridade' }), { key: 'Enter' });

      expect(onCycle).toHaveBeenCalledTimes(1);
    });

    it('Espaço chama onCycle', () => {
      const onCycle = vi.fn();
      render(<PriorityTag priority={null} onCycle={onCycle} />);

      fireEvent.keyDown(screen.getByRole('button', { name: 'Sem prioridade' }), { key: ' ' });

      expect(onCycle).toHaveBeenCalledTimes(1);
    });

    it('segurar a tecla (event.repeat) não cicla mais de uma vez por pressionamento físico', () => {
      const onCycle = vi.fn();
      render(<PriorityTag priority={null} onCycle={onCycle} />);

      const tag = screen.getByRole('button', { name: 'Sem prioridade' });
      fireEvent.keyDown(tag, { key: 'Enter' });
      fireEvent.keyDown(tag, { key: 'Enter', repeat: true });

      expect(onCycle).toHaveBeenCalledTimes(1);
    });

    it('outra tecla (ex. Tab) não chama onCycle', () => {
      const onCycle = vi.fn();
      render(<PriorityTag priority={null} onCycle={onCycle} />);

      fireEvent.keyDown(screen.getByRole('button', { name: 'Sem prioridade' }), { key: 'Tab' });

      expect(onCycle).not.toHaveBeenCalled();
    });
  });
});

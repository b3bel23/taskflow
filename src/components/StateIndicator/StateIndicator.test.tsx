import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StateIndicator } from './StateIndicator';
import styles from './StateIndicator.module.css';

describe('StateIndicator', () => {
  it('estado pendente: contorno ink-secondary, sem preenchimento', () => {
    render(<StateIndicator state="pending" onCycle={vi.fn()} />);

    const indicator = screen.getByRole('button', { name: 'Pendente' });
    expect(indicator.classList.contains(styles.indicator)).toBe(true);
    expect(indicator.classList.contains(styles.pending)).toBe(true);
  });

  it('estado em andamento: metade preenchida com accent', () => {
    render(<StateIndicator state="in_progress" onCycle={vi.fn()} />);

    const indicator = screen.getByRole('button', { name: 'Em andamento' });
    expect(indicator.classList.contains(styles.inProgress)).toBe(true);
  });

  it('estado concluída: preenchida com ink-secondary', () => {
    render(<StateIndicator state="done" onCycle={vi.fn()} />);

    const indicator = screen.getByRole('button', { name: 'Concluída' });
    expect(indicator.classList.contains(styles.done)).toBe(true);
  });

  // Story 3.1: `<span role="button" tabIndex={0}>` em vez da tag `<button>`
  // literal — `TaskCard` já é um `<button>` (Story 2.2) e HTML proíbe
  // `<button>` aninhado em `<button>` (ver Ask First da spec 3.1). O nome
  // acessível "button" + `aria-label` cobre o anúncio ao leitor de tela.
  it('é um "botão" ARIA (role="button", tabIndex=0), não a tag <button> literal', () => {
    render(<StateIndicator state="pending" onCycle={vi.fn()} />);

    const indicator = screen.getByRole('button', { name: 'Pendente' });
    expect(indicator.tagName).toBe('SPAN');
    expect(indicator.getAttribute('tabindex')).toBe('0');
  });

  it('clique chama onCycle e não se propaga para um onClick do elemento pai (Story 2.2: TaskCard inteiro é clicável)', () => {
    const onCardClick = vi.fn();
    const onCycle = vi.fn();
    render(
      <button type="button" onClick={onCardClick}>
        <StateIndicator state="pending" onCycle={onCycle} />
      </button>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pendente' }));

    expect(onCycle).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('Enter no Indicador em foco chama onCycle', () => {
    const onCycle = vi.fn();
    render(<StateIndicator state="pending" onCycle={onCycle} />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Pendente' }), { key: 'Enter' });

    expect(onCycle).toHaveBeenCalledTimes(1);
  });

  it('Espaço no Indicador em foco chama onCycle', () => {
    const onCycle = vi.fn();
    render(<StateIndicator state="pending" onCycle={onCycle} />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Pendente' }), { key: ' ' });

    expect(onCycle).toHaveBeenCalledTimes(1);
  });

  it('outras teclas não chamam onCycle', () => {
    const onCycle = vi.fn();
    render(<StateIndicator state="pending" onCycle={onCycle} />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Pendente' }), { key: 'Tab' });

    expect(onCycle).not.toHaveBeenCalled();
  });

  // Revisão da Story 3.1 (edge-case-hunter): segurar Enter/Espaço repete o
  // evento `keydown` com `repeat: true` — sem o guard, cada repetição
  // cicla o Estado de novo, sem relação com o número de pressionamentos
  // físicos reais.
  it('keydown com repeat=true (tecla segurada) não chama onCycle de novo', () => {
    const onCycle = vi.fn();
    render(<StateIndicator state="pending" onCycle={onCycle} />);

    const indicator = screen.getByRole('button', { name: 'Pendente' });
    fireEvent.keyDown(indicator, { key: 'Enter' });
    fireEvent.keyDown(indicator, { key: 'Enter', repeat: true });
    fireEvent.keyDown(indicator, { key: 'Enter', repeat: true });

    expect(onCycle).toHaveBeenCalledTimes(1);
  });
});

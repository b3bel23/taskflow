import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Task } from '../../types';
import { TaskCard } from './TaskCard';
import styles from './TaskCard.module.css';

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
    render(<TaskCard task={makeTask({ priority: 'high' })} onClick={vi.fn()} onCycleState={vi.fn()} />);

    expect(screen.getByText('Escrever spec')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pendente' })).toBeTruthy();
    expect(screen.getByText('Alta')).toBeTruthy();
  });

  it('sem prioridade: PriorityTag ausente por completo', () => {
    render(<TaskCard task={makeTask({ priority: null })} onClick={vi.fn()} onCycleState={vi.fn()} />);

    expect(screen.queryByText('Alta')).toBeNull();
    expect(screen.queryByText('Média')).toBeNull();
    expect(screen.queryByText('Baixa')).toBeNull();
  });

  it('é um <button> focável por teclado, com foco visível via CSS (Story 2.2)', () => {
    render(<TaskCard task={makeTask()} onClick={vi.fn()} onCycleState={vi.fn()} />);

    const card = screen.getByRole('button', { name: /Escrever spec/ });
    expect(card.tagName).toBe('BUTTON');

    card.focus();
    expect(document.activeElement).toBe(card);
  });

  it('tem aria-label explícito "Editar tarefa: <título>", em vez da concatenação do conteúdo dos filhos', () => {
    render(
      <TaskCard
        task={makeTask({ title: 'Escrever spec', priority: 'high' })}
        onClick={vi.fn()}
        onCycleState={vi.fn()}
      />,
    );

    const card = screen.getByRole('button', { name: 'Editar tarefa: Escrever spec' });
    expect(card.getAttribute('aria-label')).toBe('Editar tarefa: Escrever spec');
  });

  // Ativação por teclado (Enter/Espaço) não é testável disparando
  // `fireEvent.keyDown`/`keyUp` diretamente: jsdom não sintetiza o `click`
  // que um `<button>` real dispara nativamente ao receber Enter/Espaço (é
  // comportamento do navegador, não algo que o React/nosso código
  // implementa) — confirmado experimentalmente antes deste teste: um
  // `<button onClick>` puro em jsdom recebe 0 chamadas de `onClick` para a
  // mesma sequência de eventos que um navegador real dispara via clique.
  // A garantia de operabilidade por teclado vem de usar o elemento semântico
  // correto (mesmo raciocínio já aplicado ao "Enter envia o formulário" do
  // `TaskModal` na Story 2.1) — o teste abaixo (`tagName === 'BUTTON'`) é o
  // proxy correto e verificável nesta suíte.
  it('é um <button> nativo — garante ativação por teclado (Enter/Espaço) sem handler próprio', () => {
    render(<TaskCard task={makeTask()} onClick={vi.fn()} onCycleState={vi.fn()} />);

    const card = screen.getByRole('button', { name: /Escrever spec/ });
    expect(card.tagName).toBe('BUTTON');
  });

  it('clicar em qualquer área do Card (exceto o StateIndicator) chama onClick — abre edição', () => {
    const onClick = vi.fn();
    render(<TaskCard task={makeTask()} onClick={onClick} onCycleState={vi.fn()} />);

    fireEvent.click(screen.getByText('Escrever spec'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('clicar no StateIndicator não aciona o onClick do Card (stopPropagation) mas chama onCycleState (Story 3.1)', () => {
    const onClick = vi.fn();
    const onCycleState = vi.fn();
    render(<TaskCard task={makeTask()} onClick={onClick} onCycleState={onCycleState} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pendente' }));

    expect(onClick).not.toHaveBeenCalled();
    expect(onCycleState).toHaveBeenCalledTimes(1);
  });

  // Story 3.2: diferenciação visual de tarefa Concluída (opacidade 0.55 no
  // Card inteiro + line-through no nome) — as duas mudanças juntas, nunca
  // uma sem a outra, e só quando task.state === 'done'.
  describe('Diferenciação visual de tarefa Concluída (Story 3.2)', () => {
    it('tarefa Concluída (done): Card com opacidade e nome com line-through, juntos', () => {
      render(<TaskCard task={makeTask({ state: 'done' })} onClick={vi.fn()} onCycleState={vi.fn()} />);

      const card = screen.getByRole('button', { name: /Escrever spec/ });
      const title = screen.getByText('Escrever spec');

      expect(card.classList.contains(styles.completed)).toBe(true);
      expect(title.classList.contains(styles.titleCompleted)).toBe(true);
    });

    it('tarefa Pendente: nenhuma das duas mudanças aparece', () => {
      render(<TaskCard task={makeTask({ state: 'pending' })} onClick={vi.fn()} onCycleState={vi.fn()} />);

      const card = screen.getByRole('button', { name: /Escrever spec/ });
      const title = screen.getByText('Escrever spec');

      expect(card.classList.contains(styles.completed)).toBe(false);
      expect(title.classList.contains(styles.titleCompleted)).toBe(false);
    });

    it('tarefa Em andamento: nenhuma das duas mudanças aparece', () => {
      render(<TaskCard task={makeTask({ state: 'in_progress' })} onClick={vi.fn()} onCycleState={vi.fn()} />);

      const card = screen.getByRole('button', { name: /Escrever spec/ });
      const title = screen.getByText('Escrever spec');

      expect(card.classList.contains(styles.completed)).toBe(false);
      expect(title.classList.contains(styles.titleCompleted)).toBe(false);
    });

    // Regressão: nenhuma lógica hoje filtra/oculta/remove por Estado — a
    // tarefa Concluída continua presente e visível no DOM, nunca escondida.
    it('tarefa Concluída permanece visível/presente no DOM — nunca oculta ou removida', () => {
      render(<TaskCard task={makeTask({ state: 'done' })} onClick={vi.fn()} onCycleState={vi.fn()} />);

      const card = screen.getByRole('button', { name: /Escrever spec/ });

      expect(card.hidden).toBe(false);
      expect(document.body.contains(card)).toBe(true);
      expect(screen.getByText('Escrever spec')).toBeTruthy();
    });

    it('a diferenciação de Concluída independe de tema: mesmas classes com data-theme="dark"', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      try {
        render(<TaskCard task={makeTask({ state: 'done' })} onClick={vi.fn()} onCycleState={vi.fn()} />);

        const card = screen.getByRole('button', { name: /Escrever spec/ });
        const title = screen.getByText('Escrever spec');

        expect(card.classList.contains(styles.completed)).toBe(true);
        expect(title.classList.contains(styles.titleCompleted)).toBe(true);
      } finally {
        document.documentElement.removeAttribute('data-theme');
      }
    });

    // Revisão da Story 3.2 (blind-hunter): a diferenciação visual é só
    // estética — nada nesta história desabilita a interação. Guarda contra
    // uma futura regressão que acidentalmente adicione `disabled`/
    // `pointer-events: none` a um Card Concluído.
    it('tarefa Concluída continua clicável e com o Indicador ciclável, igual a qualquer outra', () => {
      const onClick = vi.fn();
      const onCycleState = vi.fn();
      render(<TaskCard task={makeTask({ state: 'done' })} onClick={onClick} onCycleState={onCycleState} />);

      fireEvent.click(screen.getByText('Escrever spec'));
      expect(onClick).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Concluída' }));
      expect(onCycleState).toHaveBeenCalledTimes(1);
    });
  });
});

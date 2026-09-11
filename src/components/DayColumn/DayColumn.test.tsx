import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DayColumn } from './DayColumn';
import styles from './DayColumn.module.css';
import { TaskProvider } from '../../state/TaskContext';
import { TASKS_STORAGE_KEY } from '../../storage/tasksStorage';
import type { Task } from '../../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 't1',
    title: overrides.title ?? 'Tarefa',
    day: overrides.day ?? 'mon',
    state: overrides.state ?? 'pending',
    priority: overrides.priority ?? null,
    order: overrides.order ?? 0,
  };
}

describe('DayColumn', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mostra "Nenhuma tarefa" quando não há tarefas, e o controle "+ Adicionar tarefa" sempre visível', () => {
    render(<DayColumn day="mon" isToday={false} tasks={[]} />);

    expect(screen.getByText('Nenhuma tarefa')).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ Adicionar tarefa' })).toBeTruthy();
  });

  it('renderiza um TaskCard por tarefa recebida, em vez de "Nenhuma tarefa"', () => {
    render(<DayColumn day="mon" isToday={false} tasks={[makeTask({ title: 'Escrever spec' })]} />);

    expect(screen.getByText('Escrever spec')).toBeTruthy();
    expect(screen.queryByText('Nenhuma tarefa')).toBeNull();
  });

  it('recebe o destaque de hoje quando isToday é true', () => {
    const { container } = render(<DayColumn day="wed" isToday tasks={[]} />);
    const column = container.firstElementChild;

    expect(column?.getAttribute('data-today')).toBe('true');
    // A classe CSS Module é o que de fato aplica o destaque visual
    // (fundo + borda) — o atributo data-today sozinho não garante isso.
    expect(column?.classList.contains(styles.today)).toBe(true);
  });

  it('não recebe o destaque de hoje quando isToday é false', () => {
    const { container } = render(<DayColumn day="wed" isToday={false} tasks={[]} />);
    const column = container.firstElementChild;

    expect(column?.getAttribute('data-today')).toBe('false');
    expect(column?.classList.contains(styles.today)).toBe(false);
  });

  it('identifica a coluna pelo nome do dia', () => {
    render(<DayColumn day="sun" isToday={false} tasks={[]} />);

    expect(screen.getByLabelText('Domingo')).toBeTruthy();
  });

  describe('Modal de Tarefa', () => {
    function renderInProvider() {
      return render(
        <TaskProvider>
          <DayColumn day="mon" isToday={false} tasks={[]} />
        </TaskProvider>,
      );
    }

    it('clicar em "+ Adicionar tarefa" abre o TaskModal', () => {
      renderInProvider();

      fireEvent.click(screen.getByRole('button', { name: '+ Adicionar tarefa' }));

      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('Esc fecha o modal e devolve o foco ao botão "+ Adicionar tarefa" que abriu, sem criar nada', () => {
      renderInProvider();

      const addButton = screen.getByRole('button', { name: '+ Adicionar tarefa' });
      fireEvent.click(addButton);
      expect(screen.getByRole('dialog')).toBeTruthy();

      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Não deveria salvar' } });
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(addButton);
      expect(window.localStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
    });

    it('criação bem-sucedida fecha o modal e devolve o foco ao botão "+ Adicionar tarefa" que abriu', () => {
      renderInProvider();

      const addButton = screen.getByRole('button', { name: '+ Adicionar tarefa' });
      fireEvent.click(addButton);
      expect(screen.getByRole('dialog')).toBeTruthy();

      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Revisar PR' } });
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(addButton);
    });
  });
});

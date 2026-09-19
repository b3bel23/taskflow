import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DayColumn } from './DayColumn';
import styles from './DayColumn.module.css';
import { formatDayHeading } from '../../constants/week';
import { TaskProvider } from '../../state/TaskContext';
import { TASKS_STORAGE_KEY } from '../../storage/tasksStorage';
import type { Task } from '../../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 't1',
    title: overrides.title ?? 'Tarefa',
    date: overrides.date ?? '2026-09-21',
    time: overrides.time ?? null,
    state: overrides.state ?? 'pending',
    priority: overrides.priority ?? null,
    order: overrides.order ?? 0,
  };
}

describe('DayColumn', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // Desde a Story 3.1, `DayColumn` chama `useTaskActions()` incondicionalmente
  // — precisa de `TaskProvider` na árvore mesmo nos testes que não mexem com
  // Estado/persistência.
  function renderInProvider(date = '2026-09-21', isToday = false, tasks: Task[] = []) {
    return render(
      <TaskProvider>
        <DayColumn date={date} isToday={isToday} tasks={tasks} />
      </TaskProvider>,
    );
  }

  // Idem: semeia `localStorage` com uma única tarefa persistida antes de
  // montar `DayColumn` — usado pelos testes de edição (Story 2.2), ciclo de
  // Estado (Story 3.1) e ciclo de Prioridade (Story 7.2), que precisam da
  // mesma tarefa já existente em `TaskContext`.
  function renderWithTask(task: Task) {
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, tasks: [task] }));
    return render(
      <TaskProvider>
        <DayColumn date={task.date} isToday={false} tasks={[task]} />
      </TaskProvider>,
    );
  }

  it('mostra "Nenhuma tarefa" quando não há tarefas, e o controle "+ Adicionar tarefa" sempre visível', () => {
    renderInProvider();

    expect(screen.getByText('Nenhuma tarefa')).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ Adicionar tarefa' })).toBeTruthy();
  });

  it('renderiza um TaskCard por tarefa recebida, em vez de "Nenhuma tarefa"', () => {
    renderInProvider('2026-09-21', false, [makeTask({ title: 'Escrever spec' })]);

    expect(screen.getByText('Escrever spec')).toBeTruthy();
    expect(screen.queryByText('Nenhuma tarefa')).toBeNull();
  });

  it('renderiza os Cards na ordem recebida (já ordenada por WeekView via sortTasksInDay) — nunca reordena por conta própria', () => {
    renderInProvider('2026-09-21', false, [
      makeTask({ id: 'a', title: 'Primeira' }),
      makeTask({ id: 'b', title: 'Segunda' }),
    ]);

    const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(items[0]).toContain('Primeira');
    expect(items[1]).toContain('Segunda');
  });

  it('recebe o destaque de hoje quando isToday é true', () => {
    const { container } = renderInProvider('2026-09-23', true);
    const column = container.firstElementChild;

    expect(column?.getAttribute('data-today')).toBe('true');
    expect(column?.classList.contains(styles.today)).toBe(true);
  });

  it('não recebe o destaque de hoje quando isToday é false', () => {
    const { container } = renderInProvider('2026-09-23', false);
    const column = container.firstElementChild;

    expect(column?.getAttribute('data-today')).toBe('false');
    expect(column?.classList.contains(styles.today)).toBe(false);
  });

  it('identifica a coluna pelo nome do dia + data real (ex. "Domingo, 20/09")', () => {
    renderInProvider('2026-09-20');

    expect(screen.getByLabelText(formatDayHeading('2026-09-20'))).toBeTruthy();
  });

  describe('Modal de Tarefa', () => {
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

  describe('Edição de tarefa (Story 2.2)', () => {
    it('clicar em qualquer área do Card (exceto Indicador/Tag) abre o Modal em edição, pré-preenchido', () => {
      const task = makeTask({ title: 'Escrever spec', priority: 'high' });
      renderWithTask(task);

      fireEvent.click(screen.getByText('Escrever spec'));

      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('Editar tarefa')).toBeTruthy();
      expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Escrever spec');
    });

    it('clicar no StateIndicator do Card não abre o Modal (stopPropagation) mas cicla o Estado via cycleState (Story 3.1)', () => {
      const task = makeTask({ title: 'Escrever spec', state: 'pending' });
      renderWithTask(task);

      fireEvent.click(screen.getByRole('button', { name: 'Pendente' }));

      expect(screen.queryByRole('dialog')).toBeNull();
      const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}').tasks;
      expect(saved[0].state).toBe('in_progress');
    });

    it('edição bem-sucedida fecha o modal e devolve o foco ao Card que abriu', () => {
      const task = makeTask({ title: 'Escrever spec' });
      renderWithTask(task);

      const card = screen.getByRole('button', { name: 'Editar tarefa: Escrever spec' });
      fireEvent.click(card);
      expect(screen.getByRole('dialog')).toBeTruthy();

      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Renomeada' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(card);
    });

    it('Esc fecha o modal de edição sem persistir nada e devolve o foco ao Card', () => {
      const task = makeTask({ title: 'Escrever spec' });
      renderWithTask(task);

      const card = screen.getByRole('button', { name: 'Editar tarefa: Escrever spec' });
      fireEvent.click(card);

      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Não deveria salvar' } });
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(card);
      const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}').tasks;
      expect(saved[0].title).toBe('Escrever spec');
    });
  });

  describe('Ciclo de Estado pelo Indicador (Story 3.1)', () => {
    function savedState(): string {
      return JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}').tasks[0].state;
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('clique no Indicador de tarefa Pendente persiste Em andamento, sem abrir o Modal', () => {
      const task = makeTask({ state: 'pending' });
      renderWithTask(task);

      fireEvent.click(screen.getByRole('button', { name: 'Pendente' }));

      expect(savedState()).toBe('in_progress');
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('escrita em localStorage falha: nada é persistido, sem nova tentativa automática', () => {
      const task = makeTask({ state: 'pending' });
      renderWithTask(task);

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      fireEvent.click(screen.getByRole('button', { name: 'Pendente' }));

      expect(savedState()).toBe('pending');
    });
  });

  // Story 7.2: mesmo padrão do Indicador de Estado acima, agora para a Tag
  // de Prioridade — clicar nela cicla via `cyclePriority`, sem abrir o Modal.
  describe('Ciclo de Prioridade pela Tag (Story 7.2)', () => {
    function savedPriority(): string | null {
      return JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}').tasks[0].priority;
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('clique na Tag "Sem prioridade" persiste Baixa, sem abrir o Modal', () => {
      const task = makeTask({ priority: null });
      renderWithTask(task);

      fireEvent.click(screen.getByRole('button', { name: 'Sem prioridade' }));

      expect(savedPriority()).toBe('low');
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('clique na Tag "Alta" volta para Sem prioridade (wraparound)', () => {
      const task = makeTask({ priority: 'high' });
      renderWithTask(task);

      fireEvent.click(screen.getByRole('button', { name: 'Alta' }));

      expect(savedPriority()).toBeNull();
    });

    it('escrita em localStorage falha: nada é persistido', () => {
      const task = makeTask({ priority: null });
      renderWithTask(task);

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      fireEvent.click(screen.getByRole('button', { name: 'Sem prioridade' }));

      expect(savedPriority()).toBeNull();
    });
  });

  // Story 4.2 revisada (Epic 4, 2026-09-18): a coluna INTEIRA é o único alvo
  // soltável da semana (não mais zonas de Prioridade, removidas nesta
  // revisão) — `useDroppable` planta seu `ref` na própria `<section>`.
  describe('Coluna inteira como alvo de arraste (Story 4.2 revisada)', () => {
    it('a seção da coluna existe e contém a lista de tarefas (alvo soltável único, sem sub-regiões)', () => {
      const { container } = renderInProvider('2026-09-21', false, [makeTask({ title: 'Tarefa' })]);

      const column = container.querySelector('section');
      expect(column).toBeTruthy();
      expect(within(column as HTMLElement).getByText('Tarefa')).toBeTruthy();
      // Nenhuma zona de Prioridade sobrevive nesta revisão.
      expect(container.querySelector('[data-priority-zone]')).toBeNull();
    });
  });
});

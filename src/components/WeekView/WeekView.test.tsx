import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { WeekView } from './WeekView';
import { DAY_LABELS } from '../../constants/days';
import dayColumnStyles from '../DayColumn/DayColumn.module.css';
import { TaskProvider } from '../../state/TaskContext';

function renderWeekView() {
  return render(
    <TaskProvider>
      <WeekView />
    </TaskProvider>,
  );
}

// Abre o Modal de Tarefa da coluna do dia informado, clicando no "+
// Adicionar tarefa" daquela coluna especificamente (há um por dia).
function openModalForDay(dayLabel: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: dayLabel });
  const column = heading.closest('section') as HTMLElement;
  fireEvent.click(within(column).getByRole('button', { name: '+ Adicionar tarefa' }));
  return column;
}

function createTask(dayLabel: string, title: string, priority?: 'high' | 'medium' | 'low') {
  const column = openModalForDay(dayLabel);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: title } });
  if (priority) {
    fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: priority } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));
  return column;
}

describe('WeekView', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza os 7 dias, Segunda->Domingo, todos simultâneos, sem navegação', () => {
    renderWeekView();

    const labels = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);
    expect(labels).toEqual([
      DAY_LABELS.mon,
      DAY_LABELS.tue,
      DAY_LABELS.wed,
      DAY_LABELS.thu,
      DAY_LABELS.fri,
      DAY_LABELS.sat,
      DAY_LABELS.sun,
    ]);
    expect(screen.queryAllByRole('button', { name: /próxima|anterior|next|previous/i })).toHaveLength(0);
  });

  it('destaca só a coluna do dia atual quando hoje é um dia de meio de semana', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T12:00:00')); // quarta-feira

    const { container } = renderWeekView();
    const highlighted = container.querySelectorAll('[data-today="true"]');

    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].textContent).toContain(DAY_LABELS.wed);
    expect(highlighted[0].classList.contains(dayColumnStyles.today)).toBe(true);
  });

  it('destaca a coluna Domingo (última) quando hoje é domingo (getDay() === 0)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T12:00:00')); // domingo

    const { container } = renderWeekView();
    const highlighted = container.querySelectorAll('[data-today="true"]');
    const allColumns = container.querySelectorAll('[data-today]');

    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].textContent).toContain(DAY_LABELS.sun);
    expect(allColumns[allColumns.length - 1]).toBe(highlighted[0]);
    expect(highlighted[0].classList.contains(dayColumnStyles.today)).toBe(true);
  });

  it('criação feliz: tarefa aparece imediatamente na coluna certa, com Estado pending, e o modal fecha', () => {
    renderWeekView();

    const column = createTask(DAY_LABELS.wed, 'Revisar PR', 'high');

    expect(within(column).getByText('Revisar PR')).toBeTruthy();
    expect(within(column).getByRole('img', { name: 'Pendente' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    // A coluna de origem não tem mais "Nenhuma tarefa" depois da criação.
    expect(within(column).queryByText('Nenhuma tarefa')).toBeNull();
  });

  it('ordena as tarefas do dia por prioridade Alta->Média->Baixa->sem prioridade', () => {
    renderWeekView();

    createTask(DAY_LABELS.thu, 'T-sem');
    createTask(DAY_LABELS.thu, 'T-baixa', 'low');
    createTask(DAY_LABELS.thu, 'T-alta', 'high');
    const column = createTask(DAY_LABELS.thu, 'T-media', 'medium');

    const items = within(column)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');
    const orderIndex = (title: string) => items.findIndex((text) => text.includes(title));

    expect(orderIndex('T-alta')).toBeLessThan(orderIndex('T-media'));
    expect(orderIndex('T-media')).toBeLessThan(orderIndex('T-baixa'));
    expect(orderIndex('T-baixa')).toBeLessThan(orderIndex('T-sem'));
  });

  it('2ª tarefa no mesmo dia+prioridade recebe order maior e aparece depois da 1ª', () => {
    renderWeekView();

    createTask(DAY_LABELS.fri, 'Primeira');
    const column = createTask(DAY_LABELS.fri, 'Segunda');

    const items = within(column)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');
    const orderIndex = (title: string) => items.findIndex((text) => text.includes(title));

    expect(orderIndex('Primeira')).toBeLessThan(orderIndex('Segunda'));
  });

  // Retrospectiva Epic 2 (achado 1): estes dois casos só existem no nível
  // de `WeekView`/`DayColumn` reais — `TaskModal.test.tsx` monta o Modal
  // isolado (sem `DayColumn`), então nunca exercitou `closeEditModal` de
  // verdade nem a coluna de onde a tarefa saiu.
  it('editar tarefa mudando o Dia: foco vai para "+ Adicionar tarefa" da coluna de origem, nunca perdido em <body>', () => {
    renderWeekView();
    const originColumn = createTask(DAY_LABELS.mon, 'Tarefa a mover');

    fireEvent.click(within(originColumn).getByText('Tarefa a mover'));
    fireEvent.change(screen.getByLabelText('Dia'), { target: { value: 'fri' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(within(originColumn).queryByText('Tarefa a mover')).toBeNull();
    expect(document.activeElement).toBe(within(originColumn).getByRole('button', { name: '+ Adicionar tarefa' }));
  });

  it('excluir tarefa: foco vai para "+ Adicionar tarefa" da coluna de origem, nunca perdido em <body>', () => {
    renderWeekView();
    const column = createTask(DAY_LABELS.tue, 'Tarefa a excluir');

    fireEvent.click(within(column).getByText('Tarefa a excluir'));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(within(column).queryByText('Tarefa a excluir')).toBeNull();
    expect(document.activeElement).toBe(within(column).getByRole('button', { name: '+ Adicionar tarefa' }));
  });
});

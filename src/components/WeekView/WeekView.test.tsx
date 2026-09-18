import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { WeekView } from './WeekView';
import { formatDayHeading, getWeekWindow } from '../../constants/week';
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
// Adicionar tarefa" daquela coluna especificamente (há um por dia). `dayLabel`
// é o cabeçalho completo da coluna (`formatDayHeading`, ex. "Sexta-feira,
// 18/09"), único por data — nunca ambíguo mesmo em testes com múltiplas
// colunas.
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
    // Story 5.1: a janela é `hoje..hoje+6` (dinâmica), não mais 7 dias fixos
    // Segunda->Domingo — fixa o "hoje" em todos os testes para tornar a
    // janela determinística (mesmo padrão que os testes de destaque já
    // usavam antes desta história).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T12:00:00')); // sexta-feira
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza os 7 dias da janela hoje..hoje+6, todos simultâneos, sem navegação', () => {
    renderWeekView();

    const expectedHeadings = getWeekWindow().map(formatDayHeading);
    const labels = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);
    expect(labels).toEqual(expectedHeadings);
    expect(screen.queryAllByRole('button', { name: /próxima|anterior|next|previous/i })).toHaveLength(0);
  });

  it('destaca só a coluna do dia atual (primeira da janela, hoje) quando hoje é um dia de meio de semana', () => {
    vi.setSystemTime(new Date('2026-09-09T12:00:00')); // quarta-feira

    const { container } = renderWeekView();
    const highlighted = container.querySelectorAll('[data-today="true"]');

    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].textContent).toContain(formatDayHeading('2026-09-09'));
    expect(highlighted[0].classList.contains(dayColumnStyles.today)).toBe(true);
  });

  it('a coluna de hoje é sempre a primeira da janela (nunca precisa esperar chegar domingo, por exemplo)', () => {
    vi.setSystemTime(new Date('2026-09-13T12:00:00')); // domingo

    const { container } = renderWeekView();
    const highlighted = container.querySelectorAll('[data-today="true"]');
    const allColumns = container.querySelectorAll('[data-today]');

    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].textContent).toContain(formatDayHeading('2026-09-13'));
    expect(allColumns[0]).toBe(highlighted[0]);
    expect(highlighted[0].classList.contains(dayColumnStyles.today)).toBe(true);
  });

  it('criação feliz: tarefa aparece imediatamente na coluna certa, com Estado pending, e o modal fecha', () => {
    renderWeekView();

    const column = createTask(formatDayHeading('2026-09-20'), 'Revisar PR', 'high');

    expect(within(column).getByText('Revisar PR')).toBeTruthy();
    expect(within(column).getByRole('button', { name: 'Pendente' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    // A coluna de origem não tem mais "Nenhuma tarefa" depois da criação.
    expect(within(column).queryByText('Nenhuma tarefa')).toBeNull();
  });

  it('ordena as tarefas do dia por prioridade Alta->Média->Baixa->sem prioridade', () => {
    renderWeekView();
    const heading = formatDayHeading('2026-09-24');

    createTask(heading, 'T-sem');
    createTask(heading, 'T-baixa', 'low');
    createTask(heading, 'T-alta', 'high');
    const column = createTask(heading, 'T-media', 'medium');

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
    const heading = formatDayHeading('2026-09-18');

    createTask(heading, 'Primeira');
    const column = createTask(heading, 'Segunda');

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
    const originColumn = createTask(formatDayHeading('2026-09-21'), 'Tarefa a mover');

    fireEvent.click(within(originColumn).getByText('Tarefa a mover'));
    fireEvent.change(screen.getByLabelText('Dia'), { target: { value: '2026-09-18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(within(originColumn).queryByText('Tarefa a mover')).toBeNull();
    expect(document.activeElement).toBe(within(originColumn).getByRole('button', { name: '+ Adicionar tarefa' }));
  });

  it('excluir tarefa: foco vai para "+ Adicionar tarefa" da coluna de origem, nunca perdido em <body>', () => {
    renderWeekView();
    const column = createTask(formatDayHeading('2026-09-22'), 'Tarefa a excluir');

    fireEvent.click(within(column).getByText('Tarefa a excluir'));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(within(column).queryByText('Tarefa a excluir')).toBeNull();
    expect(document.activeElement).toBe(within(column).getByRole('button', { name: '+ Adicionar tarefa' }));
  });

  // Story 3.1: só aqui (`WeekView`, com `TaskContext` de verdade) a tela
  // reflete o Estado ciclado — `DayColumn` sozinho recebe `tasks` já pronta
  // via prop e não a relê do contexto (ver `DayColumn.test.tsx`).
  describe('Ciclo de Estado pelo Indicador (Story 3.1)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('clique no Indicador de tarefa Pendente muda para Em andamento na hora, sem abrir o Modal', () => {
      renderWeekView();
      const column = createTask(formatDayHeading('2026-09-21'), 'Tarefa');

      fireEvent.click(within(column).getByRole('button', { name: 'Pendente' }));

      expect(within(column).getByRole('button', { name: 'Em andamento' })).toBeTruthy();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('clique no Indicador de tarefa Em andamento muda para Concluída', () => {
      renderWeekView();
      const column = createTask(formatDayHeading('2026-09-21'), 'Tarefa');

      fireEvent.click(within(column).getByRole('button', { name: 'Pendente' }));
      fireEvent.click(within(column).getByRole('button', { name: 'Em andamento' }));

      expect(within(column).getByRole('button', { name: 'Concluída' })).toBeTruthy();
    });

    it('clique no Indicador de tarefa Concluída volta a Pendente (wraparound), sem restrição', () => {
      renderWeekView();
      const column = createTask(formatDayHeading('2026-09-21'), 'Tarefa');

      fireEvent.click(within(column).getByRole('button', { name: 'Pendente' }));
      fireEvent.click(within(column).getByRole('button', { name: 'Em andamento' }));
      fireEvent.click(within(column).getByRole('button', { name: 'Concluída' }));

      expect(within(column).getByRole('button', { name: 'Pendente' })).toBeTruthy();
    });

    it('Indicador em foco: Enter e Espaço ciclam o Estado como o clique', () => {
      renderWeekView();
      const column = createTask(formatDayHeading('2026-09-21'), 'Tarefa');

      fireEvent.keyDown(within(column).getByRole('button', { name: 'Pendente' }), { key: 'Enter' });
      expect(within(column).getByRole('button', { name: 'Em andamento' })).toBeTruthy();

      fireEvent.keyDown(within(column).getByRole('button', { name: 'Em andamento' }), { key: ' ' });
      expect(within(column).getByRole('button', { name: 'Concluída' })).toBeTruthy();
    });

    it('clicar em qualquer outra área do Card continua abrindo o Modal, sem ciclar o Estado', () => {
      renderWeekView();
      const column = createTask(formatDayHeading('2026-09-21'), 'Tarefa');

      fireEvent.click(within(column).getByText('Tarefa'));

      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(within(column).getByRole('button', { name: 'Pendente' })).toBeTruthy();
    });

    it('escrita em localStorage falha: Estado exibido não muda, sem nova tentativa automática', () => {
      renderWeekView();
      const column = createTask(formatDayHeading('2026-09-21'), 'Tarefa');

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      fireEvent.click(within(column).getByRole('button', { name: 'Pendente' }));

      expect(within(column).getByRole('button', { name: 'Pendente' })).toBeTruthy();
      expect(within(column).queryByRole('button', { name: 'Em andamento' })).toBeNull();
    });
  });
});

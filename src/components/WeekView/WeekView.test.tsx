import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { WeekView } from './WeekView';
import { formatDayHeading, getWeekWindow } from '../../constants/week';
import dayColumnStyles from '../DayColumn/DayColumn.module.css';
import taskCardStyles from '../TaskCard/TaskCard.module.css';
import { TaskProvider } from '../../state/TaskContext';
import { TASKS_STORAGE_KEY } from '../../storage/tasksStorage';
import type { Task } from '../../types';

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

function createTask(
  dayLabel: string,
  title: string,
  options?: { priority?: 'high' | 'medium' | 'low'; time?: string },
) {
  const column = openModalForDay(dayLabel);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: title } });
  if (options?.priority) {
    fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: options.priority } });
  }
  if (options?.time) {
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: options.time } });
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
    vi.restoreAllMocks();
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

    const column = createTask(formatDayHeading('2026-09-20'), 'Revisar PR', { priority: 'high' });

    expect(within(column).getByText('Revisar PR')).toBeTruthy();
    expect(within(column).getByRole('button', { name: 'Pendente' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    // A coluna de origem não tem mais "Nenhuma tarefa" depois da criação.
    expect(within(column).queryByText('Nenhuma tarefa')).toBeNull();
  });

  // Story 6.2 (Epic 6): ordenação por Horário substitui a antiga ordenação
  // por Prioridade — tarefas sem Horário primeiro, depois em ordem
  // crescente; Prioridade nunca influencia a posição.
  it('ordena as tarefas do dia por Horário — sem Horário primeiro, depois crescente; Prioridade não influencia', () => {
    renderWeekView();
    const heading = formatDayHeading('2026-09-24');

    createTask(heading, 'T-sem-horario');
    createTask(heading, 'T-tarde', { time: '18:00', priority: 'low' });
    const column = createTask(heading, 'T-manha', { time: '08:00', priority: 'high' });

    const items = within(column)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');
    const orderIndex = (title: string) => items.findIndex((text) => text.includes(title));

    expect(orderIndex('T-sem-horario')).toBeLessThan(orderIndex('T-manha'));
    // T-manha (08:00, Alta) vem antes de T-tarde (18:00, Baixa) — Horário
    // manda, mesmo com a Prioridade "invertida".
    expect(orderIndex('T-manha')).toBeLessThan(orderIndex('T-tarde'));
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

    it('Card cicla até Concluída e volta a Pendente: as classes completed/titleCompleted aparecem e depois somem', () => {
      renderWeekView();
      const column = createTask(formatDayHeading('2026-09-21'), 'Tarefa');
      const card = () => within(column).getByRole('button', { name: /Editar tarefa: Tarefa/ });
      const title = () => within(column).getByText('Tarefa');

      expect(card().className).not.toContain(taskCardStyles.completed);

      fireEvent.click(within(column).getByRole('button', { name: 'Pendente' }));
      fireEvent.click(within(column).getByRole('button', { name: 'Em andamento' }));

      expect(card().className).toContain(taskCardStyles.completed);
      expect(title().className).toContain(taskCardStyles.titleCompleted);

      fireEvent.click(within(column).getByRole('button', { name: 'Concluída' }));

      expect(card().className).not.toContain(taskCardStyles.completed);
      expect(title().className).not.toContain(taskCardStyles.titleCompleted);
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

  // Story 5.3 (AD-10): timer periódico (~60s) recomputa a janela quando a
  // data efetivamente muda, mesmo sem reload/foco na aba.
  describe('Janela avança automaticamente (Story 5.3)', () => {
    it('timer detecta virada de dia (~60s depois da meia-noite) e recalcula a janela — hoje passa a ser o novo dia', () => {
      vi.setSystemTime(new Date('2026-09-18T23:59:30'));
      renderWeekView();

      expect(screen.getByRole('heading', { name: formatDayHeading('2026-09-18') })).toBeTruthy();

      act(() => {
        vi.setSystemTime(new Date('2026-09-19T00:00:31'));
        vi.advanceTimersByTime(60_000);
      });

      expect(screen.getByRole('heading', { name: formatDayHeading('2026-09-19') })).toBeTruthy();
      expect(screen.queryByRole('heading', { name: formatDayHeading('2026-09-18') })).toBeNull();
    });

    it('tick do timer sem virada de dia: janela não recalcula (nenhuma mudança visível)', () => {
      renderWeekView();
      const before = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);

      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      const after = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);
      expect(after).toEqual(before);
    });
  });

  // Story 5.4 (AD-11): toda vez que a janela é (re)calculada — ao montar,
  // aqui — roda uma passada de rollover.
  describe('Rollover automático de tarefas atrasadas (Story 5.4)', () => {
    function seedTask(overrides: Partial<Task>) {
      const task: Task = {
        id: overrides.id ?? 'atrasada',
        title: overrides.title ?? 'Tarefa atrasada',
        date: overrides.date ?? '2026-09-10',
        time: overrides.time ?? null,
        state: overrides.state ?? 'pending',
        priority: overrides.priority ?? null,
        order: overrides.order ?? 0,
      };
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, tasks: [task] }));
      return task;
    }

    it('tarefa pendente com date anterior à janela aparece na coluna de hoje ao montar', () => {
      seedTask({ title: 'Ficou pra trás', date: '2026-09-01', state: 'pending' });

      renderWeekView();

      const todayColumn = screen.getByRole('heading', { name: formatDayHeading('2026-09-18') }).closest('section');
      expect(within(todayColumn as HTMLElement).getByText('Ficou pra trás')).toBeTruthy();

      const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}').tasks;
      expect(saved[0].date).toBe('2026-09-18');
    });

    it('tarefa concluída com date anterior à janela NUNCA sofre rollover — não aparece em nenhuma coluna visível', () => {
      seedTask({ title: 'Concluída antiga', date: '2026-09-01', state: 'done' });

      renderWeekView();

      expect(screen.queryByText('Concluída antiga')).toBeNull();
      const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}').tasks;
      expect(saved[0].date).toBe('2026-09-01');
    });

    it('escrita falha: mostra aviso, tarefa segue fora da janela, e o timer repete a tentativa até dar certo', () => {
      seedTask({ title: 'Ficou pra trás', date: '2026-09-01', state: 'pending' });
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      renderWeekView();

      expect(screen.getByRole('alert').textContent).toMatch(/atrasadas/);
      expect(screen.queryByText('Ficou pra trás')).toBeNull();

      // Ainda falhando no tick seguinte: aviso permanece, nada quebra.
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(screen.getByRole('alert')).toBeTruthy();

      setItem.mockRestore();
      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      expect(screen.queryByRole('alert')).toBeNull();
      const todayColumn = screen.getByRole('heading', { name: formatDayHeading('2026-09-18') }).closest('section');
      expect(within(todayColumn as HTMLElement).getByText('Ficou pra trás')).toBeTruthy();
      const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}').tasks;
      expect(saved[0].date).toBe('2026-09-18');
    });

    // Retro Epics 5-7, F3/A2: o `TaskModal` calcula a janela uma vez, na
    // montagem. Aberto numa coluna que SOBREVIVE à virada do dia (a de
    // amanhã), ele continua oferecendo o dia que acabou de virar passado —
    // e o rollover só rodava quando `today` muda, então salvar com essa data
    // deixava a tarefa fora da janela (invisível) até o próximo reload.
    it('modal de edição aberto atravessando a meia-noite: escolher o dia que virou passado não faz a tarefa sumir', () => {
      vi.setSystemTime(new Date('2026-09-18T23:59:30'));
      seedTask({ id: 'alvo', title: 'Alvo', date: '2026-09-19', state: 'pending' });
      renderWeekView();

      const tomorrowColumn = screen.getByRole('heading', { name: formatDayHeading('2026-09-19') }).closest('section');
      fireEvent.click(within(tomorrowColumn as HTMLElement).getByText('Alvo'));
      expect(screen.getByRole('dialog')).toBeTruthy();

      act(() => {
        vi.setSystemTime(new Date('2026-09-19T00:00:31'));
        vi.advanceTimersByTime(60_000);
      });

      // Pré-condição: a coluna de 19/09 sobreviveu à virada, o modal segue aberto.
      expect(screen.getByRole('dialog')).toBeTruthy();

      // Se o modal ainda oferecer 18/09 (agora no passado), a Isabel pode escolhê-lo.
      const staleOption = screen.queryByRole('option', { name: formatDayHeading('2026-09-18') });
      if (staleOption) {
        fireEvent.change(screen.getByLabelText('Dia'), { target: { value: '2026-09-18' } });
      }
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

      // A tarefa nunca some: continua visível em alguma coluna da janela atual...
      expect(screen.getByText('Alvo')).toBeTruthy();
      // ...e nunca fica gravada com uma data anterior a hoje.
      const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}').tasks;
      expect(saved[0].date >= '2026-09-19').toBe(true);
    });

    // Resíduo cosmético do F3/A2: mesmo com o rollover garantindo que a
    // tarefa não some, o modal aberto atravessando a meia-noite seguia
    // oferecendo no <select> de Dia a janela antiga (o dia que virou passado,
    // sem o novo hoje+6).
    it('modal de edição aberto atravessando a meia-noite: o select de Dia passa a listar a janela atual', () => {
      vi.setSystemTime(new Date('2026-09-18T23:59:30'));
      seedTask({ id: 'alvo', title: 'Alvo', date: '2026-09-19', state: 'pending' });
      renderWeekView();

      const tomorrowColumn = screen.getByRole('heading', { name: formatDayHeading('2026-09-19') }).closest('section');
      fireEvent.click(within(tomorrowColumn as HTMLElement).getByText('Alvo'));
      const optionValues = () =>
        Array.from((screen.getByLabelText('Dia') as HTMLSelectElement).options).map((option) => option.value);
      expect(optionValues()).toEqual(getWeekWindow(new Date('2026-09-18T12:00:00')));

      act(() => {
        vi.setSystemTime(new Date('2026-09-19T00:00:31'));
        vi.advanceTimersByTime(60_000);
      });

      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(optionValues()).toEqual(getWeekWindow(new Date('2026-09-19T12:00:00')));
    });

    it('rollover com sucesso: nenhum aviso é mostrado', () => {
      seedTask({ title: 'Ficou pra trás', date: '2026-09-01', state: 'pending' });

      renderWeekView();

      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});

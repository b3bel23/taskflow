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

  // Desde a Story 3.1, `DayColumn` chama `useTaskActions()` (para ligar
  // `cycleState` ao `onCycleState` de cada `TaskCard`) incondicionalmente —
  // precisa de `TaskProvider` na árvore mesmo nos testes que não mexem com
  // Estado/persistência. Compartilhado por todos os `describe` abaixo
  // (revisão da Story 3.1: um único helper em vez de duplicado por escopo).
  function renderInProvider(date = '2026-09-21', isToday = false, tasks: Task[] = []) {
    return render(
      <TaskProvider>
        <DayColumn date={date} isToday={isToday} tasks={tasks} />
      </TaskProvider>,
    );
  }

  // Idem: semeia `localStorage` com uma única tarefa persistida antes de
  // montar `DayColumn` — usado pelos testes de edição (Story 2.2) e de
  // ciclo de Estado (Story 3.1), ambos precisando da mesma tarefa já
  // existente em `TaskContext`.
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

  it('recebe o destaque de hoje quando isToday é true', () => {
    const { container } = renderInProvider('2026-09-23', true);
    const column = container.firstElementChild;

    expect(column?.getAttribute('data-today')).toBe('true');
    // A classe CSS Module é o que de fato aplica o destaque visual
    // (fundo + borda) — o atributo data-today sozinho não garante isso.
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
    it('clicar em qualquer área do Card (exceto o StateIndicator) abre o Modal em edição, pré-preenchido', () => {
      const task = makeTask({ title: 'Escrever spec', priority: 'high' });
      renderWithTask(task);

      fireEvent.click(screen.getByText('Escrever spec'));

      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('Editar tarefa')).toBeTruthy();
      expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Escrever spec');
    });

    // `DayColumn` renderiza a lista a partir da prop `tasks` (recebida
    // pronta de `WeekView`, nunca lida de `TaskContext` por conta própria —
    // ver comentário do componente), então este teste isolado (prop fixa)
    // não vê o Indicador mudar de rótulo depois do clique; o que ele prova é
    // o essencial da Story 3.1 neste nível: não abre o Modal, e a escrita em
    // `localStorage` reflete o ciclo (Estado real mudou via `cycleState`). A
    // reflexão imediata na tela, ponta a ponta via `TaskContext`, é coberta
    // em `WeekView.test.tsx` (onde `tasks` de fato vem do contexto).
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

  // `DayColumn` recebe `tasks` pronta de `WeekView` (nunca lê `TaskContext`
  // por conta própria para montar a lista — ver comentário do componente),
  // então um render isolado com prop fixa não reflete no DOM o Estado que
  // `cycleState` mudou no `TaskContext`. Estes testes verificam o que dá para
  // verificar neste nível (não abrir o Modal, e o array persistido em
  // `localStorage`, que é o que `cycleState` de fato escreve/protege via o
  // guard AD-4). A reflexão imediata na tela, ponta a ponta via
  // `TaskContext`, é coberta em `WeekView.test.tsx`.
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

    it('clique no Indicador de tarefa Em andamento persiste Concluída', () => {
      const task = makeTask({ state: 'in_progress' });
      renderWithTask(task);

      fireEvent.click(screen.getByRole('button', { name: 'Em andamento' }));

      expect(savedState()).toBe('done');
    });

    it('clique no Indicador de tarefa Concluída persiste Pendente (wraparound)', () => {
      const task = makeTask({ state: 'done' });
      renderWithTask(task);

      fireEvent.click(screen.getByRole('button', { name: 'Concluída' }));

      expect(savedState()).toBe('pending');
    });

    it('Indicador em foco: Enter cicla o Estado como o clique', () => {
      const task = makeTask({ state: 'pending' });
      renderWithTask(task);

      fireEvent.keyDown(screen.getByRole('button', { name: 'Pendente' }), { key: 'Enter' });

      expect(savedState()).toBe('in_progress');
    });

    it('Indicador em foco: Espaço cicla o Estado como o clique', () => {
      const task = makeTask({ state: 'pending' });
      renderWithTask(task);

      fireEvent.keyDown(screen.getByRole('button', { name: 'Pendente' }), { key: ' ' });

      expect(savedState()).toBe('in_progress');
    });

    it('escrita em localStorage falha: nada é persistido, sem nova tentativa automática', () => {
      const task = makeTask({ state: 'pending' });
      renderWithTask(task);

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      fireEvent.click(screen.getByRole('button', { name: 'Pendente' }));

      // O `setItem` mockado lança em toda escrita, então o `localStorage`
      // mantém o snapshot de antes do clique (seedado por `renderWithTask`) —
      // nunca chega a gravar o array com o novo Estado.
      expect(savedState()).toBe('pending');
    });

    it('clicar em qualquer outra área do Card continua abrindo o Modal, sem ciclar o Estado', () => {
      const task = makeTask({ title: 'Escrever spec', state: 'pending' });
      renderWithTask(task);

      fireEvent.click(screen.getByText('Escrever spec'));

      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(savedState()).toBe('pending');
    });
  });

  // Story 4.2 (Epic 4): as 4 zonas de Prioridade por Dia existem sempre,
  // mesmo vazias — é isso que torna qualquer faixa de qualquer dia um alvo
  // de arraste válido (cruzar grupo, Prioridade e/ou Data; a decisão pura
  // fica em `dragChange.test.ts`, testada por eventos sintéticos, já que
  // simular um gesto físico de arraste não é viável sob jsdom). Aqui só a
  // estrutura renderizada: as 4 zonas continuam presentes independente de
  // terem tarefa hoje, e discretas (sem rótulo) fora de um arraste ativo.
  describe('As 4 zonas de Prioridade sempre presentes (Story 4.2)', () => {
    it('renderiza as 4 zonas (Alta/Média/Baixa/Sem prioridade), nessa ordem, mesmo com o dia vazio', () => {
      const { container } = renderInProvider();

      const zones = container.querySelectorAll('[data-priority-zone]');
      expect(Array.from(zones).map((zone) => zone.getAttribute('data-priority-zone'))).toEqual([
        'high',
        'medium',
        'low',
        'none',
      ]);
    });

    it('zona sem tarefa continua presente no DOM (alvo de arraste válido), sem nenhum Card dentro', () => {
      const highTask = makeTask({ id: 'a', priority: 'high' });
      const { container } = renderInProvider('2026-09-21', false, [highTask]);

      const mediumZone = container.querySelector('[data-priority-zone="medium"]');
      expect(mediumZone).toBeTruthy();
      expect(within(mediumZone as HTMLElement).queryAllByRole('listitem')).toHaveLength(0);
    });

    // Revisão da Story 4.2 (verification-gap/blind-hunter): o teste acima só
    // verifica a zona vazia; nada até aqui garantia que uma tarefa com
    // Prioridade definida de fato aparece DENTRO da zona correspondente (em
    // vez de só aparecer em algum lugar do DOM). Testa as 4 zonas juntas para
    // também confirmar que uma tarefa nunca aparece em mais de uma zona.
    it('cada tarefa aparece dentro da zona da sua própria Prioridade, nunca em outra', () => {
      const highTask = makeTask({ id: 'a', title: 'Tarefa Alta', priority: 'high' });
      const lowTask = makeTask({ id: 'b', title: 'Tarefa Baixa', priority: 'low' });
      const noneTask = makeTask({ id: 'c', title: 'Tarefa Sem Prioridade', priority: null });
      const { container } = renderInProvider('2026-09-21', false, [highTask, lowTask, noneTask]);

      const zone = (priority: string) => container.querySelector(`[data-priority-zone="${priority}"]`) as HTMLElement;

      expect(within(zone('high')).getByText('Tarefa Alta')).toBeTruthy();
      expect(within(zone('low')).getByText('Tarefa Baixa')).toBeTruthy();
      expect(within(zone('none')).getByText('Tarefa Sem Prioridade')).toBeTruthy();

      // Nenhuma tarefa vaza para uma zona que não é a sua.
      expect(within(zone('high')).queryByText('Tarefa Baixa')).toBeNull();
      expect(within(zone('medium')).queryAllByRole('listitem')).toHaveLength(0);
    });

    it('rótulo da zona ("Alta" etc.) não aparece no DOM fora de um arraste ativo (discreta)', () => {
      // `queryByText('Alta')` sozinho combinaria com a `PriorityTag` do
      // próprio Card (também mostra "Alta") — a checagem precisa ser
      // especificamente sobre o rótulo da zona (`.zoneLabel`), não sobre
      // qualquer texto "Alta" na árvore.
      const { container } = renderInProvider('2026-09-21', false, [makeTask({ priority: 'high' })]);

      // Sem nenhum arraste em andamento, `useDragOperation().source` é nulo
      // (`DragDropManager` compartilhado por padrão fora de um
      // `DragDropProvider`, ver `WeekView.tsx`) — o rótulo da zona não é
      // renderizado, só o Card em si.
      expect(container.querySelector(`.${styles.zoneLabel}`)).toBeNull();
    });
  });
});

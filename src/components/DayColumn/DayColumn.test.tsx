import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/react';
import { DayColumn, groupTasksByPriority, resolveDragReorder } from './DayColumn';
import styles from './DayColumn.module.css';
import { TaskProvider } from '../../state/TaskContext';
import { TASKS_STORAGE_KEY } from '../../storage/tasksStorage';
import type { DayOfWeek, Task } from '../../types';

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

// Constrói um `DragEndEvent` sintético — `move()` (`@dnd-kit/helpers`) só lê
// `operation.{source,target,canceled}` para o caso de array plano de ids que
// `resolveDragReorder` usa, então não precisa de instâncias reais de
// `Draggable`/`Droppable` nem de gesto físico simulado. `source.index` é o
// mesmo índice já projetado que tanto o mouse quanto o sensor de teclado do
// @dnd-kit produzem em tempo real.
function makeDragEndEvent(overrides: {
  sourceId?: string;
  sourceIndex?: number;
  targetId?: string;
  canceled?: boolean;
}): DragEndEvent {
  const { sourceId, sourceIndex, targetId, canceled = false } = overrides;
  return {
    operation: {
      source: sourceId === undefined ? null : { id: sourceId, index: sourceIndex },
      target: targetId === undefined ? null : { id: targetId },
      canceled,
    },
    canceled,
    nativeEvent: undefined,
    suspend: () => ({ resume: () => {}, abort: () => {} }),
  } as unknown as DragEndEvent;
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
  function renderInProvider(day: DayOfWeek = 'mon', isToday = false, tasks: Task[] = []) {
    return render(
      <TaskProvider>
        <DayColumn day={day} isToday={isToday} tasks={tasks} />
      </TaskProvider>,
    );
  }

  // Idem: semeia `localStorage` com uma única tarefa persistida antes de
  // montar `DayColumn` — usado pelos testes de edição (Story 2.2) e de
  // ciclo de Estado (Story 3.1), ambos precisando da mesma tarefa já
  // existente em `TaskContext`.
  function renderWithTask(task: Task) {
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, tasks: [task] }));
    return render(
      <TaskProvider>
        <DayColumn day={task.day} isToday={false} tasks={[task]} />
      </TaskProvider>,
    );
  }

  it('mostra "Nenhuma tarefa" quando não há tarefas, e o controle "+ Adicionar tarefa" sempre visível', () => {
    renderInProvider();

    expect(screen.getByText('Nenhuma tarefa')).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ Adicionar tarefa' })).toBeTruthy();
  });

  it('renderiza um TaskCard por tarefa recebida, em vez de "Nenhuma tarefa"', () => {
    renderInProvider('mon', false, [makeTask({ title: 'Escrever spec' })]);

    expect(screen.getByText('Escrever spec')).toBeTruthy();
    expect(screen.queryByText('Nenhuma tarefa')).toBeNull();
  });

  it('recebe o destaque de hoje quando isToday é true', () => {
    const { container } = renderInProvider('wed', true);
    const column = container.firstElementChild;

    expect(column?.getAttribute('data-today')).toBe('true');
    // A classe CSS Module é o que de fato aplica o destaque visual
    // (fundo + borda) — o atributo data-today sozinho não garante isso.
    expect(column?.classList.contains(styles.today)).toBe(true);
  });

  it('não recebe o destaque de hoje quando isToday é false', () => {
    const { container } = renderInProvider('wed', false);
    const column = container.firstElementChild;

    expect(column?.getAttribute('data-today')).toBe('false');
    expect(column?.classList.contains(styles.today)).toBe(false);
  });

  it('identifica a coluna pelo nome do dia', () => {
    renderInProvider('sun');

    expect(screen.getByLabelText('Domingo')).toBeTruthy();
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

  // Story 4.1: `resolveDragReorder` é a lógica que o handler de `onDragEnd`
  // de fato executa — testada aqui diretamente com eventos sintéticos,
  // porque simular um gesto físico de arraste (mouse ou sensor de teclado
  // real do @dnd-kit) não é viável sob jsdom (limitação conhecida). Isto
  // cobre a MESMA computação que o mouse e o teclado disparam, já que ambos
  // produzem o mesmo formato de `DragEndEvent` — só a origem física do
  // evento (não testável aqui) muda.
  describe('Reordenar por arraste dentro do grupo (Story 4.1)', () => {
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' }), makeTask({ id: 'c' })];

    it('reordena: solta a tarefa "b" (índice 1) na posição 2', () => {
      const event = makeDragEndEvent({ sourceId: 'b', sourceIndex: 2, targetId: 'c' });

      expect(resolveDragReorder(tasks, event)).toEqual({ id: 'b', toIndex: 2 });
    });

    it('cancelado (Esc): retorna null, nada a persistir', () => {
      const event = makeDragEndEvent({ sourceId: 'b', sourceIndex: 2, targetId: 'c', canceled: true });

      expect(resolveDragReorder(tasks, event)).toBeNull();
    });

    it('grupo com 1 tarefa: soltar sobre si mesma não move nada, retorna null', () => {
      const single = [makeTask({ id: 'only' })];
      const event = makeDragEndEvent({ sourceId: 'only', sourceIndex: 0, targetId: 'only' });

      expect(resolveDragReorder(single, event)).toBeNull();
    });

    it('sem origem/destino identificável: retorna null em vez de lançar', () => {
      const event = makeDragEndEvent({});

      expect(resolveDragReorder(tasks, event)).toBeNull();
    });

    // Revisão da Story 4.1 (blind-hunter): soltar fora de qualquer alvo
    // válido (ex. fora da coluna) — origem existe, mas sem destino.
    it('origem válida sem destino (solta fora de qualquer alvo): retorna null', () => {
      const event = makeDragEndEvent({ sourceId: 'b', sourceIndex: 1 });

      expect(resolveDragReorder(tasks, event)).toBeNull();
    });
  });

  // Revisão da Story 4.1 (verification-gap): `groupTasksByPriority` decide
  // quais tarefas compartilham um `DragDropProvider` — ou seja, quais podem
  // ser reordenadas entre si. `TaskPriorityGroup` não renderiza nenhum nó
  // DOM próprio, então testar só a ordem final no DOM não distinguiria um
  // agrupamento correto de cada tarefa isolada no próprio grupo — por isso
  // esta função é testada diretamente aqui.
  describe('groupTasksByPriority (Story 4.1)', () => {
    it('tarefas contíguas da mesma prioridade viram um único grupo', () => {
      const highA = makeTask({ id: 'a', priority: 'high' });
      const highB = makeTask({ id: 'b', priority: 'high' });
      const low = makeTask({ id: 'c', priority: 'low' });

      const groups = groupTasksByPriority([highA, highB, low]);

      expect(groups).toEqual([
        { key: 'high', tasks: [highA, highB] },
        { key: 'low', tasks: [low] },
      ]);
    });

    it('ausência de prioridade agrupa sob a chave "none", distinta dos níveis nomeados', () => {
      const noPriority = makeTask({ id: 'a', priority: null });

      expect(groupTasksByPriority([noPriority])).toEqual([{ key: 'none', tasks: [noPriority] }]);
    });

    it('grupos não-contíguos da mesma prioridade NÃO se fundem (a entrada já vem ordenada por sortTasksInDay)', () => {
      const highA = makeTask({ id: 'a', priority: 'high' });
      const low = makeTask({ id: 'b', priority: 'low' });
      const highC = makeTask({ id: 'c', priority: 'high' });

      const groups = groupTasksByPriority([highA, low, highC]);

      expect(groups).toEqual([
        { key: 'high', tasks: [highA] },
        { key: 'low', tasks: [low] },
        { key: 'high', tasks: [highC] },
      ]);
    });

    it('lista vazia: nenhum grupo', () => {
      expect(groupTasksByPriority([])).toEqual([]);
    });
  });
});

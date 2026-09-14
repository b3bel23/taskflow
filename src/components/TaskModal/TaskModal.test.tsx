import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskProvider } from '../../state/TaskContext';
import { TASKS_STORAGE_KEY } from '../../storage/tasksStorage';
import type { Task } from '../../types';
import { TaskModal } from './TaskModal';

function renderModal(onClose = vi.fn()) {
  render(
    <TaskProvider>
      <TaskModal day="wed" onClose={onClose} />
    </TaskProvider>,
  );
  return onClose;
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Revisar PR',
    day: 'wed',
    state: 'pending',
    priority: null,
    order: 0,
    ...overrides,
  };
}

// Semeia `localStorage` com a tarefa antes de montar o `TaskProvider` — o
// init lazy de `TaskContext` (`loadTasks()`) só roda na primeira
// renderização, então isto garante que `updateTask` encontre a tarefa em
// `state.tasks` (mesmo caminho real: editar uma tarefa já persistida).
function renderEditModal(task: Task, onClose = vi.fn()) {
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, tasks: [task] }));
  render(
    <TaskProvider>
      <TaskModal day={task.day} task={task} onClose={onClose} />
    </TaskProvider>,
  );
  return onClose;
}

// Simula uma tarefa removida em outra sessão/aba enquanto este modal segue
// aberto com os dados antigos: o `TaskProvider` carrega um estado *sem* a
// tarefa (retrospectiva Epic 2, achado 3), mas o modal (que recebeu `task`
// via prop antes disso acontecer) ainda a exibe normalmente.
function renderEditModalForMissingTask(task: Task, onClose = vi.fn()) {
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, tasks: [] }));
  render(
    <TaskProvider>
      <TaskModal day={task.day} task={task} onClose={onClose} />
    </TaskProvider>,
  );
  return onClose;
}

function getSavedTasks(): Task[] {
  return JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}').tasks ?? [];
}

describe('TaskModal', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('abre com Nome vazio e em foco, Dia fixo (coluna de origem), nenhuma Prioridade pré-selecionada', () => {
    renderModal();

    const nameInput = screen.getByLabelText('Nome') as HTMLInputElement;
    expect(document.activeElement).toBe(nameInput);
    expect(nameInput.value).toBe('');
    expect(screen.getByText('Quarta-feira')).toBeTruthy();
    expect((screen.getByLabelText('Prioridade') as HTMLSelectElement).value).toBe('');
  });

  it('confirma com Nome vazio: modal permanece aberto sinalizando o campo, nenhuma tarefa criada', () => {
    const onClose = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Nome é obrigatório.');
    expect(window.localStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
  });

  it('confirma com Nome só com espaços: rejeitado exatamente como Nome vazio', () => {
    const onClose = renderModal();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Nome é obrigatório.');
    expect(window.localStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
  });

  it('criação feliz: preenche Nome + Prioridade, confirma, cria a tarefa pending e fecha o modal', () => {
    const onClose = renderModal();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Revisar PR' } });
    fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toHaveLength(1);
    expect(saved.tasks[0]).toMatchObject({
      title: 'Revisar PR',
      day: 'wed',
      state: 'pending',
      priority: 'high',
      order: 0,
    });
  });

  it('criação sem selecionar Prioridade: tarefa persistida com priority null', () => {
    const onClose = renderModal();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Revisar PR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks).toHaveLength(1);
    expect(saved.tasks[0]).toMatchObject({
      title: 'Revisar PR',
      day: 'wed',
      state: 'pending',
      priority: null,
      order: 0,
    });
  });

  it('nome com espaços nas pontas é aparado antes de salvar', () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '  Revisar PR  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));

    const saved = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}');
    expect(saved.tasks[0].title).toBe('Revisar PR');
  });

  it('escrita falha: modal aberto com erro inline, campos preservados, nunca retry automático, nenhuma tarefa até sucesso', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const onClose = renderModal();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Revisar PR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Não foi possível salvar a tarefa. Tente novamente.')).toBeTruthy();
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Revisar PR');
    expect(window.localStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();

    // Nunca uma nova tentativa automática e silenciosa: só um novo clique
    // explícito tenta salvar de novo.
    vi.restoreAllMocks();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc fecha o modal descartando o que não foi salvo', () => {
    const onClose = renderModal();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Não deveria salvar' } });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
  });

  it('modal retém o foco: Tab a partir do último elemento focável volta ao primeiro, nunca escapando do modal', () => {
    renderModal();

    const nameInput = screen.getByLabelText('Nome') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: 'Adicionar tarefa' });

    // Nome já está em foco na abertura (primeiro elemento focável) — move
    // manualmente para o último (botão) para simular o fim do ciclo de Tab.
    submitButton.focus();
    expect(document.activeElement).toBe(submitButton);

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(document.activeElement).toBe(nameInput);
  });

  it('modal retém o foco: Shift+Tab a partir do primeiro elemento focável volta ao último, nunca escapando do modal', () => {
    renderModal();

    const nameInput = screen.getByLabelText('Nome') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: 'Adicionar tarefa' });

    expect(document.activeElement).toBe(nameInput);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(submitButton);
  });
});

describe('TaskModal — modo edição (Story 2.2)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('abre pré-preenchido com Nome/Dia/Prioridade/Estado atuais, título "Editar tarefa"', () => {
    const task = makeTask({ title: 'Revisar PR', day: 'wed', priority: 'high', state: 'in_progress' });
    renderEditModal(task);

    expect(screen.getByText('Editar tarefa')).toBeTruthy();
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Revisar PR');
    expect((screen.getByLabelText('Dia') as HTMLSelectElement).value).toBe('wed');
    expect((screen.getByLabelText('Prioridade') as HTMLSelectElement).value).toBe('high');
    expect((screen.getByLabelText('Estado') as HTMLSelectElement).value).toBe('in_progress');
  });

  it('campo Dia tem as 7 opções da semana; campo Estado tem as 3 opções', () => {
    renderEditModal(makeTask());

    const dayOptions = screen.getByLabelText('Dia') as HTMLSelectElement;
    expect(dayOptions.options.length).toBe(7);

    const stateOptions = screen.getByLabelText('Estado') as HTMLSelectElement;
    expect(Array.from(stateOptions.options).map((o) => o.value)).toEqual(['pending', 'in_progress', 'done']);
  });

  it('sem prioridade: campo Prioridade abre em "Sem prioridade" (valor vazio)', () => {
    renderEditModal(makeTask({ priority: null }));

    expect((screen.getByLabelText('Prioridade') as HTMLSelectElement).value).toBe('');
  });

  it('edição feliz (só Nome): Nome atualizado, resto inalterado, modal fecha', () => {
    const task = makeTask({ title: 'Original', day: 'wed', priority: 'medium', state: 'pending' });
    const onClose = renderEditModal(task);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Renomeada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    const [saved] = getSavedTasks();
    expect(saved).toMatchObject({ id: task.id, title: 'Renomeada', day: 'wed', priority: 'medium', state: 'pending' });
  });

  it('muda o Dia e confirma: tarefa sai da coluna antiga e entra na nova; Estado não muda', () => {
    const task = makeTask({ day: 'mon', priority: null, state: 'done' });
    const onClose = renderEditModal(task);

    fireEvent.change(screen.getByLabelText('Dia'), { target: { value: 'fri' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    const [saved] = getSavedTasks();
    expect(saved).toMatchObject({ day: 'fri', state: 'done' });
  });

  it('muda a Prioridade e confirma: reposicionada conforme o novo nível', () => {
    const task = makeTask({ priority: 'low' });
    const onClose = renderEditModal(task);

    fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    const [saved] = getSavedTasks();
    expect(saved).toMatchObject({ priority: 'high' });
  });

  it('muda o Estado e confirma: novo Estado persistido', () => {
    const task = makeTask({ state: 'pending' });
    const onClose = renderEditModal(task);

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'done' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    const [saved] = getSavedTasks();
    expect(saved).toMatchObject({ state: 'done' });
  });

  it('muda Título/Dia/Prioridade sem tocar Estado: Estado permanece o mesmo', () => {
    const task = makeTask({ day: 'mon', priority: null, state: 'in_progress' });
    const onClose = renderEditModal(task);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Novo nome' } });
    fireEvent.change(screen.getByLabelText('Dia'), { target: { value: 'tue' } });
    fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: 'low' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    const [saved] = getSavedTasks();
    expect(saved).toMatchObject({ title: 'Novo nome', day: 'tue', priority: 'low', state: 'in_progress' });
  });

  it('confirma com Nome vazio: modal aberto, campo sinalizado, nada persistido (tarefa mantém valores antigos)', () => {
    const task = makeTask({ title: 'Original' });
    const onClose = renderEditModal(task);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Nome é obrigatório.');
    const [saved] = getSavedTasks();
    expect(saved).toMatchObject({ title: 'Original' });
  });

  it('escrita falha: modal aberto, erro inline, valores preservados, tarefa mantém valores antigos até sucesso', () => {
    const task = makeTask({ title: 'Original', day: 'wed', priority: 'high', state: 'pending' });
    const onClose = renderEditModal(task);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Mudou mas não salvou' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Não foi possível salvar a tarefa. Tente novamente.')).toBeTruthy();
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Mudou mas não salvou');

    vi.restoreAllMocks();
    const [saved] = getSavedTasks();
    expect(saved).toMatchObject({ title: 'Original', day: 'wed', priority: 'high', state: 'pending' });
  });

  // Retrospectiva Epic 2 (achado 3): "Tarefa não encontrada." é
  // irrecuperável (a tarefa já não existe) — não pode reaproveitar a
  // mensagem genérica que convida a "Tente novamente.".
  it('tarefa removida em outra sessão: mensagem distinta, sem convidar a um retry inútil', () => {
    const task = makeTask({ title: 'Original' });
    const onClose = renderEditModalForMissingTask(task);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByText('Esta tarefa não existe mais — ela pode ter sido removida em outra sessão. Feche o modal.'),
    ).toBeTruthy();
    expect(screen.queryByText('Não foi possível salvar a tarefa. Tente novamente.')).toBeNull();
  });
});

describe('TaskModal — Excluir tarefa com confirmação (Story 2.3)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('modo criação: link "Excluir tarefa" não existe', () => {
    renderModal();

    expect(screen.queryByText('Excluir tarefa')).toBeNull();
  });

  it('abre confirmação: clica "Excluir tarefa", conteúdo vira Confirmação com texto e botões exatos, nunca um segundo modal', () => {
    const task = makeTask();
    renderEditModal(task);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));

    expect(screen.getByText('Excluir esta tarefa? Essa ação não pode ser desfeita.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeTruthy();
    // Conteúdo de edição sumiu (substituído, não empilhado atrás)
    expect(screen.queryByLabelText('Nome')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
    // Um único `dialog` na árvore — nunca um segundo modal/dialog empilhado
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('cancela: clica "Cancelar" na Confirmação, volta à edição preservando os valores exibidos, tarefa intacta', () => {
    const task = makeTask({ title: 'Original' });
    renderEditModal(task);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Editado mas não salvo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Editado mas não salvo');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeTruthy();
    const [saved] = getSavedTasks();
    expect(saved).toMatchObject({ title: 'Original' });
  });

  it('cancela: foco volta para o link "Excluir tarefa" que abriu a Confirmação', () => {
    renderEditModal(makeTask());

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Excluir tarefa' }));
  });

  // Retrospectiva Epic 2 (achado 2): um erro de Nome/Salvar anterior não
  // pode sobreviver a uma passagem pela Confirmação de Exclusão sem relação
  // com ele.
  it('cancela: um erro de "Nome obrigatório" anterior não reaparece ao voltar da Confirmação', () => {
    renderEditModal(makeTask());

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert').textContent).toBe('Nome é obrigatório.');

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Nome é obrigatório.')).toBeNull();
    expect(screen.getByLabelText('Nome').getAttribute('aria-invalid')).toBe('false');
  });

  it('Esc na confirmação: um erro de "Não foi possível salvar" anterior não reaparece ao voltar à edição', () => {
    const task = makeTask();
    renderEditModal(task);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Não foi possível salvar a tarefa. Tente novamente.')).toBeTruthy();
    vi.restoreAllMocks();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Não foi possível salvar a tarefa. Tente novamente.')).toBeNull();
  });

  it('Esc na confirmação: volta ao modo edição (mesmo efeito de "Cancelar"), campo editado sobrevive, modal não fecha', () => {
    const task = makeTask({ title: 'Original' });
    const onClose = renderEditModal(task, vi.fn());

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Editado mas não salvo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeTruthy();
    expect(screen.queryByText('Excluir esta tarefa? Essa ação não pode ser desfeita.')).toBeNull();
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Editado mas não salvo');
    const [saved] = getSavedTasks();
    expect(saved).toMatchObject({ id: task.id, title: 'Original' });
  });

  it('Esc na confirmação: foco volta para o link "Excluir tarefa" que abriu a Confirmação', () => {
    renderEditModal(makeTask());

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Excluir tarefa' }));
  });

  it('focus trap na Confirmação: Tab a partir de "Excluir" (último) volta para "Cancelar" (primeiro)', () => {
    renderEditModal(makeTask());

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));

    const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
    const deleteButton = screen.getByRole('button', { name: 'Excluir' });

    deleteButton.focus();
    expect(document.activeElement).toBe(deleteButton);

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(document.activeElement).toBe(cancelButton);
  });

  it('focus trap na Confirmação: Shift+Tab a partir de "Cancelar" (primeiro, já em foco) volta para "Excluir" (último)', () => {
    renderEditModal(makeTask());

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));

    const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
    const deleteButton = screen.getByRole('button', { name: 'Excluir' });

    // "Cancelar" já recebe foco automático ao abrir a Confirmação.
    expect(document.activeElement).toBe(cancelButton);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(deleteButton);
  });

  it('exclui feliz: escrita ok, tarefa some dos dados persistidos e o modal fecha', () => {
    const task = makeTask();
    const onClose = renderEditModal(task);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getSavedTasks()).toHaveLength(0);
  });

  it('exclui com grupo maior: 3 tarefas no mesmo (day,priority), exclui a do meio, restantes reindexadas sequencialmente (0,1)', () => {
    const first = makeTask({ id: 'a', title: 'Primeira', day: 'wed', priority: 'high', order: 0 });
    const middle = makeTask({ id: 'b', title: 'Do meio', day: 'wed', priority: 'high', order: 1 });
    const last = makeTask({ id: 'c', title: 'Última', day: 'wed', priority: 'high', order: 2 });
    window.localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, tasks: [first, middle, last] }),
    );
    const onClose = vi.fn();
    render(
      <TaskProvider>
        <TaskModal day="wed" task={middle} onClose={onClose} />
      </TaskProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    const saved = getSavedTasks();
    expect(saved).toHaveLength(2);
    expect(saved.find((t) => t.id === 'a')).toMatchObject({ order: 0 });
    expect(saved.find((t) => t.id === 'c')).toMatchObject({ order: 1 });
  });

  it('escrita falha: confirmação continua visível com erro inline, tarefa não some até sucesso, nunca retry automático', () => {
    const task = makeTask();
    const onClose = renderEditModal(task);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Não foi possível excluir a tarefa. Tente novamente.')).toBeTruthy();
    expect(screen.getByText('Excluir esta tarefa? Essa ação não pode ser desfeita.')).toBeTruthy();

    vi.restoreAllMocks();
    const [saved] = getSavedTasks();
    expect(saved).toMatchObject({ id: task.id });

    // Nunca uma nova tentativa automática e silenciosa: só um novo clique
    // explícito tenta excluir de novo.
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getSavedTasks()).toHaveLength(0);
  });

  // Retrospectiva Epic 2 (achado 3): mesma distinção do lado de `Salvar`.
  it('tarefa já removida em outra sessão: mensagem distinta, sem convidar a um retry inútil', () => {
    const task = makeTask();
    const onClose = renderEditModalForMissingTask(task);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Esta tarefa já foi excluída em outra sessão.')).toBeTruthy();
    expect(screen.queryByText('Não foi possível excluir a tarefa. Tente novamente.')).toBeNull();
  });
});

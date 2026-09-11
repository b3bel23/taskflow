import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskProvider } from '../../state/TaskContext';
import { TASKS_STORAGE_KEY } from '../../storage/tasksStorage';
import { TaskModal } from './TaskModal';

function renderModal(onClose = vi.fn()) {
  render(
    <TaskProvider>
      <TaskModal day="wed" onClose={onClose} />
    </TaskProvider>,
  );
  return onClose;
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

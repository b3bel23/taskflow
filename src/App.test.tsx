import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { TASKS_STORAGE_KEY } from './storage/tasksStorage';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('compõe Header e WeekView com o Cabeçalho fora da grade de dias', () => {
    render(<App />);

    const header = screen.getByRole('banner');
    const main = screen.getByRole('main');

    expect(main.contains(header)).toBe(false);
  });

  it('sempre exibe o aviso estático de dados locais, mesmo sem nenhum dado salvo', () => {
    render(<App />);

    expect(
      screen.getByText('Os dados ficam salvos apenas neste navegador/computador.'),
    ).toBeTruthy();
    expect(
      screen.queryByText('Não foi possível carregar as tarefas salvas — começando do zero.'),
    ).toBeNull();
  });

  it('dado corrompido: app nunca trava, cai no estado vazio e mostra o aviso de erro uma vez', () => {
    window.localStorage.setItem(TASKS_STORAGE_KEY, '{not valid json');

    expect(() => render(<App />)).not.toThrow();
    expect(
      screen.getByText('Não foi possível carregar as tarefas salvas — começando do zero.'),
    ).toBeTruthy();
    // A Coluna do Dia continua "Nenhuma tarefa" — nunca uma tela de erro.
    expect(screen.getAllByText('Nenhuma tarefa')).toHaveLength(7);
  });
});

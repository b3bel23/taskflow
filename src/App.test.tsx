import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { TASKS_STORAGE_KEY } from './storage/tasksStorage';
import { THEME_STORAGE_KEY } from './storage/themeStorage';

function cleanRootTheme() {
  delete document.documentElement.dataset.theme;
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanRootTheme();
  });

  afterEach(() => {
    cleanRootTheme();
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

  it('primeiro uso: sem chave de tema salva, aplica "light" já na primeira renderização, nunca via prefers-color-scheme', () => {
    render(<App />);

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Mudar para tema escuro' })).toBeTruthy();
  });

  it('reabertura: tema salvo é aplicado imediatamente ao inicializar, sem piscar o tema padrão antes', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(<App />);

    // Sem `useEffect`/segundo render para "corrigir" o tema — já nasce correto.
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Mudar para tema claro' })).toBeTruthy();
  });

  it('clique no Alternador de Tema muda o tema instantaneamente e persiste como string crua', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Mudar para tema escuro' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    // Fechar e reabrir (remount): o último tema escolhido continua aplicado.
    cleanRootTheme();
    const { unmount } = render(<App />);
    expect(document.documentElement.dataset.theme).toBe('dark');
    unmount();
  });

  it('tema é independente de tarefas: dado de tarefas corrompido não afeta o tema salvo', () => {
    window.localStorage.setItem(TASKS_STORAGE_KEY, '{not valid json');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(<App />);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(
      screen.getByText('Não foi possível carregar as tarefas salvas — começando do zero.'),
    ).toBeTruthy();
  });
});

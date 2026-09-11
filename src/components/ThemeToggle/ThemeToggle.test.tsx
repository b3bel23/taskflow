import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { THEME_STORAGE_KEY } from '../../storage/themeStorage';
import { ThemeProvider } from '../../state/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import styles from './ThemeToggle.module.css';

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

function cleanRootTheme() {
  delete document.documentElement.dataset.theme;
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanRootTheme();
  });

  afterEach(() => {
    cleanRootTheme();
  });

  it('tema "light": ícone do sol ativo, rótulo oferece mudar para escuro', () => {
    renderToggle();

    const button = screen.getByRole('button', { name: 'Mudar para tema escuro' });
    expect(button.getAttribute('data-theme-active')).toBe('light');
    expect(screen.getByTestId('theme-toggle-sun').classList.contains(styles.iconActive)).toBe(
      true,
    );
    expect(screen.getByTestId('theme-toggle-moon').classList.contains(styles.iconActive)).toBe(
      false,
    );
  });

  it('tema "dark": ícone da lua ativo, rótulo oferece mudar para claro', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderToggle();

    const button = screen.getByRole('button', { name: 'Mudar para tema claro' });
    expect(button.getAttribute('data-theme-active')).toBe('dark');
    expect(screen.getByTestId('theme-toggle-moon').classList.contains(styles.iconActive)).toBe(
      true,
    );
    expect(screen.getByTestId('theme-toggle-sun').classList.contains(styles.iconActive)).toBe(
      false,
    );
  });

  it('clique alterna o tema instantaneamente: data-theme muda, ícone ativo acompanha, e salva como string crua', () => {
    renderToggle();

    expect(document.documentElement.dataset.theme).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'Mudar para tema escuro' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Mudar para tema claro' })).toBeTruthy();
    expect(screen.getByTestId('theme-toggle-moon').classList.contains(styles.iconActive)).toBe(
      true,
    );
  });

  it('tem rótulo explícito em vez de depender só do ícone', () => {
    renderToggle();

    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(
      'Mudar para tema escuro',
    );
  });
});

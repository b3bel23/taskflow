import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { THEME_STORAGE_KEY } from '../storage/themeStorage';
import { ThemeProvider, useThemeContext } from './ThemeContext';

function ThemeProbe() {
  const { theme } = useThemeContext();
  return <p data-testid="probe">{theme}</p>;
}

function cleanRootTheme() {
  delete document.documentElement.dataset.theme;
}

describe('ThemeContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanRootTheme();
  });

  afterEach(() => {
    cleanRootTheme();
  });

  it('primeiro uso: sem chave salva, tema inicial é "light" e já aplicado em data-theme', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('probe').textContent).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('init lazy lê o tema salvo e já aplica data-theme antes da 1ª renderização (sem flash)', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('probe').textContent).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('valor salvo não reconhecido cai em "light", nunca em prefers-color-scheme', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('probe').textContent).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('useThemeContext fora de um ThemeProvider lança um erro claro', () => {
    expect(() => render(<ThemeProbe />)).toThrow(
      'useThemeContext deve ser usado dentro de um ThemeProvider',
    );
  });
});

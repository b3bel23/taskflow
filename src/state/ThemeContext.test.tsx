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

  // Retro Epic 1, item 21 — o teste acima só olha `data-theme` DEPOIS que o
  // React já commitou e rodou os efeitos, quando tanto a escrita síncrona no
  // inicializador quanto a escrita de um efeito de montagem dão o mesmo
  // resultado. O que importa para evitar o flash é o valor visível ANTES da
  // pintura, isto é, durante a PRIMEIRA renderização: um filho lê
  // `data-theme` no corpo do próprio render. Só a escrita síncrona dentro do
  // inicializador lazy faz esse valor já ser 'dark' aqui; um efeito de
  // montagem (`useEffect`/`useLayoutEffect`) só rodaria depois desse render.
  it('data-theme já é o tema salvo DURANTE a 1ª renderização (só a escrita síncrona do inicializador garante isso)', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const seenDuringFirstRender: (string | undefined)[] = [];

    function FirstRenderSpy() {
      seenDuringFirstRender.push(document.documentElement.dataset.theme);
      return null;
    }

    render(
      <ThemeProvider>
        <FirstRenderSpy />
      </ThemeProvider>,
    );

    expect(seenDuringFirstRender[0]).toBe('dark');
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

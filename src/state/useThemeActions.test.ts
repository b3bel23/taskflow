import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { THEME_STORAGE_KEY } from '../storage/themeStorage';
import { ThemeProvider, useThemeContext } from './ThemeContext';
import { useThemeActions } from './useThemeActions';

// Sem JSX neste arquivo (`.test.ts`, como o Code Map da spec pede) —
// `createElement` monta o wrapper do `renderHook`.
function wrapper({ children }: { children: ReactNode }) {
  return createElement(ThemeProvider, null, children);
}

function useProbe() {
  return { ...useThemeContext(), ...useThemeActions() };
}

function cleanRootTheme() {
  delete document.documentElement.dataset.theme;
}

describe('useThemeActions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanRootTheme();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanRootTheme();
  });

  it('toggle com sucesso: salva antes de despachar, tema muda e data-theme acompanha', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });
    expect(result.current.theme).toBe('light');

    let actionResult: unknown;
    act(() => {
      actionResult = result.current.toggleTheme();
    });

    expect(actionResult).toEqual({ ok: true });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('alterna de volta para "light" num segundo toggle', () => {
    const { result } = renderHook(() => useProbe(), { wrapper });

    act(() => {
      result.current.toggleTheme();
    });
    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('toggle com falha: saveTheme lança, tema exibido não muda, nunca lança, retorna {ok:false,error}', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() => useProbe(), { wrapper });

    let actionResult: unknown;
    expect(() => {
      act(() => {
        actionResult = result.current.toggleTheme();
      });
    }).not.toThrow();

    expect(actionResult).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

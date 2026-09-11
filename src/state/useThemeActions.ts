import { useCallback } from 'react';
import { saveTheme } from '../storage/themeStorage';
import { useThemeContext } from './ThemeContext';
import type { Theme } from '../types';

export type ThemeActionResult = { ok: true } | { ok: false; error: { message: string } };

export interface ThemeActions {
  toggleTheme: () => ThemeActionResult;
}

// Guard de persistência atômica (AD-4): salva primeiro (síncrono), só
// despacha a mudança para o `ThemeContext` se `saveTheme` confirmar
// `{ ok: true }`. Em falha, o tema exibido não muda e a função retorna
// `{ ok: false, error }` — nunca lança, e quem chama nunca precisa de
// `try/catch`. `ThemeToggle` é o único chamador nesta história, mas
// qualquer futuro chamador segue o mesmo caminho (nunca um `dispatch` cru).
export function useThemeActions(): ThemeActions {
  const { theme, dispatch } = useThemeContext();

  const toggleTheme = useCallback((): ThemeActionResult => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    const result = saveTheme(nextTheme);
    if (!result.ok) {
      return result;
    }

    dispatch({ type: 'set', theme: nextTheme });
    return { ok: true };
  }, [theme, dispatch]);

  return { toggleTheme };
}

import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { loadTheme } from '../storage/themeStorage';
import { themeReducer, type ThemeAction } from './themeReducer';
import type { Theme } from '../types';

export interface ThemeContextValue {
  theme: Theme;
  dispatch: Dispatch<ThemeAction>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Init lazy síncrono: `loadTheme()` roda uma única vez, antes da primeira
// renderização, e já aplica `data-theme` no elemento raiz nesse mesmo
// instante — sem isso o app pintaria primeiro com o tema padrão do CSS e só
// depois, num `useEffect`, corrigiria para o tema salvo (o "flash" que o
// Design Note da spec proíbe). O `useEffect` abaixo existe só para manter
// `data-theme` sincronizado nas trocas *depois* da montagem (toggle) — não
// para a aplicação inicial.
//
// `ThemeContext` é o único ponto do app que escreve em
// `document.documentElement.dataset.theme` (AD-9) — nenhum outro módulo
// toca essa API do DOM.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, dispatch] = useReducer(themeReducer, undefined, () => {
    const initial = loadTheme();
    document.documentElement.dataset.theme = initial;
    return initial;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, dispatch }}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext deve ser usado dentro de um ThemeProvider');
  }
  return context;
}

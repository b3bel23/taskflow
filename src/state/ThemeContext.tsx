import { createContext, useContext, useLayoutEffect, useReducer, type Dispatch, type ReactNode } from 'react';
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
// depois, num efeito, corrigiria para o tema salvo (o "flash" que o
// Design Note da spec proíbe). O efeito abaixo existe só para manter
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

  // `useLayoutEffect` (retro Epic 1, item 22): roda antes da pintura, no
  // mesmo commit em que o ícone do `ThemeToggle` muda — com `useEffect`, um
  // quadro podia sair com o ícone novo e as cores (CSS tokens) antigas.
  useLayoutEffect(() => {
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

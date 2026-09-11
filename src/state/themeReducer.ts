import type { Theme } from '../types';

// Única ação de tema (AD-5): definir o tema para um valor já resolvido.
// `useThemeActions.toggleTheme` decide o próximo tema e só despacha isto
// depois que `saveTheme` confirmar sucesso (AD-4) — este reducer nunca
// decide sozinho qual é o "próximo" tema.
export type ThemeAction = { type: 'set'; theme: Theme };

export function themeReducer(state: Theme, action: ThemeAction): Theme {
  switch (action.type) {
    case 'set':
      return action.theme;
    default:
      return state;
  }
}

import type { Theme } from '../types';

// Única chave de `localStorage` para tema (AD-2). Domínio de persistência
// independente de `taskflow:tasks` (`tasksStorage.ts`) — nunca a mesma
// chave, nunca o mesmo formato: aqui o valor é sempre uma string crua
// (`'light'`/`'dark'`), nunca `JSON.stringify`/`JSON.parse`.
export const THEME_STORAGE_KEY = 'taskflow:theme';

// Tema padrão no primeiro uso — e também o fallback de qualquer valor
// salvo não reconhecido. Nunca derivado de `prefers-color-scheme`.
const DEFAULT_THEME: Theme = 'light';

function isValidTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

// Único módulo do app que toca `window.localStorage` para tema (AD-8).
// Nunca lança: chave ausente (primeira instalação) ou valor não reconhecido
// (dado corrompido/versão antiga) caem no mesmo fallback `'light'` — nunca
// em `window.matchMedia`/`prefers-color-scheme`.
export function loadTheme(): Theme {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export type SaveThemeResult = { ok: true } | { ok: false; error: { message: string } };

// Escrita síncrona, nunca lança (AD-4): `useThemeActions.toggleTheme` chama
// isto primeiro e só despacha a mudança de tema se `{ ok: true }` voltar.
export function saveTheme(theme: Theme): SaveThemeResult {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar o tema.';
    return { ok: false, error: { message } };
  }
}

// Sincronização entre abas (retro Epic 1, item 23): quando outra aba troca o
// tema, esta acompanha sem reload. Mesma ideia de `subscribeToTasksStorage`:
// reage só à chave do tema (ou `key === null`, `clear()`), relê por
// `loadTheme` (valor ilegível cai em 'light', como sempre) e devolve a função
// que cancela a assinatura.
export function subscribeToThemeStorage(onChange: (theme: Theme) => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) {
      return;
    }
    onChange(loadTheme());
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

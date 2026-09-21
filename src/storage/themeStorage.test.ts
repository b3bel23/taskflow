import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTheme, saveTheme, subscribeToThemeStorage, THEME_STORAGE_KEY } from './themeStorage';

describe('themeStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadTheme', () => {
    it('primeiro uso: chave ausente cai em "light", nunca via prefers-color-scheme', () => {
      expect(loadTheme()).toBe('light');
    });

    it('lê "dark" salvo como string crua', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

      expect(loadTheme()).toBe('dark');
    });

    it('lê "light" salvo como string crua', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'light');

      expect(loadTheme()).toBe('light');
    });

    it('valor salvo não reconhecido cai em "light" (mesmo caminho de "ausente")', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

      expect(loadTheme()).toBe('light');
    });

    it('valor salvo no formato JSON de `taskflow:tasks` (ex. \'"dark"\') não é reconhecido e cai em "light"', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify('dark'));

      expect(loadTheme()).toBe('light');
    });

    it('dado corrompido: getItem lança cai em "light", sem propagar', () => {
      // jsdom expõe `getItem`/`setItem` via `Storage.prototype`, não como
      // propriedade própria da instância — mockar o protótipo, como em
      // `tasksStorage.test.ts`.
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => loadTheme()).not.toThrow();
      expect(loadTheme()).toBe('light');
    });
  });

  describe('saveTheme', () => {
    it('escreve o tema como string crua (nunca JSON) e retorna {ok: true}', () => {
      const result = saveTheme('dark');

      expect(result).toEqual({ ok: true });
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    it('escrita falha: setItem lança, retorna {ok: false, error} e nunca lança', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      let result;
      expect(() => {
        result = saveTheme('dark');
      }).not.toThrow();
      expect(result).toEqual({ ok: false, error: { message: 'quota exceeded' } });
    });
  });
});

// Retro Epic 1, item 23: sincronização entre abas via evento `storage`.
describe('subscribeToThemeStorage', () => {
  const otherTab = (key: string | null = THEME_STORAGE_KEY) =>
    window.dispatchEvent(new StorageEvent('storage', { key }));

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('outra aba trocou o tema: relê e entrega o tema ao callback', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToThemeStorage(onChange);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    otherTab();

    expect(onChange).toHaveBeenCalledWith('dark');
    unsubscribe();
  });

  it('ignora eventos de outras chaves (ex. as tarefas)', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToThemeStorage(onChange);

    otherTab('taskflow:tasks');

    expect(onChange).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('valor ilegível ou armazenamento limpo cai em "light", nunca em prefers-color-scheme', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToThemeStorage(onChange);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

    otherTab();
    window.localStorage.clear();
    otherTab(null);

    expect(onChange.mock.calls).toEqual([['light'], ['light']]);
    unsubscribe();
  });

  it('cancelar a assinatura para de notificar', () => {
    const onChange = vi.fn();
    subscribeToThemeStorage(onChange)();
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    otherTab();

    expect(onChange).not.toHaveBeenCalled();
  });
});

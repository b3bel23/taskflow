import { describe, expect, it } from 'vitest';

// AD-8: só `src/storage/` pode tocar `window.localStorage`. Um `grep`
// manual pega uma violação hoje, mas não pega uma regressão futura (ex.
// Epic 2 lendo `localStorage` direto de um componente novo) — este teste
// fecha esse gap de verificação rodando na própria suíte.
//
// `import.meta.glob` (tipado por `vite/client`, já em `tsconfig.app.json`)
// lê o conteúdo bruto de cada arquivo-fonte sem precisar de `node:fs`/
// `node:path`/`__dirname` — este projeto não tem `@types/node` instalado,
// e não vale a pena adicionar uma dependência só para este teste.
const sourceFiles = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('camadas: só src/storage/ toca localStorage (AD-8)', () => {
  it('nenhum arquivo-fonte fora de src/storage/ (excluindo testes) contém a string "localStorage"', () => {
    const offenders = Object.entries(sourceFiles)
      .filter(([path]) => !path.includes('/storage/') && !/\.test\.tsx?$/.test(path))
      .filter(([, content]) => content.includes('localStorage'))
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });
});

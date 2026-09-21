import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';

// Testes de arquitetura (AD-8 e AD-9). Antes eram uma busca de texto
// (`content.includes('localStorage')`), que (a) dava falso positivo em
// comentários e em nomes como `localStorageKey`, e (b) era burlada por
// `window['local' + 'Storage']`, por desestruturação com alias etc. (retro
// Epic 1, item 20). Agora o código é lido como AST pelo compilador do
// TypeScript, então comentários não contam e as formas comuns de contornar
// a regra são detectadas.
//
// ESCOPO — o que este teste é e não é: é um TROPEÇO contra o caso comum e
// contra os atalhos óbvios, não uma garantia. Ele NÃO detecta acesso
// realmente dinâmico e indireto (ver o teste "limite conhecido" abaixo, que
// documenta isso em código). A garantia forte vem da revisão de código.
//
// `import.meta.glob` (tipado por `vite/client`, já em `tsconfig.app.json`)
// lê o conteúdo bruto de cada arquivo-fonte sem `node:fs`/`__dirname` — este
// projeto não tem `@types/node`.
const sourceFiles = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const isTestFile = (path: string) => /\.test\.tsx?$/.test(path);

function parse(path: string, source: string): ts.SourceFile {
  const kind = path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
}

// Valor de uma expressão feita só de literais de string (concatenação com
// `+`, template sem interpolação dinâmica, parênteses). `null` se depender de
// qualquer coisa calculada em tempo de execução.
function staticString(node: ts.Node): string | null {
  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }
  if (ts.isParenthesizedExpression(node)) {
    return staticString(node.expression);
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticString(node.left);
    const right = staticString(node.right);
    return left !== null && right !== null ? left + right : null;
  }
  if (ts.isTemplateExpression(node)) {
    let result = node.head.text;
    for (const span of node.templateSpans) {
      const value = staticString(span.expression);
      if (value === null) {
        return null;
      }
      result += value + span.literal.text;
    }
    return result;
  }
  return null;
}

const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self', 'top', 'parent', 'frames']);

function walk(root: ts.Node, visit: (node: ts.Node) => void): void {
  visit(root);
  ts.forEachChild(root, (child) => walk(child, visit));
}

// AD-8: só `src/storage/` toca `localStorage`. Devolve descrições das
// violações encontradas no código-fonte informado.
export function findLocalStorageViolations(path: string, source: string): string[] {
  const violations: string[] = [];
  walk(parse(path, source), (node) => {
    // `localStorage` como identificador: `window.localStorage`,
    // `const { localStorage: ls } = window`, `localStorage.getItem(...)`…
    if (ts.isIdentifier(node) && node.text === 'localStorage') {
      violations.push(`identificador "localStorage" (${node.getText()})`);
      return;
    }
    // Strings/concatenações que formam "localStorage": `window['localStorage']`,
    // `window['local' + 'Storage']`, `` window[`local${'Storage'}`] ``.
    if (ts.isStringLiteralLike(node) || ts.isBinaryExpression(node) || ts.isTemplateExpression(node)) {
      const value = staticString(node);
      if (value !== null && value.includes('localStorage')) {
        violations.push(`texto que forma "localStorage" (${node.getText()})`);
      }
    }
    // `window[chave]` / `globalThis[chave]` com chave calculada: pode ser
    // qualquer coisa, inclusive `localStorage` — proibido fora do storage.
    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      GLOBAL_OBJECTS.has(node.expression.text) &&
      staticString(node.argumentExpression) === null
    ) {
      violations.push(`acesso dinâmico ${node.getText()}`);
    }
  });
  return violations;
}

// AD-9: só `src/state/ThemeContext.tsx` escreve o tema no DOM (`dataset`
// do elemento raiz / atributo `data-theme`).
export function findThemeAttributeViolations(path: string, source: string): string[] {
  const violations: string[] = [];
  const enclosingStatementText = (node: ts.Node): string => {
    let current: ts.Node | undefined = node;
    while (current && !ts.isStatement(current)) {
      current = current.parent;
    }
    return (current ?? node).getText();
  };

  walk(parse(path, source), (node) => {
    // `.dataset` (ou `['dataset']`) num statement que mexe em `documentElement`.
    const isDatasetName =
      (ts.isIdentifier(node) && node.text === 'dataset') ||
      (ts.isStringLiteralLike(node) && node.text === 'dataset');
    if (isDatasetName && /documentElement|document\s*\.\s*body/.test(enclosingStatementText(node))) {
      violations.push(`acesso a dataset do elemento raiz (${enclosingStatementText(node).slice(0, 60)})`);
    }
    // O atributo escrito por extenso: `setAttribute('data-theme', …)`.
    if (ts.isStringLiteralLike(node) && node.text === 'data-theme') {
      violations.push(`literal "data-theme" (${node.getText()})`);
    }
  });
  return violations;
}

describe('camadas: só src/storage/ toca localStorage (AD-8)', () => {
  it('nenhum arquivo-fonte fora de src/storage/ (excluindo testes) acessa localStorage', () => {
    const offenders = Object.entries(sourceFiles)
      .filter(([path]) => !path.includes('/storage/') && !isTestFile(path))
      .flatMap(([path, content]) => findLocalStorageViolations(path, content).map((v) => `${path}: ${v}`));

    expect(offenders).toEqual([]);
  });

  describe('o detector em si (garante que o teste acima não é cego)', () => {
    it.each([
      ['acesso direto', `const v = window.localStorage.getItem('k');`],
      ['identificador solto', `localStorage.setItem('k', 'v');`],
      ['acesso por string', `const s = window['localStorage'];`],
      ['string concatenada', `const s = window['local' + 'Storage'];`],
      ['template', 'const s = window[`local${"Storage"}`];'],
      ['desestruturação com alias', `const { localStorage: ls } = window;`],
      ['globalThis', `globalThis.localStorage.clear();`],
      ['chave calculada em window', `const s = window[chave];`],
      ['chave calculada em globalThis', `const s = globalThis[chave()];`],
    ])('detecta: %s', (_label, source) => {
      expect(findLocalStorageViolations('/src/x.ts', source).length).toBeGreaterThan(0);
    });

    it.each([
      ['a palavra só em comentário', `// usa localStorage no storage adapter\nconst a = 1;`],
      ['a palavra em comentário de bloco', `/* localStorage */ const a = 1;`],
      ['nome que só contém a palavra', `const localStorageKey = 'k'; const x = localStorageKey;`],
      ['window com chave literal inofensiva', `const w = window['innerWidth'];`],
      ['acesso a array comum', `const x = lista[i];`],
    ])('NÃO acusa: %s', (_label, source) => {
      expect(findLocalStorageViolations('/src/x.ts', source)).toEqual([]);
    });

    // LIMITE CONHECIDO, documentado em código de propósito: acesso indireto
    // por um alias de `window` com chave calculada passa. Detectar isso exigiria
    // análise de fluxo/tipos, fora do propósito de um teste de arquitetura
    // barato. Se este teste passar a falhar porque o detector melhorou,
    // atualize-o — o comentário de escopo lá em cima também.
    it('limite conhecido: alias de window + chave calculada NÃO é detectado', () => {
      const source = `const w = window; const chave = ['local', 'Storage'].join(''); const s = w[chave];`;
      expect(findLocalStorageViolations('/src/x.ts', source)).toEqual([]);
    });
  });
});

describe('camadas: só src/state/ThemeContext.tsx escreve dataset.theme (AD-9)', () => {
  it('nenhum arquivo-fonte fora de ThemeContext.tsx (excluindo testes) mexe no tema do elemento raiz', () => {
    const offenders = Object.entries(sourceFiles)
      .filter(([path]) => path !== '/src/state/ThemeContext.tsx' && !isTestFile(path))
      .flatMap(([path, content]) => findThemeAttributeViolations(path, content).map((v) => `${path}: ${v}`));

    expect(offenders).toEqual([]);
  });

  it('ThemeContext.tsx de fato é quem escreve (o detector enxerga o uso legítimo)', () => {
    const content = sourceFiles['/src/state/ThemeContext.tsx'];
    expect(findThemeAttributeViolations('/src/state/ThemeContext.tsx', content).length).toBeGreaterThan(0);
  });

  describe('o detector em si', () => {
    it.each([
      ['dataset direto', `document.documentElement.dataset.theme = 'dark';`],
      ['dataset por string', `document.documentElement['dataset'].theme = 'dark';`],
      ['desestruturação', `const { dataset } = document.documentElement; dataset.theme = 'dark';`],
      ['setAttribute', `document.documentElement.setAttribute('data-theme', 'dark');`],
      ['dataset do body', `document.body.dataset.theme = 'dark';`],
    ])('detecta: %s', (_label, source) => {
      expect(findThemeAttributeViolations('/src/x.ts', source).length).toBeGreaterThan(0);
    });

    it.each([
      ['comentário com a palavra', `// escreve document.documentElement.dataset.theme\nconst a = 1;`],
      ['atributo JSX parecido', `const e = <span data-theme-active={t} />;`],
      ['dataset de outro elemento', `const x = botao.dataset.id;`],
    ])('NÃO acusa: %s', (_label, source) => {
      expect(findThemeAttributeViolations('/src/x.tsx', source)).toEqual([]);
    });
  });
});

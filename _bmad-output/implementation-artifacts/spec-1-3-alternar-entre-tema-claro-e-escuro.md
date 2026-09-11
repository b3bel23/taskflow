---
title: 'Story 1.3: Alternar entre tema claro e escuro'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: '2e092d7'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O TaskFlow (Stories 1.1/1.2) só existe em tema claro fixo, sem controle nenhum de aparência. Isabel precisa alternar manualmente entre claro/escuro pelo Cabeçalho, com a escolha persistindo entre sessões — nunca seguindo a preferência do sistema operacional, nem no primeiro uso.

**Approach:** Criar `themeStorage` (`loadTheme`/`saveTheme`, chave `taskflow:theme`, string crua — domínio de persistência independente de `taskflow:tasks`), o par `ThemeContext`/`themeReducer` (AD-5) que aplica o tema via `document.documentElement.dataset.theme` (único ponto que toca essa DOM API, AD-9), e `useThemeActions.toggleTheme()` seguindo o mesmo guard de persistência atômica do AD-4 (salva primeiro, só então despacha). `ThemeToggle` (ícone sol/lua) entra no `Header`, à direita do título.

## Boundaries & Constraints

**Always:** `taskflow:theme` é sempre string crua (`'light'`/`'dark'`), nunca `JSON.stringify`/`JSON.parse`, nunca a mesma chave/formato de `taskflow:tasks`. Chave ausente ou valor não reconhecido → `'light'`, nunca derivado de `prefers-color-scheme`. Troca de tema é 100% CSS via `data-theme` no elemento raiz — só `ThemeContext` seta esse atributo. `useThemeActions.toggleTheme()` salva antes de despachar (AD-4): falha retorna `{ok:false,error}`, tema não muda, nunca lança. Sem "piscar" o tema padrão antes do salvo aplicar. `ThemeToggle` com foco visível e rótulo explícito.

**Ask First:** nenhuma prevista.

**Never:** seguir `prefers-color-scheme`. Misturar chave/formato de tema com o de tarefas. Lógica de tarefa (Epics 2-4). CSS-in-JS/Tailwind.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Primeiro uso | Chave `taskflow:theme` ausente | Tema `'light'`, nunca via `prefers-color-scheme` | N/A |
| Valor salvo inválido | Chave presente, não é `'light'` nem `'dark'` | Cai em `'light'` (mesmo caminho de "ausente") | Nunca lança |
| Toggle com sucesso | `saveTheme` ok | `data-theme` muda, ícone reflete o novo tema | N/A |
| Toggle com falha | `saveTheme` lança (ex. quota) | Tema exibido não muda | `{ok:false,error}`, nunca lança |

</frozen-after-approval>

## Code Map

- `src/types/index.ts` -- existente, adicionar `Theme = 'light' | 'dark'`
- `src/storage/themeStorage.ts` + `.test.ts` -- novo, único módulo que toca `localStorage` de tema
- `src/state/themeReducer.ts` -- novo, action `{type:'set', theme}`
- `src/state/ThemeContext.tsx` (+ `.test.tsx`) -- novo, init lazy síncrono + `useEffect` mantêm `data-theme` sincronizado
- `src/state/useThemeActions.ts` (+ `.test.ts`) -- novo, `toggleTheme()` com guard AD-4
- `src/components/ThemeToggle/` (`.tsx`+`.module.css`+`.test.tsx`) -- novo
- `src/components/Header/` (`.tsx`+`.module.css`+`.test.tsx`) -- modificar, adiciona `ThemeToggle` à direita, teste envolve com `ThemeProvider`
- `src/App.tsx` -- modificar, envolve com `ThemeProvider` (externo ao `TaskProvider`, domínios independentes)

## Tasks & Acceptance

**Execution:**
- [x] `src/types/index.ts` -- adicionar `Theme`
- [x] `src/storage/themeStorage.ts` + teste -- `loadTheme`/`saveTheme` -- AD-2, AD-8
- [x] `src/state/themeReducer.ts` + `ThemeContext.tsx` + teste -- init lazy seta `data-theme` sem flash -- AD-5, AD-9
- [x] `src/state/useThemeActions.ts` + teste -- `toggleTheme` com guard atômico -- AD-4
- [x] `src/components/ThemeToggle/*` -- ícone sol/lua, acessível -- UX-DR11, UX-DR13
- [x] `src/components/Header/*` -- integra `ThemeToggle` à direita -- UX-DR2
- [x] `src/App.tsx` -- envolve com `ThemeProvider`

**Acceptance Criteria:**
- Given não existe chave `taskflow:theme`, when o app inicializa, then o tema aplicado é sempre `'light'`, nunca derivado de `prefers-color-scheme`
- Given Isabel clica no `ThemeToggle`, when o clique ocorre, then o tema muda instantaneamente via `data-theme`, o ícone ativo reflete o tema atual, e a preferência é salva em `taskflow:theme` como string crua
- Given Isabel fecha e reabre o navegador após escolher um tema, when o app inicializa, then o último tema escolhido é aplicado imediatamente, sem piscar o tema padrão antes
- Given a escrita em `taskflow:theme` falha, when Isabel aciona o `ThemeToggle`, then o tema exibido não muda e nenhuma exceção é lançada
- Given navegação por teclado, when o `ThemeToggle` recebe foco, then o foco é visível (outline)

## Design Notes

Init lazy evita o flash — atributo já no DOM antes da 1ª pintura:

```ts
const [theme, dispatch] = useReducer(themeReducer, undefined, () => {
  const initial = loadTheme();
  document.documentElement.dataset.theme = initial;
  return initial;
});
useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
```

`loadTheme` nunca lê `matchMedia` — qualquer valor ≠ `'light'`/`'dark'` cai em `'light'`.

## Verification

**Commands:**
- `npm run build` -- expected: `tsc` + `vite build` limpos
- `npm run test` -- expected: testes de `themeStorage`, `ThemeContext`, `useThemeActions`, `ThemeToggle`, `Header` e `App` passam, cobrindo as 5 ACs e as 4 linhas da matriz I/O

## Suggested Review Order

**Storage adapter e domínio independente de tema**

- Chave própria, string crua, nunca deriva de `prefers-color-scheme` — só cai em `'light'`.
  [`themeStorage.ts:21`](../../src/storage/themeStorage.ts#L21)

- Escrita síncrona, nunca lança; mesmo formato `{ok}` de `tasksStorage.ts`.
  [`themeStorage.ts:34`](../../src/storage/themeStorage.ts#L34)

**Estado, DOM e o guard de persistência atômica**

- Init lazy aplica `data-theme` antes da 1ª pintura — evita o flash; `useEffect` mantém sincronizado depois.
  [`ThemeContext.tsx:22`](../../src/state/ThemeContext.tsx#L22)

- `toggleTheme` salva antes de despachar (AD-4) — falha nunca muda o tema exibido nem lança.
  [`useThemeActions.ts:20`](../../src/state/useThemeActions.ts#L20)

- `App` envolve a árvore com `ThemeProvider`, fora do `TaskProvider` — domínios independentes.
  [`App.tsx:20`](../../src/App.tsx#L20)

**UI: Alternador de Tema no Cabeçalho**

- Sol e lua sempre visíveis; cor ativa (não sumir/aparecer) indica o tema atual; rótulo explícito.
  [`ThemeToggle.tsx:12`](../../src/components/ThemeToggle/ThemeToggle.tsx#L12)

- Alternador entra à direita do título via `justify-content: space-between`.
  [`Header.tsx:9`](../../src/components/Header/Header.tsx#L9)

**Peripheral: testes e verificação de camada**

- Fecha o gap de verificação: só `ThemeContext.tsx` pode escrever `dataset.theme`, rodando na própria suíte (mesmo padrão do AD-8/`localStorage`).
  [`architecture.test.ts:34`](../../src/architecture.test.ts#L34)

- Teste de ordem real no DOM (não só containment) garante que o Alternador fica depois do título.
  [`Header.test.tsx:41`](../../src/components/Header/Header.test.tsx#L41)

- Cobre as 4 linhas da matriz I/O, incluindo o guard atômico de falha de escrita.
  [`useThemeActions.test.ts:1`](../../src/state/useThemeActions.test.ts#L1)

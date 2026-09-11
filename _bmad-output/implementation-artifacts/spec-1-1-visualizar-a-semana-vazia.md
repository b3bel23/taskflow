---
title: 'Story 1.1: Visualizar a Semana vazia'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'NO_VCS'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O TaskFlow ainda não existe em código. Isabel precisa, ao abrir o app pela primeira vez (sem tarefas salvas), ver a semana inteira de uma vez, para confiar que a estrutura existe antes de criar qualquer tarefa.

**Approach:** Criar o scaffold Vite+React+TypeScript da arquitetura e implementar a Visão Semanal estática: Cabeçalho (só título) + 7 Colunas do Dia (Segunda→Domingo) em estado vazio, coluna de hoje destacada. Sem persistência (Story 1.2) e sem tema funcional (Story 1.3) — é a casca visual que as próximas histórias do Epic 1 preenchem.

## Boundaries & Constraints

**Always:** 7 dias em ordem fixa Segunda→Domingo, todos simultâneos, sem navegação. Texto vazio exatamente "Nenhuma tarefa"; "+ Adicionar tarefa" sempre visível (pode ser não-funcional aqui — Modal é Epic 2). Coluna de hoje recebe `today-background`, calculado via `Date` local. Tokens de `DESIGN.md` em `src/styles/tokens.css` como custom properties, incluindo `-dark` (inertes até Story 1.3). CSS Modules colocalizados, sem CSS-in-JS/Tailwind. Versões do Stack exatamente como em `ARCHITECTURE-SPINE.md` (React 19.3.0, Vite 8.2.2, @vitejs/plugin-react 6.1.1, TypeScript 6.0.x, Vitest 5.0.0, @testing-library/react+dom 16.3.3). Estrutura de diretórios segue o Structural Seed.

**Ask First:** se alguma versão fixada no Stack não existir no npm no momento da instalação, HALT e perguntar (versão mais próxima vs. revisar a spine) — nunca substituir silenciosamente.

**Never:** lógica de tema (`ThemeContext`, `data-theme`, toggle visível — Story 1.3); persistência/`localStorage` (Story 1.2); CRUD de tarefa, Modal, dado real de tarefa (Epic 2); drag-and-drop (Epic 4); breakpoints responsivos/mobile.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Abertura normal | App carrega, qualquer dia | 7 colunas Segunda→Domingo com "Nenhuma tarefa" + "+ Adicionar tarefa"; Cabeçalho "TaskFlow" | N/A |
| "Hoje" = domingo | `Date` local aponta domingo (`getDay()===0`) | Coluna "Domingo" (última) recebe `today-background`, nenhuma outra | Mapear `getDay()` 0-indexado-domingo para a ordem Segunda→Domingo corretamente |

</frozen-after-approval>

## Code Map

Projeto greenfield — nada a reutilizar ainda. Todos os arquivos abaixo são novos, seguindo o Structural Seed da arquitetura:

- `package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html` -- scaffold do projeto
- `src/main.tsx`, `src/App.tsx` -- entrada e composição (`Header` + `WeekView`)
- `src/types/index.ts` -- `DayOfWeek` (`'mon'..'sun'`), tipo compartilhado por todos os épicos
- `src/constants/days.ts` -- ordem fixa dos 7 dias + `getTodayDayOfWeek()`
- `src/styles/tokens.css`, `src/styles/global.css` -- tokens de `DESIGN.md` (claro+escuro) + reset mínimo
- `src/components/{Header,WeekView,DayColumn}/` -- cada um com `.tsx` + `.module.css` + `.test.tsx`

## Tasks & Acceptance

**Execution:**
- [x] Scaffold Vite+React+TS (`package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`) -- base inexistente, versões fixadas pela arquitetura
- [x] `src/types/index.ts` + `src/constants/days.ts` -- tipo `DayOfWeek` e fonte única da ordem/"hoje"
- [x] `src/styles/tokens.css` + `global.css` -- tokens de `DESIGN.md` como custom properties -- AD-9
- [x] `src/components/DayColumn/*` -- estado vazio + destaque de hoje -- FR-5 (parcial), UX-DR3, UX-DR14
- [x] `src/components/WeekView/*` -- grade de 7 `DayColumn` -- FR-5
- [x] `src/components/Header/*` -- faixa com título -- UX-DR2 (parcial, sem Alternador de Tema ainda)
- [x] `src/App.tsx` + `src/main.tsx` -- compor e montar a árvore

**Acceptance Criteria:**
- Given Isabel abre o TaskFlow (sem dados salvos), when a página carrega, then os 7 dias (Segunda a Domingo) aparecem simultaneamente, sem navegação
- Given qualquer Coluna do Dia sem tarefas, when renderizada, then exibe "Nenhuma tarefa" e "+ Adicionar tarefa" visível no rodapé
- Given a data atual do navegador, when a Visão Semanal renderiza, then só a coluna do dia atual recebe `today-background`
- Given a Visão Semanal, when renderizada, then o Cabeçalho exibe "TaskFlow" à esquerda, fora da grade

## Spec Change Log

- 2026-09-11 — Gatilho "Ask First" acionado durante a implementação: `@testing-library/dom` fixado em `16.3.3` no `ARCHITECTURE-SPINE.md` não existe no npm (série 16.x nunca publicada); `@testing-library/react@16.3.3` exige `^10.0.0` como peer dependency — os números de dois pacotes distintos haviam sido conflados na spine. Instalado `@testing-library/dom@^10.4.1` (única versão real compatível). Confirmado com Isabel, que optou por aceitar e corrigir a tabela Stack do `ARCHITECTURE-SPINE.md`. Nenhuma outra versão do Stack divergiu do fixado.

## Design Notes

`getTodayDayOfWeek()` mapeia `new Date().getDay()` (0=domingo..6=sábado) para a ordem Segunda→Domingo:

```ts
const JS_DAY_TO_DAY_OF_WEEK: DayOfWeek[] = ['sun','mon','tue','wed','thu','fri','sat'];
export const getTodayDayOfWeek = (): DayOfWeek => JS_DAY_TO_DAY_OF_WEEK[new Date().getDay()];
```

## Verification

**Commands:**
- `npm install` -- expected: sem erro, nas versões fixadas
- `npm run build` -- expected: `tsc` + `vite build` limpos, sem erro de tipo
- `npm run test` -- expected: testes de `Header`/`WeekView`/`DayColumn` passam, cobrindo as 4 ACs acima

## Suggested Review Order

**Composição e grade da semana**

- Raiz de composição: Cabeçalho fica fora/antes da grade da `WeekView`, nunca dentro dela.
  [`App.tsx:4`](../../src/App.tsx#L4)

- Mapeia `DAYS_OF_WEEK` para 7 `DayColumn`, calcula `isToday` uma única vez para todas.
  [`WeekView.tsx:8`](../../src/components/WeekView/WeekView.tsx#L8)

- Estado vazio da coluna: rótulo do dia, "Nenhuma tarefa", botão inerte (Epic 2 liga a ação real).
  [`DayColumn.tsx:12`](../../src/components/DayColumn/DayColumn.tsx#L12)

**Cálculo do dia atual (caso de borda: domingo)**

- `getDay()` é 0-indexado a partir de domingo; este array traduz para a ordem Segunda→Domingo.
  [`days.ts:21`](../../src/constants/days.ts#L21)

- Cobre explicitamente o caso em que "hoje" é domingo (índice 0 do JS, último da nossa ordem).
  [`days.test.ts:25`](../../src/constants/days.test.ts#L25)

**Acessibilidade**

- `aria-current="date"` leva o destaque de "hoje" à árvore de acessibilidade, não só ao CSS.
  [`DayColumn.tsx:21`](../../src/components/DayColumn/DayColumn.tsx#L21)

- `aria-labelledby` aponta pro `<h2>` em vez de duplicar o nome do dia com `aria-label`.
  [`DayColumn.tsx:22`](../../src/components/DayColumn/DayColumn.tsx#L22)

- Título vira `<h1>` para não deixar a hierarquia de headings da página começar em `<h2>`.
  [`Header.tsx:8`](../../src/components/Header/Header.tsx#L8)

**Tokens e destaque visual de "hoje"**

- Tokens de `DESIGN.md`; variantes `-dark` já presentes mas inertes até a Story 1.3.
  [`tokens.css:8`](../../src/styles/tokens.css#L8)

- `.today` é a classe que de fato pinta o destaque (fundo ~8% + borda) — a peça visual real.
  [`DayColumn.module.css:14`](../../src/components/DayColumn/DayColumn.module.css#L14)

**Peripheral: testes e config**

- Fecha o gap de verificação: a classe `.today` (não só o atributo de teste) agora é asserida.
  [`DayColumn.test.tsx:19`](../../src/components/DayColumn/DayColumn.test.tsx#L19)

- Único teste que renderiza `App` composto, confirmando Cabeçalho fora da grade de fato.
  [`App.test.tsx:6`](../../src/App.test.tsx#L6)

- Versões do Stack fixadas conforme `ARCHITECTURE-SPINE.md`; `engines.node` documenta o piso exigido.
  [`package.json:6`](../../package.json#L6)

- Favicon inline (SVG, cor `accent`), sem dependência de asset externo.
  [`index.html:6`](../../index.html#L6)

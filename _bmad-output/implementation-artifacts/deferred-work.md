- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-visualizar-a-semana-vazia.md`
  summary: Projeto não tem ferramentas de lint/format (ESLint/Prettier) nem script `lint` no `package.json`.
  evidence: `ARCHITECTURE-SPINE.md` fixa configurações rígidas de TypeScript (`strict`, `noUnusedLocals`, etc.) mas não define lint/format; achado incidental do blind-hunter review da Story 1.1, não bloqueia nenhuma AC desta história.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-visualizar-a-semana-vazia.md`
  summary: Projeto não tem `README.md` explicando como instalar/rodar/testar/buildar.
  evidence: Achado incidental do blind-hunter review da Story 1.1; útil para retomar o projeto depois de um tempo parado, mas não é requisito de nenhuma SPEC/AC.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-visualizar-a-semana-vazia.md`
  summary: Sem Error Boundary em torno de `<App />` em `src/main.tsx` — um erro de runtime em qualquer componente derruba a tela inteira sem fallback.
  evidence: Achado incidental do blind-hunter review da Story 1.1; nenhuma AC ou documento de arquitetura/UX exige tratamento de erro de render nesta história.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-persistir-dados-de-tarefas-entre-sessoes.md`
  summary: `role="status"` no aviso de erro de carga (`PersistenceNotice`) pode não ser anunciado por leitores de tela, pois `loadError` já está resolvido antes da primeira renderização (não é uma atualização "ao vivo" de uma live region).
  evidence: Achado do verification-gap/blind-hunter review da Story 1.2; requer teste manual com leitor de tela real para confirmar, fora do escopo de correção automática desta história.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-alternar-entre-tema-claro-e-escuro.md`
  summary: Falha ao salvar o tema (`saveTheme` retornando `{ok:false}`) não tem nenhum feedback visual — o clique no `ThemeToggle` simplesmente não muda nada, sem aviso, diferente do padrão já usado para tarefas (`PersistenceNotice`).
  evidence: Achado do blind-hunter/edge-case-hunter da Story 1.3; a AC atual só exige "tema não muda, nenhuma exceção lançada" (satisfeito), mas adicionar um aviso visível é uma decisão de UX nova, não coberta pela spec aprovada — requer decisão de Isabel antes de implementar.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-alternar-entre-tema-claro-e-escuro.md`
  summary: `TaskContextValue`/`ThemeContextValue` expõem o `dispatch` cru do reducer no valor público do Context — nada impede hoje um componente futuro de despachar uma mutação direto, contornando `useTaskActions`/`useThemeActions` e o guard de persistência atômica (AD-4).
  evidence: Achado do blind-hunter da Story 1.3; nenhuma violação existe hoje (só os hooks de ação despacham), mas é uma abertura de design. Consistente em ambos os Contexts — melhor endereçar os dois juntos numa passada dedicada, não unilateralmente em só um deles.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-alternar-entre-tema-claro-e-escuro.md`
  summary: Sem `color-scheme` (`light dark`) definido em `:root` — controles nativos de formulário e scrollbars não acompanham o tema escolhido.
  evidence: Achado do blind-hunter da Story 1.3; sem impacto hoje (nenhum controle de formulário nativo no Epic 1), relevante quando o `TaskModal` do Epic 2 introduzir inputs.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-alternar-entre-tema-claro-e-escuro.md`
  summary: AC5 (foco visível no `ThemeToggle`) não tem cobertura automatizada — `vite.config.ts` não habilita `test.css`, então o Vitest/jsdom não injeta os CSS Modules reais, e um assert via `getComputedStyle` não enxergaria a regra `:focus-visible` de `ThemeToggle.module.css`.
  evidence: Achado do verification-gap da Story 1.3; a regra CSS existe e foi verificada por leitura de código, mas só teste manual confirma o comportamento real no navegador até que `test.css` seja avaliado para o projeto.

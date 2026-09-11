- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-visualizar-a-semana-vazia.md`
  summary: Projeto não tem ferramentas de lint/format (ESLint/Prettier) nem script `lint` no `package.json`.
  evidence: `ARCHITECTURE-SPINE.md` fixa configurações rígidas de TypeScript (`strict`, `noUnusedLocals`, etc.) mas não define lint/format; achado incidental do blind-hunter review da Story 1.1, não bloqueia nenhuma AC desta história.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-visualizar-a-semana-vazia.md`
  summary: Projeto não tem `README.md` explicando como instalar/rodar/testar/buildar.
  evidence: Achado incidental do blind-hunter review da Story 1.1; útil para retomar o projeto depois de um tempo parado, mas não é requisito de nenhuma SPEC/AC.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-visualizar-a-semana-vazia.md`
  summary: Sem Error Boundary em torno de `<App />` em `src/main.tsx` — um erro de runtime em qualquer componente derruba a tela inteira sem fallback.
  evidence: Achado incidental do blind-hunter review da Story 1.1; nenhuma AC ou documento de arquitetura/UX exige tratamento de erro de render nesta história.

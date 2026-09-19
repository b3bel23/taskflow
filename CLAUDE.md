# TaskFlow — acordos de trabalho

Regras de processo que vieram da retrospectiva dos Epics 5–7
(`_bmad-output/implementation-artifacts/epic-5-retro-2026-09-19.md`). Curtas de
propósito: só o que a evidência mostrou que faltou.

## Entrega de stories e rastreabilidade

- Ao entregar várias stories que mexem nos mesmos arquivos, não junte tudo num
  commit sem rastro. Faça **um commit por story ao fechá-la**, ou escreva uma
  **micro-spec por story** com as ACs e "como verifiquei". Uma story só vira
  `done` no `sprint-status.yaml` com um dos dois.
- Cite o id da story no assunto do commit (`Story 5.4`). Sem isso não dá para
  atribuir diff, defeito ou churn a uma story na retrospectiva (nos Epics 5–7,
  só 3 de 9 commits citaram a story e 6 stories ficaram sem diff próprio).

## Fechar itens de retrospectiva

- Só feche um action item como "obsoleto" se o **padrão de risco** que ele
  descreve foi eliminado — não basta o código específico citado ter sumido.
  Exemplo: o item `epic-4-retro-item-18` previa "uma 4ª função de reindexação
  esquece a guarda"; as 3 funções citadas sumiram, mas o risco reapareceu no
  `applyRollover`. Ao fechar, registre a evidência (commit, arquivo ou teste).

## Ambiente

- Neste repositório o Vitest pode perder arquivos por timeout de worker (a pasta
  fica no OneDrive). Rode `npx vitest run --maxWorkers=1` e confira que a
  contagem de arquivos/testes é a esperada antes de considerar a suíte verde.

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

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-criar-tarefa.md`
  summary: `getNextOrderInGroup` calcula o próximo `order` por contagem (`tasks.filter(...).length`), não por `max(order)+1`. Depois que a Story 2.3 (excluir tarefa) existir, apagar uma tarefa do meio de um grupo `(day,priority)` e depois criar uma nova nesse mesmo grupo pode colidir com o `order` de uma tarefa já existente.
  evidence: Achado do blind-hunter da Story 2.1; inofensivo hoje (nenhum caminho de exclusão existe ainda), mas quem implementar a Story 2.3 precisa garantir que a exclusão reindexe o grupo (ou trocar `getNextOrderInGroup` por `max+1`) antes disso virar um bug real.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-criar-tarefa.md`
  summary: Sem proteção contra duplo-clique rápido em "Adicionar tarefa"/"Salvar"/"Excluir" — duas chamadas de `createTask`/`updateTask`/`deleteTask` antes do re-render poderiam ler o mesmo `state.tasks` (closure) e calcular o mesmo `order`/reindexar com dado desatualizado.
  evidence: Achado do blind-hunter/edge-case-hunter das Stories 2.1/2.2, confirmado ainda válido para `deleteTask` na Story 2.3 (mesma closure `state.tasks`) e para `cycleState` na Story 3.1 (mesmo padrão de guard, mesma closure); risco real baixo (clique físico de mouse único, sem AC exigindo debounce), mas uma melhoria de robustez futura (desabilitar o controle durante a operação) se algum dia se mostrar necessário.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-editar-tarefa-existente.md`
  summary: Ativação por teclado (Enter/Espaço) do `TaskCard` não é verificável via `fireEvent.keyDown`/`keyUp` — jsdom não sintetiza o `click` nativo que um `<button>` real dispara em resposta a essas teclas (confirmado experimentalmente: 0 chamadas de `onClick` na mesma sequência que um navegador real trata como clique). A garantia atual vem de usar o elemento semântico correto (`<button>`), testado via `tagName === 'BUTTON'`.
  evidence: Achado do verification-gap da Story 2.2, mesma classe de limitação já registrada para o `ThemeToggle` (Story 1.3, `test.css` não habilitado) e o "Enter envia o formulário" do `TaskModal` (Story 2.1) — comportamento nativo do navegador, não implementado pelo nosso código, então só teste manual (ou Playwright/e2e real) confirma de fato.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-criar-tarefa.md`
  summary: `DayColumn` mantém estado de modal independente por coluna (agora dois: `isAddModalOpen` e, desde a Story 2.2, `editingTask`) — nada garante centralmente que só um `TaskModal` pode estar aberto por vez entre as 7 colunas (hoje isso já é impedido na prática pelo overlay em tela cheia + focus trap, que bloqueia clique/Tab para qualquer Card ou botão por trás, incluindo o "+ Adicionar tarefa" da mesma coluna).
  evidence: Achado do blind-hunter/edge-case-hunter das Stories 2.1 e 2.2; não é um bug alcançável por interação normal do usuário (overlay cobre a viewport inteira), mas vale revisitar se um gerenciador de modal global for introduzido nas próximas histórias (2.3 reusa o mesmo `TaskModal`). Estendido pelo blind-hunter da Story 4.1: a mesma suposição (overlay bloqueia tudo atrás) agora também precisa cobrir a nova alça de arraste (`role="button"`, focável) de cada `TaskCard` — nunca re-verificado com o `TaskModal` aberto.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-alternar-estado-pelo-indicador-de-estado.md`
  summary: Nenhum teste automatizado confirma que a mudança de `aria-label` do `StateIndicator` (ex. "Pendente" → "Em andamento") é de fato anunciada por um leitor de tela real após o ciclo — o elemento já está em foco quando o rótulo muda, cenário que nem todo leitor de tela anuncia de forma confiável.
  evidence: Achado do blind-hunter da Story 3.1; mesma classe de limitação já registrada para o `ThemeToggle` (Story 1.3, `test.css` não habilitado) — o texto do `aria-label` está correto e foi verificado por leitura de código/teste de DOM, mas só teste manual com leitor de tela real confirma o comportamento de anúncio.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-diferenciar-visualmente-tarefa-concluida.md`
  summary: `completed-opacity` (0.55, valor fixo de `DESIGN.md`, aplicado ao Card inteiro) reduz o contraste do nome (`--color-ink-primary`) e das cores da `PriorityTag`/`StateIndicator` — no tema claro, o cálculo de contraste do texto cai abaixo de WCAG AA 4.5:1 para texto normal, mesmo o texto sem opacidade passando facilmente.
  evidence: Achado do blind-hunter da Story 3.2; o valor 0.55 é uma decisão de design já aprovada (Party Mode, `DESIGN.md`) e a própria AC da Story 3.2 exige literalmente essa opacidade no Card inteiro — não é algo que esta história possa mudar unilateralmente; requer decisão de Isabel/UX se o valor do token deve ser revisto.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-diferenciar-visualmente-tarefa-concluida.md`
  summary: Nenhuma consideração para `forced-colors`/Windows High Contrast (ou `prefers-contrast`) — nesses modos o navegador tipicamente ignora `opacity`, deixando o `text-decoration: line-through` como único sinal de diferenciação de "Concluída".
  evidence: Achado do blind-hunter da Story 3.2; mesma classe de item já aceito como fora de escopo do MVP (ex. `color-scheme` não definido, Story 1.3); nenhuma AC exige suporte a modos de alto contraste forçado.

- source_spec: `_bmad-output/implementation-artifacts/epic-3-retro-2026-09-14.md`
  summary: `task.state === 'done'` é checado de forma independente em `TaskCard.tsx` (para decidir `isCompleted`/opacidade+risco) e em `StateIndicator.tsx` (para o rótulo/classe visual do Indicador) — nenhum predicado ou mapa único compartilhado entre os dois.
  evidence: Achado do adversarial na retrospectiva do Epic 3 (fronteira Story 3.1 × 3.2); risco baixo hoje (só um `TaskState` "parece concluído"), mas exigiria editar os dois arquivos em sincronia se um novo Estado "parecido com concluído" for adicionado no futuro.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-reordenar-tarefas-por-arraste.md`
  summary: O plugin de acessibilidade padrão do `@dnd-kit` (`Accessibility`, parte do `defaultPreset`) anuncia o início/fim do arraste em inglês e citando o UUID cru da tarefa (ex. "Picked up draggable item {uuid}"), nunca sobrescrito por `DragDropProvider` em `DayColumn.tsx` — inconsistente com o resto do app, cuidadosamente em português (ex. "Arrastar tarefa: {título}").
  evidence: Achado do blind-hunter da Story 4.1, confirmado lendo `node_modules/@dnd-kit/dom`'s `defaultAnnouncements`/`Accessibility` options (`announcements`/`screenReaderInstructions` são configuráveis, mas corrigir corretamente exige mapear `event.operation.source.id` de volta ao título da tarefa dentro do closure de `TaskPriorityGroup` — pesquisa de API suficiente para não ser um patch seguro durante a revisão desta story; precisa de uma passada dedicada antes de expor a funcionalidade a uma usuária real de leitor de tela).

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-reordenar-tarefas-por-arraste.md`
  summary: Falha de escrita ao reordenar por arraste (`useTaskActions.reorderTask` retornando `{ok:false}`) não tem nenhum feedback visível ao usuário — diferente do padrão `role="alert"` já usado por `createTask`/`updateTask`/`deleteTask` no `TaskModal`.
  evidence: Achado do blind-hunter da Story 4.1; ao contrário de `cycleState` (Story 3.1, cujo "Never" na spec decidiu explicitamente não mostrar erro, mesmo padrão do `ThemeToggle`), a spec da 4.1 não tomou essa decisão explicitamente — mas não há Modal aberto durante um arraste para hospedar uma mensagem `role="alert"`, então corrigir isto exige uma decisão de UX nova (ex. toast/banner) antes de virar código.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-reordenar-tarefas-por-arraste.md`
  summary: O placeholder tracejado que o `@dnd-kit` insere no destino do arraste (`[data-dnd-placeholder]`) não foi verificado quanto a `aria-hidden` — pode permanecer um item de lista vazio e sem rótulo na árvore de acessibilidade enquanto um arraste está em andamento.
  evidence: Achado do blind-hunter da Story 4.1; não confirmado se a própria lib já trata isso por padrão (comportamento não pesquisado a fundo) — precisa de verificação antes de decidir se há algo a corrigir.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-reordenar-tarefas-por-arraste.md`
  summary: A animação de "levantado" durante o arraste (`.dragging`: sombra + rotação -2deg) e a transição de reposicionamento do próprio `@dnd-kit` não respeitam `prefers-reduced-motion`.
  evidence: Achado do blind-hunter da Story 4.1; nenhuma AC ou `DESIGN.md` exige isso explicitamente, mas é uma lacuna real de acessibilidade não coberta por nenhuma história ainda.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-reordenar-tarefas-por-arraste.md`
  summary: Um `DragDropProvider`/`DragDropManager` próprio é criado por grupo `(day, priority)` — com 7 dias × até 4 níveis de prioridade, potencialmente dezenas de instâncias simultâneas montadas (cada uma com seus próprios sensores/ResizeObservers/nós de acessibilidade), sem nenhuma medição do custo de DOM/desempenho conforme o volume de tarefas cresce.
  evidence: Achado do blind-hunter da Story 4.1; nenhum problema observado hoje (uso pessoal, poucas tarefas por dia esperadas), mas vale revisitar se o uso real mostrar degradação, não hipoteticamente.

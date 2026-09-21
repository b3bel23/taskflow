- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-visualizar-a-semana-vazia.md`
  summary: Projeto não tem ferramentas de lint/format (ESLint/Prettier) nem script `lint` no `package.json`.
  evidence: `ARCHITECTURE-SPINE.md` fixa configurações rígidas de TypeScript (`strict`, `noUnusedLocals`, etc.) mas não define lint/format; achado incidental do blind-hunter review da Story 1.1, não bloqueia nenhuma AC desta história.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-visualizar-a-semana-vazia.md`
  summary: Projeto não tem `README.md` explicando como instalar/rodar/testar/buildar.
  evidence: Achado incidental do blind-hunter review da Story 1.1; útil para retomar o projeto depois de um tempo parado, mas não é requisito de nenhuma SPEC/AC.
  resolved: 2026-09-21 (hardening v1.0) — README.md reescrito para o app concluído, com instalação, testes, deploy e arquitetura (commit `3e1d9b7`, revisado no hardening).

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
  resolved: 2026-09-21 (hardening v1.0) — a exclusão reindexa a Data (`closeOrderGap`, hoje o único ponto de renumeração) e há teste de criar 3, excluir a do meio e criar a 4ª com `order` único e sequencial (`useTaskActions.test.ts`, commit `8a0c337`); o E2E de exclusão confere `order` [0,1] depois de apagar a do meio.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-criar-tarefa.md`
  summary: Sem proteção contra duplo-clique rápido em "Adicionar tarefa"/"Salvar"/"Excluir" — duas chamadas de `createTask`/`updateTask`/`deleteTask` antes do re-render poderiam ler o mesmo `state.tasks` (closure) e calcular o mesmo `order`/reindexar com dado desatualizado.
  evidence: Achado do blind-hunter/edge-case-hunter das Stories 2.1/2.2, confirmado ainda válido para `deleteTask` na Story 2.3 (mesma closure `state.tasks`) e para `cycleState` na Story 3.1 (mesmo padrão de guard, mesma closure); risco real baixo (clique físico de mouse único, sem AC exigindo debounce), mas uma melhoria de robustez futura (desabilitar o controle durante a operação) se algum dia se mostrar necessário.
  resolved: 2026-09-21 (hardening v1.0) — verificado em Chrome real (`e2e/robustness.spec.ts`, "duplo clique"): duplo clique em Adicionar cria UMA tarefa; em Salvar não duplica nem reordena; em Excluir (confirmação) remove só a tarefa certa e mantém `order` sequencial. O React descarrega o modal de forma síncrona no 1º clique (evento discreto), então o 2º clique não chega ao botão.

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
  resolved: 2026-09-21 (hardening v1.0) — regra num só lugar, `selectors.isTaskCompleted` (commit `765e312`); `TaskCard` e `applyRollover` a usam, e os mapas `Record<TaskState, …>` do `StateIndicator` já eram checados pelo compilador.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-reordenar-tarefas-por-arraste.md`
  summary: O plugin de acessibilidade padrão do `@dnd-kit` (`Accessibility`, parte do `defaultPreset`) anuncia o início/fim do arraste em inglês e citando o UUID cru da tarefa (ex. "Picked up draggable item {uuid}"), nunca sobrescrito por `DragDropProvider` em `DayColumn.tsx` — inconsistente com o resto do app, cuidadosamente em português (ex. "Arrastar tarefa: {título}").
  evidence: Achado do blind-hunter da Story 4.1, confirmado lendo `node_modules/@dnd-kit/dom`'s `defaultAnnouncements`/`Accessibility` options (`announcements`/`screenReaderInstructions` são configuráveis, mas corrigir corretamente exige mapear `event.operation.source.id` de volta ao título da tarefa dentro do closure de `TaskPriorityGroup` — pesquisa de API suficiente para não ser um patch seguro durante a revisão desta story; precisa de uma passada dedicada antes de expor a funcionalidade a uma usuária real de leitor de tela).
  updated: 2026-09-19 (retro Epics 5-7, A5) — ainda vale com a lib atual: `WeekView.tsx` usa `DndContext` de `@dnd-kit/core` sem a prop `accessibility`, então valem os anúncios e instruções padrão (em inglês, citando o id da tarefa). A correção passa a ser `accessibility={{ announcements, screenReaderInstructions }}` no `DndContext`, mapeando o id ao título.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-reordenar-tarefas-por-arraste.md`
  summary: Falha de escrita ao reordenar por arraste (`useTaskActions.reorderTask` retornando `{ok:false}`) não tem nenhum feedback visível ao usuário — diferente do padrão `role="alert"` já usado por `createTask`/`updateTask`/`deleteTask` no `TaskModal`.
  evidence: Achado do blind-hunter da Story 4.1; ao contrário de `cycleState` (Story 3.1, cujo "Never" na spec decidiu explicitamente não mostrar erro, mesmo padrão do `ThemeToggle`), a spec da 4.1 não tomou essa decisão explicitamente — mas não há Modal aberto durante um arraste para hospedar uma mensagem `role="alert"`, então corrigir isto exige uma decisão de UX nova (ex. toast/banner) antes de virar código.
  updated: 2026-09-19 (retro Epics 5-7, A5) — `reorderTask` não existe mais; a mesma lacuna vale para `moveTaskToDate` no drop: `WeekView.handleDragEnd` só usa `result.ok` para o foco, e em falha o card apenas volta ao dia de origem, sem mensagem. Continua dependendo de uma decisão de UX (toast/banner).

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-reordenar-tarefas-por-arraste.md`
  summary: O placeholder tracejado que o `@dnd-kit` insere no destino do arraste (`[data-dnd-placeholder]`) não foi verificado quanto a `aria-hidden` — pode permanecer um item de lista vazio e sem rótulo na árvore de acessibilidade enquanto um arraste está em andamento.
  evidence: Achado do blind-hunter da Story 4.1; não confirmado se a própria lib já trata isso por padrão (comportamento não pesquisado a fundo) — precisa de verificação antes de decidir se há algo a corrigir.
  resolved: 2026-09-19 (retro Epics 5-7, A5) — o app não usa mais `@dnd-kit/dom`/`DragDropProvider` (troca para `@dnd-kit/core`, `DndContext` + `useDraggable`/`useDroppable`, sem `DragOverlay`): não existe mais o elemento `[data-dnd-placeholder]`.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-reordenar-tarefas-por-arraste.md`
  summary: A animação de "levantado" durante o arraste (`.dragging`: sombra + rotação -2deg) e a transição de reposicionamento do próprio `@dnd-kit` não respeitam `prefers-reduced-motion`.
  evidence: Achado do blind-hunter da Story 4.1; nenhuma AC ou `DESIGN.md` exige isso explicitamente, mas é uma lacuna real de acessibilidade não coberta por nenhuma história ainda.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-reordenar-tarefas-por-arraste.md`
  summary: Um `DragDropProvider`/`DragDropManager` próprio é criado por grupo `(day, priority)` — com 7 dias × até 4 níveis de prioridade, potencialmente dezenas de instâncias simultâneas montadas (cada uma com seus próprios sensores/ResizeObservers/nós de acessibilidade), sem nenhuma medição do custo de DOM/desempenho conforme o volume de tarefas cresce.
  evidence: Achado do blind-hunter da Story 4.1; nenhum problema observado hoje (uso pessoal, poucas tarefas por dia esperadas), mas vale revisitar se o uso real mostrar degradação, não hipoteticamente.
  resolved: Story 4.2 consolidou as ~28 instâncias isoladas por grupo num único `DragDropProvider` em `WeekView` (decisão arquitetural necessária para permitir arraste entre grupos, não uma otimização deliberada deste item) — o risco original não se aplica mais.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-mudar-prioridade-ou-dia-arrastando-o-card.md`
  summary: O rótulo de cada zona de Prioridade (`.zoneLabel`, ex. "Alta") só existe visualmente durante um arraste ativo e não está associado via `aria-label`/`aria-labelledby` à lista da zona; também não há anúncio do resultado (ex. "movida para Quarta-feira, Alta Prioridade") após um cruzamento de grupo por teclado.
  evidence: Achado do blind-hunter da Story 4.2; estende o item já registrado na Story 4.1 sobre os anúncios em inglês/UUID do plugin de acessibilidade padrão do `@dnd-kit` — agora mais relevante, já que cruzar Dia/Prioridade muda mais coisas para o usuário perceber do que só reposicionar dentro do mesmo grupo.
  resolved: 2026-09-19 (retro Epics 5-7, A5) — as zonas de Prioridade foram removidas (Epic 4 revisado, commit `c9e3cf6`); só existe uma área soltável por coluna. A parte sobre anúncios de leitor de tela continua valendo pelo item da Story 4.1 acima (anúncios padrão do `@dnd-kit`).

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-mudar-prioridade-ou-dia-arrastando-o-card.md`
  summary: O destaque visual das zonas durante o arraste (`.zoneActive`) muda `border-color` e `padding` (1px → `--spacing-1`), o que altera as dimensões da caixa — iniciar qualquer arraste desloca a posição de todos os Cards/zonas nas 28 zonas da semana simultaneamente (reflow), não só uma mudança de cor/sombra.
  evidence: Achado do blind-hunter da Story 4.2; um `outline`/`box-shadow` evitaria o reflow sem mudar o efeito visual pretendido — não corrigido nesta revisão por ser um ajuste de CSS não crítico, sem AC/`DESIGN.md` exigindo um comportamento específico (a decisão de destacar zonas foi confirmada com Isabel, mas não a técnica exata de destaque).
  resolved: 2026-09-19 (retro Epics 5-7, A5) — `.zoneActive` foi removido junto com as zonas; o destaque atual (`.dropActive` em `DayColumn.module.css:26-29`) só muda `outline-color` e `background-color`, sem alterar dimensões — não há reflow.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-mudar-prioridade-ou-dia-arrastando-o-card.md`
  summary: Todas as 28 zonas (7 dias × 4 prioridades) ficam "ativas" (rótulo visível, destaque) durante qualquer arraste, mesmo um simples reposicionamento dentro do mesmo grupo que nunca vai sair dali — não há distinção visual entre "um arraste está em andamento em algum lugar" e "esta é a zona onde o Card seria solto agora".
  evidence: Achado do blind-hunter da Story 4.2; corrigir exigiria ligar o destaque ao estado de colisão/hover real do `@dnd-kit` (`isDropTarget` ou equivalente) por zona, não só a um booleano global de "há arraste em andamento" — feature maior, não um ajuste rápido de revisão.
  resolved: 2026-09-19 (retro Epics 5-7, A5) — as 28 zonas não existem mais; cada coluna é um único alvo soltável e só a coluna sob o cursor recebe o destaque (`isOver` em `DayColumn.tsx`).

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-mudar-prioridade-ou-dia-arrastando-o-card.md`
  summary: A ordem/rótulos dos 4 níveis de Prioridade são declarados de forma independente em 3 lugares — `PRIORITY_RANK` (`selectors.ts`), `PRIORITY_ZONES`/`ZONE_LABELS` (`DayColumn.tsx`, novos nesta story) e os rótulos já usados por `PriorityTag` — nenhuma fonte única compartilhada.
  evidence: Achado do blind-hunter da Story 4.2; risco baixo hoje (os 4 níveis são fixos, nunca mudaram desde o Epic 2), mas os três lugares podem divergir silenciosamente se um nível for renomeado/reordenado no futuro.
  updated: 2026-09-19 (retro Epics 5-7, A5) — `PRIORITY_RANK` e `PRIORITY_ZONES`/`ZONE_LABELS` foram removidos, mas os níveis continuam declarados em 3 lugares: `PRIORITY_LABELS` (`PriorityTag.tsx`), `PRIORITY_OPTIONS` (`TaskModal.tsx`) e `PRIORITY_CYCLE_ORDER` (`useTaskActions.ts`).

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-mudar-prioridade-ou-dia-arrastando-o-card.md`
  summary: `resolveWeekDragChange` decide "cruzou grupo" comparando `source.group` com `source.initialGroup`, campos mantidos ao vivo pelo `OptimisticSortingPlugin` do `@dnd-kit` durante o arraste — esse comportamento exato (o que `source.group` reflete no instante do drop após um gesto físico real, incluindo casos como soltar rapidamente ou cancelar no meio) não foi verificado manualmente num navegador real, só via eventos sintéticos em teste.
  evidence: Achado do blind-hunter da Story 4.2, mitigado (não eliminado) pelo guard de `target` ausente adicionado na revisão; mesma classe de limitação já aceita para todo o resto da interação de arraste (jsdom não simula gestos físicos) — recomenda-se uma checagem manual quando houver oportunidade de testar num navegador real.
  resolved: 2026-09-19 (retro Epics 5-7, A5) — `resolveWeekDragChange` foi reescrita (`dragChange.ts`): lê só os ids de `active`/`over` (a coluna de destino é a própria `date`), sem `source.group`/`initialGroup`/`OptimisticSortingPlugin`. O arraste com gesto físico real foi verificado manualmente pela Isabel em 2026-09-19 (ver comentário do `sprint-status.yaml`, A9).

- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-migrar-dados-existentes-para-o-modelo-de-data-real.md`
  summary: No Modal de Tarefa (modo edição), o `<select>` de Dia pode não ter uma `<option>` correspondente à data atual da tarefa, se essa data já saiu da janela dinâmica de 7 dias (visualmente confuso, embora o estado React interno continue correto e o salvamento não corrompa nada).
  evidence: Achado do blind-hunter review da Story 5.1; consequência direta de ainda não existir rollover automático (Story 5.4) — só é alcançável para uma tarefa não concluída deixada aberta por vários dias sem edição; deve deixar de ser possível assim que a Story 5.4 (rollover) for implementada.
  resolved: 2026-09-19 (retro Epics 5-7, A5) — o rollover da Story 5.4 traz tarefas atrasadas para hoje (`d8e10b8`, `c9e3cf6`), agora também quando as tarefas mudam (`7136ae1`), e a lista de Dia do modal acompanha a data de hoje (`9c1145a`).

- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-migrar-dados-existentes-para-o-modelo-de-data-real.md`
  summary: O cabeçalho de cada Coluna do Dia ficou mais longo (`"Sexta-feira, 18/09"` em vez de `"Sexta-feira"`) e nenhum `.module.css` foi revisado para confirmar que a coluna de largura fixa ainda acomoda o texto sem quebrar/cortar.
  evidence: Achado do blind-hunter review da Story 5.1; requer inspeção visual num navegador real, não verificável neste ambiente; `DayColumn.module.css` não estava no Code Map desta história.
  resolved: 2026-09-19 (retro Epics 5-7, A5) — medido no navegador (Chrome, `localhost:5173`): a 1280px e 1440px o cabeçalho cabe em uma linha; a 1100px, 1024px e 900px quebra em duas linhas (5 de 7 a 1024px). Em nenhuma largura o texto é cortado (`scrollWidth <= clientWidth`). Quebra de linha aceita como comportamento responsivo.

- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-migrar-dados-existentes-para-o-modelo-de-data-real.md`
  summary: `parseISODateLocal`/`getWeekdayIndex`/`formatDayHeading` (`src/constants/week.ts`) não validam o formato da string de entrada — uma data malformada produziria `Invalid Date`/`NaN` e um rótulo de dia-da-semana `undefined`, em vez de falhar de forma previsível.
  evidence: Achado do blind-hunter/edge-case-hunter review da Story 5.1; risco baixo hoje porque todo chamador atual passa strings ISO já bem-formadas (via `toISODate` ou dados validados na carga do storage); vale um guard se um novo chamador for adicionado depois.

---
stepsCompleted: ["step-01-validate-prerequisites-confirmed", "step-02-design-epics-approved", "step-03-epic-1-approved", "step-03-epic-2-approved", "step-03-epic-3-approved", "step-03-epic-4-approved", "step-03-all-epics-complete"]
inputDocuments:
  - "_bmad-output/specs/spec-taskflow/SPEC.md"
  - "_bmad-output/specs/spec-taskflow/glossary.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-teste bmad-2026-09-10/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-teste bmad-2026-09-09/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-teste bmad-2026-09-09/EXPERIENCE.md"
  - "_bmad-output/planning-artifacts/prds/prd-teste bmad-2026-09-09/prd.md"
  - "_bmad-output/planning-artifacts/briefs/brief-teste bmad-2026-09-09/brief.md"
---

# TaskFlow - Epic Breakdown

## Overview

Este documento decompõe a especificação validada do TaskFlow (`SPEC.md`, CAP-1..CAP-9) e seus companions de arquitetura e UX (`ARCHITECTURE-SPINE.md`, `DESIGN.md`, `EXPERIENCE.md`) em épicos e histórias implementáveis. PRD e Product Brief são consultados para contexto narrativo e rastreabilidade adicional (FR-1..FR-7), mas a SPEC é a fonte canônica de escopo: nenhuma capacidade nova é introduzida além de CAP-1..CAP-9, e nenhuma decisão já tomada em arquitetura ou UX é revisitada aqui.

## Requirements Inventory

### Functional Requirements

*(Fonte: PRD §4, confirmados finais; cada FR corresponde 1:1 a uma capacidade da SPEC — CAP-x entre colchetes.)*

FR-1: Isabel pode criar uma Tarefa vinculada a um Dia da Semana específico, com Título obrigatório, Dia obrigatório e Prioridade opcional. Estado inicial sempre Pendente. A tarefa aparece imediatamente no dia certo, já ordenada por prioridade. Salvar sem título ou dia falha e mantém o formulário aberto sinalizando os campos pendentes. [CAP-1]

FR-2: Isabel pode editar Título, Dia da Semana e Prioridade de uma Tarefa existente. Mudar o Dia move a tarefa para a coluna nova. Título e Dia continuam obrigatórios para salvar. O Estado não é alterado por esta ação (ação separada, FR-4). [CAP-2]

FR-3: Isabel pode excluir uma Tarefa existente, com confirmação explícita antes da remoção definitiva. Cancelar mantém a tarefa intacta. Sem desfazer nem lixeira no MVP. [CAP-3]

FR-4: Isabel pode alternar o Estado de uma Tarefa entre Pendente, Em andamento e Concluída, a qualquer momento e em qualquer ordem, inclusive voltar de Concluída para um estado anterior. Mudança refletida imediatamente na tela. [CAP-4]

FR-5: Isabel vê, numa única tela, os 7 dias da semana e as tarefas de cada um, sem navegar entre telas. Um dia sem tarefas exibe claramente que está vazio, nunca parece erro de carregamento. [CAP-5]

FR-6: Dentro de cada dia, as tarefas são ordenadas automaticamente por Prioridade (Alta→Média→Baixa→sem prioridade), com o nível reconhecível visualmente. Dentro do mesmo nível, Isabel reordena manualmente por arraste, com equivalente completo pelo Modal de Tarefa (nenhuma ação depende exclusivamente de mouse). Reordenar dentro do nível persiste entre sessões. [CAP-6]

FR-7: Tarefas com Estado Concluída permanecem visíveis no seu dia, com diferenciação visual clara, reconhecível sem ler o rótulo de Estado. Nunca ocultadas ou removidas da visualização. [CAP-7]

*(CAP-8 e CAP-9 não têm FR numerado próprio no PRD — são cobertas pelo NFR de Persistência (§5) e pela Foundation de tema do EXPERIENCE.md, formalizadas em ADs. Ver Additional Requirements.)*

### NonFunctional Requirements

*(Fonte: PRD §5.)*

NFR-1 (Persistência): Os dados das Tarefas sobrevivem a fechar e reabrir o navegador, sem login. Falha ao salvar mantém o Modal aberto com erro inline e o que foi digitado preservado (nunca retry silencioso); falha ao carregar cai num estado vazio com aviso único, nunca crash. [CAP-8; AD-2, AD-3, AD-4]

NFR-2 (Plataforma): Uso previsto só em navegador desktop; sem responsividade mobile nem sincronização entre dispositivos no MVP. [Constraint — orienta o que NÃO construir]

NFR-3 (Sem autenticação): MVP single-user, sem cadastro/login; todas as tarefas pertencem implicitamente à única usuária da instalação. [Constraint — orienta o que NÃO construir]

### Additional Requirements

*(Fonte: `ARCHITECTURE-SPINE.md`, AD-1..AD-9 — regras estruturais já decididas; downstream lê, não reimplementa.)*

- AD-1 — Sem backend, sem infraestrutura própria: todo o MVP roda 100% client-side. [todas as CAPs]
- AD-2 — Persistência via `localStorage` em duas chaves independentes: `taskflow:tasks` (`{schemaVersion, tasks[]}`) e `taskflow:theme` (string crua `'light'`/`'dark'`); chave ausente → estado vazio padrão sem erro; chave presente mas ilegível → estado vazio padrão + `loadError` mostrado uma vez; tema padrão sempre `'light'` no primeiro uso. [CAP-8, CAP-9]
- AD-3 — Mitigação do risco de perda de dados é um aviso estático e discreto na interface; sem backup/exportação no MVP. [CAP-8]
- AD-4 — Persistência e commit de estado são atômicos: toda função de ação (`useTaskActions`/`useThemeActions`) tenta salvar em `localStorage` (síncrono, `try/catch`) antes de despachar ao reducer; falha não muda o estado React e retorna `{ok:false, error:{message}}`; sucesso retorna `{ok:true, ...}`; nenhum caminho de mutação (incluindo o drop handler do drag-and-drop) contorna esse guard ou chama `dispatch` diretamente. [CAP-1, CAP-2, CAP-3, CAP-4, CAP-6, CAP-8]
- AD-5 — Estado gerenciado via `useReducer` + `Context` nativo do React (`tasksReducer`/`TaskContext`, `themeReducer`/`ThemeContext`); sem lib de state management externa. [transversal, todas as CAPs]
- AD-6 — Arraste via `@dnd-kit/react` (+ `@dnd-kit/dom`, `@dnd-kit/helpers`), cujo sensor de teclado é a mesma lógica usada pelo mouse — sem reimplementação paralela. [CAP-6]
- AD-7 — Campo `order` (inteiro) com escopo `(day, priorityGroup)`; função pura única `reorderWithinGroup` (`src/state/`) reindexa sequencialmente, chamada tanto pelo drag quanto pelo Modal; tarefa nova recebe `order` = último do grupo. [CAP-6]
- AD-8 — Só o storage adapter (`src/storage/`) toca `localStorage`; `src/components/` e `src/state/` nunca importam `window.localStorage` diretamente. [CAP-8; transversal]
- AD-9 — Tokens de `DESIGN.md` como CSS custom properties em `src/styles/tokens.css`, valores `-dark` redefinidos sob `:root[data-theme="dark"]`; `ThemeContext` só seta `document.documentElement.dataset.theme`; troca de tema é 100% CSS, sem re-render de estilos via JS; CSS Modules colocalizados por componente, sem CSS-in-JS/Tailwind. [CAP-9; estilo visual de todas as CAPs]

### UX Design Requirements

*(Fonte: `DESIGN.md` + `EXPERIENCE.md`, spine pair "final". Cada UX-DR é específico o bastante para gerar critérios de aceite testáveis — nenhum resumido para "criar componentes reutilizáveis".)*

UX-DR1: Tokens de design (cores, tipografia, `rounded`, `spacing`) implementados globalmente em `src/styles/tokens.css` como CSS custom properties, com variante `-dark` redefinida sob `:root[data-theme="dark"]`. [CAP-9; DESIGN.md tokens; AD-9]

UX-DR2: Componente Cabeçalho (`Header`) — faixa fina no topo, título "TaskFlow" (`typography.heading`) à esquerda, Alternador de Tema à direita; único elemento fora da grade de dias. [CAP-9; DESIGN.md/EXPERIENCE.md Component Patterns]

UX-DR3: Componente Coluna do Dia (`DayColumn`) — nome do dia (`day-label`) no topo; lista de Cards de Tarefa; controle "+ Adicionar tarefa" sempre visível no rodapé, mesmo com a coluna cheia; a coluna do dia atual recebe o destaque visual `today-background` (~8% opacidade + borda superior sólida). [CAP-5, CAP-1]

UX-DR4: Componente Card de Tarefa (`TaskCard`) — mostra Indicador de Estado, nome da tarefa (`body`), Tag de Prioridade quando definida; clique em qualquer área do Card exceto o Indicador de Estado abre o Modal de Tarefa em modo edição; o Card é arrastável. [CAP-2, CAP-5, CAP-6]

UX-DR5: Tarefa Concluída aplica `completed-opacity` (0.55) ao Card inteiro e risca o nome (`text-decoration: line-through`); permanece na posição da coluna, nunca ocultada ou removida. [CAP-7]

UX-DR6: Tag de Prioridade (`PriorityTag`) — cor por nível (Alta/Média/Baixa), formato barra lateral fina de 3px ou pílula compacta; ausente por completo (sem placeholder vazio) quando a Tarefa não tem prioridade definida. [CAP-6]

UX-DR7: Indicador de Estado (`StateIndicator`) — círculo de 18px (`rounded.full`); clique único cicla Pendente → Em andamento → Concluída → Pendente (wraparound); não abre o modal; anuncia o nome do estado atual para leitor de tela (não apenas ícone/cor). [CAP-4]

UX-DR8: Modal de Tarefa (`TaskModal`) — dois modos: criação (campos Nome obrigatório + Prioridade opcional, nenhuma selecionada por padrão; Dia fixo = coluna de origem, não editável) e edição (adiciona Estado com 3 opções e Dia editável com os 7 dias; inclui o ponto de entrada "Excluir tarefa"); Nome e Dia obrigatórios para salvar em ambos os modos; retém o foco enquanto aberto; Esc fecha e descarta alterações não salvas, foco retorna ao controle que abriu o modal. [CAP-1, CAP-2]

UX-DR9: Campo obrigatório vazio no Modal — tentar salvar com Nome ou Dia vazio não fecha o modal: mantém aberto e sinaliza os campos pendentes; Prioridade e Estado nunca bloqueiam o salvamento. [CAP-1, CAP-2]

UX-DR10: Confirmação de Exclusão — passo interno do próprio Modal de Tarefa (nunca um segundo modal empilhado); substitui temporariamente o conteúdo do modal por "Excluir esta tarefa? Essa ação não pode ser desfeita." e dois botões: "Cancelar" (`ink-secondary`, sem destaque) e "Excluir" (`button-destructive`); cancelar mantém a Tarefa intacta, sem nenhuma alteração. [CAP-3]

UX-DR11: Alternador de Tema (`ThemeToggle`) — ícone sol/lua no Cabeçalho, `icon-color-active` (`accent`) indica o tema atualmente ativo; alterna claro/escuro instantaneamente, sem recarregar a página; preferência salva e usada em toda sessão futura; nunca segue `prefers-color-scheme`. [CAP-9]

UX-DR12: Interações de arraste — arrastar um Card para outra faixa de Prioridade dentro do mesmo dia muda a Prioridade (posição = prioridade); arrastar um Card para a coluna de outro dia muda o Dia da Semana (entra na nova coluna já ordenada pela Prioridade atual); durante o arraste o Card ganha sombra + leve rotação (único uso de sombra decorativa do produto) e um placeholder tracejado marca onde vai encaixar. [CAP-6]

UX-DR13: Equivalente completo por teclado — toda ação alcançável pelo arraste (ciclar Estado, mudar Prioridade, mudar Dia) também é alcançável via campos do Modal de Tarefa ou sensor de teclado do `@dnd-kit`; foco visível (outline) em todo elemento interativo (Cards, Indicador de Estado, controles do Modal, Alternador de Tema); rótulos explícitos em vez de apenas ícones (ex. "Excluir tarefa"). [CAP-6; Accessibility Floor; AD-6]

UX-DR14: Estado vazio do dia — texto discreto "Nenhuma tarefa" (`ink-secondary`) + controle "+ Adicionar tarefa" visível; nunca parece erro de carregamento. [CAP-5]

UX-DR15: Microcopy e voz — tom neutro e direto, sem exclamação/emoji; textos fixados: "Adicionar tarefa", "Nenhuma tarefa", "Excluir esta tarefa? Essa ação não pode ser desfeita.", "Excluir tarefa" / "Cancelar". [transversal — Voice and Tone]

UX-DR16: Falha ao salvar (Modal de Tarefa, qualquer modo) — o modal permanece aberto com uma mensagem de erro inline, os campos já preenchidos são preservados, com opção de tentar novamente ou cancelar; nunca uma nova tentativa automática e silenciosa. [CAP-8; AD-4]

### FR Coverage Map

*(Aprovado em Party Mode com John/PM, Winston/Arquiteto, Sally/UX, Mary/Analyst, Amelia/Dev — decisões de Isabel: Epic Tema fundido ao Epic 1; ordem Epic 3 antes do Epic 4 mantida.)*

| CAP / FR | Épico |
| --- | --- |
| CAP-1 (FR-1) Criar tarefa | Epic 2 |
| CAP-2 (FR-2) Editar tarefa | Epic 2 |
| CAP-3 (FR-3) Excluir tarefa | Epic 2 |
| CAP-4 (FR-4) Alterar estado | Epic 3 (controle rápido) + Epic 2 (parcial: campo Estado no Modal) |
| CAP-5 (FR-5) Visualizar semana | Epic 1 (vazia) + Epic 2 (populada) |
| CAP-6 (FR-6) Ordenar/reordenar prioridade | Epic 2 (automático) + Epic 4 (manual/arraste) |
| CAP-7 (FR-7) Diferenciar concluída | Epic 3 |
| CAP-8 (NFR-1) Persistência | Epic 1 |
| CAP-9 Tema claro/escuro | Epic 1 |

## Epic List

### Epic 1: Fundação — App, Persistência, Semana Vazia e Tema
Isabel abre o TaskFlow e já vê a estrutura da semana (7 dias, estado vazio claro), a persistência de tarefas funciona desde o início, e ela pode alternar entre tema claro/escuro pelo Cabeçalho.
**CAPs cobertas:** CAP-5 (parcial), CAP-8, CAP-9.

### Epic 2: Gerenciar Tarefas (criar, editar, excluir)
Isabel cria, edita e exclui tarefas vinculadas a um dia, com validação e confirmação explícita de exclusão. Tarefas aparecem e se reordenam automaticamente por nível de prioridade. O Modal também expõe o campo Estado como via alternativa completa de edição (sem antecipar o controle rápido do Epic 3).
**CAPs cobertas:** CAP-1, CAP-2, CAP-3, CAP-4 (parcial: via Modal), CAP-6 (parcial: ordenação automática).

### Epic 3: Progresso do Dia
Isabel alterna o Estado de uma tarefa; tarefas concluídas ficam visualmente diferenciadas, nunca escondidas.
**CAPs cobertas:** CAP-4, CAP-7.

### Epic 4: Reordenar e Mudar por Arraste
Isabel reordena manualmente dentro do mesmo nível de prioridade e muda prioridade/dia por arraste, com equivalente completo por teclado.
**CAPs cobertas:** CAP-6 (parcial: manual/arraste).

## Epic 1: Fundação — App, Persistência, Semana Vazia e Tema

Isabel abre o TaskFlow e já vê a estrutura da semana (7 dias, estado vazio claro, nunca parecendo erro), a persistência de tarefas funciona desde o início (`taskflow:tasks`, com tratamento de dado ausente/corrompido), e ela pode alternar entre tema claro/escuro pelo Cabeçalho, com a preferência salva separadamente (`taskflow:theme`, AD-2) e nunca seguindo o sistema operacional.

**CAPs cobertas:** CAP-5 (parcial: estado vazio), CAP-8, CAP-9.
**Requisitos adicionais/UX:** AD-1, AD-2, AD-3, AD-5, AD-8, AD-9; UX-DR1, UX-DR2, UX-DR3 (parcial), UX-DR11, UX-DR14, UX-DR15 (parcial: "Nenhuma tarefa"); NFR-1, NFR-3.

### Story 1.1: Visualizar a Semana vazia

Como Isabel,
Eu quero ver os 7 dias da semana ao abrir o TaskFlow, mesmo antes de criar qualquer tarefa,
Para que eu saiba que a estrutura existe e possa começar a organizar minha semana.

**Acceptance Criteria:**

**Given** Isabel abre o TaskFlow pela primeira vez (sem dados salvos)
**When** a página carrega
**Then** os 7 dias da semana (Segunda a Domingo) aparecem simultaneamente, sem necessidade de navegação
**And** cada dia sem tarefas exibe o texto discreto "Nenhuma tarefa" (`ink-secondary`) — nunca parece erro de carregamento
**And** o controle "+ Adicionar tarefa" está visível no rodapé de cada coluna
**And** a coluna correspondente ao dia atual recebe o destaque visual `today-background`
**And** o Cabeçalho exibe o título "TaskFlow" à esquerda, fora da grade de dias

### Story 1.2: Persistir dados de tarefas entre sessões

Como Isabel,
Eu quero que meus dados de tarefas sejam salvos e recuperados automaticamente do navegador,
Para que minhas tarefas continuem disponíveis ao fechar e reabrir o navegador.

**Acceptance Criteria:**

**Given** não existe nenhuma chave `taskflow:tasks` salva (primeira instalação)
**When** o app inicializa
**Then** o estado cai no padrão vazio (`{ schemaVersion: CURRENT, tasks: [] }`), sem erro e sem exceção não tratada

**Given** existe uma chave `taskflow:tasks` salva, mas ilegível (`getItem` lança, `JSON.parse` falha, ou `schemaVersion` não reconhecido)
**When** o app inicializa
**Then** o estado também cai no padrão vazio
**And** um aviso único e discreto é exibido na abertura: "Não foi possível carregar as tarefas salvas — começando do zero."
**And** o app nunca trava (crash) por esse motivo

**Given** o app está em uso normal
**When** qualquer leitura/escrita de tarefas ocorre
**Then** apenas o módulo `src/storage/` (`loadTasks`/`saveTasks`) acessa `window.localStorage` diretamente — nenhum componente ou reducer o faz

**And** a interface exibe um aviso estático e discreto informando que os dados ficam salvos apenas neste navegador/computador (mitigação de risco de perda de dados, sem backup/exportação no MVP)

### Story 1.3: Alternar entre tema claro e escuro

Como Isabel,
Eu quero alternar manualmente entre tema claro e escuro pelo Cabeçalho,
Para que a aparência reflita minha preferência, salva entre sessões, sem depender do sistema operacional.

**Acceptance Criteria:**

**Given** não existe nenhuma chave `taskflow:theme` salva (primeiro uso)
**When** o app inicializa
**Then** o tema aplicado é sempre `'light'` — nunca derivado de `prefers-color-scheme`

**Given** Isabel clica no Alternador de Tema no Cabeçalho
**When** o clique ocorre
**Then** o tema muda instantaneamente (claro↔escuro), sem recarregar a página, via atributo `data-theme` no elemento raiz (troca 100% CSS)
**And** o ícone ativo (`icon-color-active`) reflete o tema atual
**And** a preferência é salva em `taskflow:theme` como string crua (`'light'`/`'dark'`, nunca `JSON.stringify`), separada da chave de tarefas (AD-2)
**And** a escrita segue o mesmo guard de persistência atômica: se salvar falhar, o tema exibido não muda (`useThemeActions` retorna `{ok:false, error}`, nunca lança exceção)

**Given** Isabel fecha e reabre o navegador após ter escolhido um tema
**When** o app inicializa
**Then** o último tema escolhido é aplicado imediatamente, sem piscar o tema padrão antes

**And** o Alternador de Tema tem foco visível (outline) quando navegado por teclado

## Epic 2: Gerenciar Tarefas (criar, editar, excluir)

Isabel cria tarefas vinculadas a um dia (título obrigatório, prioridade opcional), edita título/dia/prioridade/estado de tarefas existentes, e exclui com confirmação explícita antes da remoção definitiva. Tarefas aparecem e se reordenam automaticamente por nível de prioridade.

**CAPs cobertas:** CAP-1, CAP-2, CAP-3, CAP-4 (parcial: via Modal), CAP-6 (parcial: ordenação automática por nível).
**Requisitos adicionais/UX:** AD-4, AD-7 (parcial: `order` sequencial ao criar); UX-DR3 (parcial), UX-DR4, UX-DR6, UX-DR8, UX-DR9, UX-DR10, UX-DR15 (parcial: "Adicionar tarefa", texto de confirmação de exclusão), UX-DR16.

### Story 2.1: Criar tarefa

Como Isabel,
Eu quero criar uma tarefa vinculada a um dia específico da semana, com prioridade opcional,
Para que eu possa começar a organizar o que preciso fazer naquela semana.

**Acceptance Criteria:**

**Given** Isabel clica em "+ Adicionar tarefa" numa Coluna do Dia
**When** o Modal de Tarefa abre em modo criação
**Then** o campo Nome está vazio e em foco, o Dia está fixo (= coluna de origem, não editável nesse fluxo), e nenhuma Prioridade vem pré-selecionada
**And** o modal retém o foco enquanto aberto

**Given** o Modal de Tarefa em modo criação está aberto
**When** Isabel preenche o Nome (obrigatório) e opcionalmente escolhe uma Prioridade, e confirma
**Then** a tarefa é criada com Estado inicial sempre Pendente
**And** aparece imediatamente na coluna do dia de origem, na posição correta segundo a ordenação por nível de Prioridade (Alta→Média→Baixa→sem prioridade), recebendo `order` = último do seu grupo
**And** o modal fecha

**Given** o Modal de Tarefa em modo criação está aberto
**When** Isabel tenta confirmar com o campo Nome vazio
**Then** o modal permanece aberto, sinalizando o campo pendente, e nenhuma tarefa é criada

**Given** Isabel confirma a criação
**When** a escrita em `localStorage` falha
**Then** o modal permanece aberto com uma mensagem de erro inline, os campos preenchidos são preservados, com opção de tentar novamente ou cancelar — nunca uma nova tentativa automática e silenciosa
**And** nenhuma tarefa aparece na coluna até a escrita ter sucesso

**And** Isabel pode fechar o modal com Esc a qualquer momento, descartando o que não foi salvo, com o foco retornando ao controle "+ Adicionar tarefa" que abriu o modal

### Story 2.2: Editar tarefa existente

Como Isabel,
Eu quero editar o título, o dia da semana, a prioridade e o estado de uma tarefa existente pelo Modal,
Para que o TaskFlow continue refletindo a realidade da semana conforme ela muda, com o Modal como via completa alternativa a qualquer interação rápida.

**Acceptance Criteria:**

**Given** existe uma tarefa em alguma coluna
**When** Isabel clica em qualquer área do Card exceto o Indicador de Estado
**Then** o Modal de Tarefa abre em modo edição, com Nome, Dia, Prioridade e Estado preenchidos com os valores atuais

**Given** o Modal de Tarefa em modo edição está aberto
**When** Isabel altera o Dia da Semana e confirma
**Then** a tarefa se move da coluna antiga para a coluna do novo dia, entrando já ordenada pela sua Prioridade atual
**And** o Estado da tarefa não é alterado por essa mudança de dia

**Given** o Modal de Tarefa em modo edição está aberto
**When** Isabel altera a Prioridade e confirma
**Then** a tarefa é reposicionada dentro do seu dia conforme o novo nível de Prioridade

**Given** o Modal de Tarefa em modo edição está aberto
**When** Isabel seleciona uma opção diferente no campo Estado (Pendente / Em andamento / Concluída) e confirma
**Then** o novo Estado é persistido junto com as demais alterações do formulário
**And** esta é a via alternativa completa do Modal a qualquer mudança de Estado — o controle rápido de ciclo por clique no Indicador de Estado do Card é responsabilidade do Epic 3 e não faz parte desta história

**Given** o Modal de Tarefa em modo edição está aberto
**When** Isabel altera Título, Dia e/ou Prioridade sem tocar no campo Estado, e confirma
**Then** o Estado da tarefa permanece o mesmo que tinha antes — editar os demais campos não tem efeito colateral sobre o Estado

**Given** o Modal de Tarefa em modo edição está aberto
**When** Isabel tenta salvar com Nome ou Dia vazio
**Then** o modal permanece aberto, sinalizando o(s) campo(s) pendente(s), e nenhuma alteração é persistida

**Given** Isabel confirma a edição
**When** a escrita em `localStorage` falha
**Then** o modal permanece aberto com mensagem de erro inline, os valores editados são preservados, com opção de tentar novamente ou cancelar
**And** a tarefa mantém seus valores anteriores na visualização até a escrita ter sucesso

### Story 2.3: Excluir tarefa com confirmação

Como Isabel,
Eu quero excluir uma tarefa existente, com uma etapa de confirmação explícita,
Para que eu remova o que não faz mais sentido sem correr o risco de apagar algo por engano.

**Acceptance Criteria:**

**Given** o Modal de Tarefa está aberto em modo edição
**When** Isabel clica em "Excluir tarefa" (link discreto em `ink-secondary`, nunca um botão de destaque)
**Then** o conteúdo do modal é substituído temporariamente pela Confirmação de Exclusão — nunca um segundo modal empilhado
**And** o texto exibido é "Excluir esta tarefa? Essa ação não pode ser desfeita.", com dois botões: "Cancelar" e "Excluir" (`button-destructive`)

**Given** a Confirmação de Exclusão está visível
**When** Isabel clica em "Cancelar"
**Then** a confirmação de exclusão é encerrada e o mesmo modal volta ao modo edição da tarefa, mantendo os valores que estavam sendo exibidos antes da confirmação
**And** a tarefa permanece intacta nos dados persistidos, sem nenhuma alteração

**Given** a Confirmação de Exclusão está visível
**When** Isabel clica em "Excluir" e a escrita em `localStorage` tem sucesso
**Then** a tarefa some imediatamente da visualização do dia e dos dados persistidos
**And** não há desfazer nem lixeira — a remoção é definitiva

**Given** Isabel confirma a exclusão
**When** a escrita em `localStorage` falha
**Then** a Confirmação de Exclusão permanece visível com mensagem de erro inline, com opção de tentar novamente ou cancelar
**And** a tarefa não é removida da visualização até a escrita ter sucesso

## Epic 3: Progresso do Dia

Isabel alterna o Estado de uma tarefa (Pendente → Em andamento → Concluída → Pendente, wraparound) clicando no Indicador de Estado; tarefas concluídas ficam visualmente diferenciadas (opacidade + risco no texto), mas nunca somem da coluna.

**CAPs cobertas:** CAP-4 (controle rápido), CAP-7.
**Requisitos adicionais/UX:** AD-4; UX-DR5, UX-DR7.

### Story 3.1: Alternar Estado pelo Indicador de Estado

Como Isabel,
Eu quero clicar no Indicador de Estado de uma tarefa para alternar seu progresso rapidamente,
Para que eu possa marcar o que comecei e o que terminei sem abrir o formulário completo.

**Acceptance Criteria:**

**Given** uma tarefa está com Estado Pendente
**When** Isabel clica no Indicador de Estado do Card
**Then** o Estado muda para Em andamento, refletido imediatamente na tela, sem abrir o Modal de Tarefa

**Given** uma tarefa está com Estado Em andamento
**When** Isabel clica no Indicador de Estado
**Then** o Estado muda para Concluída

**Given** uma tarefa está com Estado Concluída
**When** Isabel clica no Indicador de Estado
**Then** o Estado volta para Pendente (wraparound Pendente → Em andamento → Concluída → Pendente), sem restrição de transição e sem penalidade

**Given** Isabel clica em qualquer outra área do Card fora do Indicador de Estado
**When** o clique ocorre
**Then** o Modal de Tarefa NÃO abre por esse clique no Indicador — apenas o clique no restante do Card abre o modal (comportamento já coberto pela Story 2.2)

**And** o Indicador de Estado anuncia o nome do estado atual para leitor de tela (não apenas ícone/cor), e tem foco visível quando navegado por teclado

**Given** Isabel aciona o ciclo de Estado
**When** a escrita em `localStorage` falha
**Then** o Estado exibido não muda (sem atualização otimista sem persistência confirmada) — consistente com o guard de persistência atômica (AD-4), sem exigir uma nova tentativa automática e silenciosa

### Story 3.2: Diferenciar visualmente tarefa concluída

Como Isabel,
Eu quero que tarefas concluídas sejam visualmente diferentes das demais,
Para que eu veja meu progresso do dia de relance, sem precisar ler o rótulo de Estado de cada uma.

**Acceptance Criteria:**

**Given** uma tarefa tem Estado Concluída
**When** ela é exibida em sua coluna
**Then** o Card inteiro aplica `completed-opacity` (0.55) e o nome da tarefa é exibido com `text-decoration: line-through`
**And** essa diferenciação é reconhecível sem precisar ler o rótulo de Estado

**Given** uma tarefa está com Estado Concluída
**When** a coluna do dia é renderizada
**Then** a tarefa permanece na mesma posição/coluna — nunca é ocultada, removida ou movida para uma seção separada

**And** essa diferenciação visual se mantém consistente tanto no tema claro quanto no escuro (tokens `DESIGN.md`)

## Epic 4: Reordenar e Mudar por Arraste

Isabel reordena tarefas manualmente dentro do mesmo nível de prioridade arrastando o card, e muda prioridade/dia arrastando entre faixas/colunas — com equivalente completo por teclado (sensor do `@dnd-kit`), nunca dependendo exclusivamente do mouse.

**CAPs cobertas:** CAP-6 (parcial: reordenação manual dentro do nível + mudança de prioridade/dia por arraste).
**Requisitos adicionais/UX:** AD-4, AD-6, AD-7; UX-DR12, UX-DR13.

### Story 4.1: Reordenar tarefas por arraste dentro do mesmo nível de prioridade

Como Isabel,
Eu quero arrastar um card de tarefa para reordená-lo dentro do mesmo nível de prioridade no mesmo dia,
Para que a ordem reflita meu próprio julgamento além da ordenação automática por nível.

**Acceptance Criteria:**

**Given** duas ou mais tarefas do mesmo dia estão no mesmo nível de Prioridade
**When** Isabel arrasta um Card para outra posição dentro desse mesmo grupo (mesmo dia, mesmo nível)
**Then** o Card é reposicionado na nova ordem, e a função pura `reorderWithinGroup` reindexa sequencialmente o `order` dos Cards afetados nesse grupo
**And** a nova ordem persiste entre sessões (sobrevive a fechar/reabrir o navegador)

**Given** Isabel está arrastando um Card
**When** o arraste está em andamento
**Then** o Card arrastado ganha sombra + leve rotação, e um placeholder tracejado marca onde ele vai encaixar no destino

**Given** a reordenação usa `@dnd-kit/react`
**When** Isabel seleciona um Card via teclado (sensor de teclado do `@dnd-kit`, mesma lógica usada pelo mouse — não uma reimplementação paralela) e o move dentro do mesmo grupo
**Then** o resultado é idêntico ao arraste por mouse: mesma reindexação, mesma persistência
**And** o foco permanece visível durante toda a operação

**Given** o drop handler do arraste dispara a reordenação
**When** a ação é executada
**Then** ela chama a mesma `useTaskActions.reorderTask` que qualquer outro caminho chamaria — nenhum `dispatch` cru a partir do handler de drag (AD-4)

**Given** Isabel solta o Card numa nova posição
**When** a escrita em `localStorage` falha
**Then** o Card volta visualmente à posição original — a reordenação não é aplicada até a escrita ter sucesso

### Story 4.2: Mudar prioridade ou dia arrastando o card

Como Isabel,
Eu quero arrastar um card de tarefa para outra faixa de prioridade ou para a coluna de outro dia,
Para que eu ajuste rapidamente prioridade ou dia sem abrir o Modal de Tarefa.

**Acceptance Criteria:**

**Given** uma tarefa está num nível de Prioridade dentro de um dia
**When** Isabel arrasta o Card para outra faixa de Prioridade dentro do mesmo dia
**Then** a Prioridade da tarefa muda para a do destino, e ela é posicionada conforme a ordenação automática por nível (AD-7)
**And** a mudança usa a mesma função de ação (`useTaskActions`) que a edição pelo Modal usaria — nenhuma lógica de mudança de prioridade duplicada

**Given** uma tarefa está na coluna de um dia
**When** Isabel arrasta o Card para a coluna de outro dia
**Then** o Dia da Semana da tarefa muda, e ela entra na nova coluna já ordenada pela sua Prioridade atual (`useTaskActions.moveTaskToDay`)
**And** o Estado da tarefa não é alterado por essa mudança

**Given** o arraste de prioridade/dia usa `@dnd-kit/react`
**When** Isabel realiza a mesma mudança usando o sensor de teclado do `@dnd-kit` em vez do mouse
**Then** o resultado é idêntico ao arraste por mouse — mesma função de ação, mesma persistência, foco visível durante toda a operação
**And** essa é uma via adicional às já existentes (Modal, Story 2.2) — nenhuma delas substitui a outra; toda mudança de Prioridade/Dia possível por arraste também é possível pelo Modal, e vice-versa

**Given** Isabel solta o Card numa nova faixa de prioridade ou coluna de dia
**When** a escrita em `localStorage` falha
**Then** o Card volta visualmente à posição/dia original — a mudança não é aplicada até a escrita ter sucesso


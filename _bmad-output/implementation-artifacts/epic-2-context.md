# Epic 2 Context: Gerenciar Tarefas (criar, editar, excluir)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Isabel precisa conseguir manter a lista de tarefas da semana fiel à realidade: criar uma tarefa vinculada a um dia específico (com prioridade opcional), editar título/dia/prioridade/estado de uma tarefa existente, e excluí-la com uma confirmação explícita que impeça remoção acidental. Este épico entrega o ciclo completo de CRUD de tarefas via Modal de Tarefa, incluindo a ordenação automática das tarefas por nível de prioridade dentro do dia. O Modal também expõe o campo Estado como via alternativa completa de edição — o controle rápido de ciclo por clique no Card (Epic 3) e a reordenação/mudança manual por arraste (Epic 4) não fazem parte deste épico.

## Stories

- Story 2.1: Criar tarefa
- Story 2.2: Editar tarefa existente
- Story 2.3: Excluir tarefa com confirmação

## Requirements & Constraints

- Criar tarefa: Título obrigatório, Dia obrigatório (fixo = coluna de origem no fluxo de criação, não editável), Prioridade opcional sem seleção padrão. Estado inicial sempre "Pendente". Salvar sem título ou dia falha e mantém o modal aberto sinalizando os campos pendentes, sem criar nada.
- Editar tarefa: título, dia, prioridade e estado são editáveis; título e dia continuam obrigatórios para salvar. Mudar o dia move a tarefa para a coluna nova, mantendo a ordenação por prioridade atual, sem alterar o Estado. Alterar apenas título/dia/prioridade não deve ter efeito colateral sobre o Estado.
- Excluir tarefa: exige confirmação explícita em duas etapas antes da remoção definitiva; cancelar mantém a tarefa intacta e sem qualquer alteração. Sem desfazer nem lixeira no MVP — a remoção é definitiva.
- Ordenação automática: dentro de cada dia, tarefas são ordenadas por nível de Prioridade (Alta→Média→Baixa→sem prioridade); reordenação manual dentro do mesmo nível fica fora deste épico (Epic 4).
- Falha ao salvar (criar, editar ou excluir): o modal permanece aberto com mensagem de erro inline, os campos preenchidos são preservados, com opção de tentar novamente ou cancelar — nunca uma nova tentativa automática e silenciosa; nenhuma alteração é aplicada à visualização até a escrita ter sucesso.
- Disciplina de escopo: não introduzir funcionalidades além do que este épico cobre (ex. antecipar o controle rápido de estado do Card, ou a reordenação por arraste) só porque "parece pequeno" — é uma contramétrica de produto explícita do projeto.

## Technical Decisions

- Fluxo de dados: toda mutação passa por funções de ação (`useTaskActions`) que tentam persistir em `localStorage` de forma síncrona (`try/catch`) antes de despachar ao reducer. Sucesso retorna `{ok:true, task}`; falha retorna `{ok:false, error:{message}}` e nunca lança exceção — a UI trata sempre por esse retorno, nunca por `try/catch` ao redor da chamada.
- Estado gerenciado via `useReducer` + `Context` nativo do React (`tasksReducer`/`TaskContext`); sem lib de state management externa.
- Somente `src/storage/` toca `window.localStorage`; componentes e reducers nunca o fazem diretamente.
- Modelo de dados: `Task { id, title, day: DayOfWeek, state: TaskState, priority: Priority, order: number }`. `DayOfWeek` = `'mon'..'sun'` (semana começa segunda). `TaskState` = `'pending' | 'in_progress' | 'done'`. `Priority` = `'high' | 'medium' | 'low'`, ausência representada como `null` (nunca string vazia). IDs via `crypto.randomUUID()`.
- Campo `order` (inteiro) com escopo `(day, priorityGroup)`; a função pura única `reorderWithinGroup` (em `src/state/`) reindexa sequencialmente e é chamada tanto pela criação/edição via Modal quanto pelo drag (Epic 4) — nenhum caminho reimplementa essa lógica separadamente. Tarefa nova recebe `order` = último do seu grupo.
- Persistência: `taskflow:tasks` guarda `{schemaVersion, tasks[]}` via `JSON.stringify`/`JSON.parse`, isolada da chave de tema.
- Componentes/hooks relevantes: `TaskModal` (criação/edição/confirmação de exclusão) → `useTaskActions.createTask` / `updateTask` / `deleteTask` → `storage`. `selectors.sortTasksInDay` aplica a ordenação Alta→Média→Baixa→sem prioridade, depois `order`.

## UX & Interaction Patterns

- Modal de Tarefa é a única sobreposição do produto, com dois modos: criação (Nome obrigatório + Prioridade opcional, Dia fixo não editável) e edição (adiciona Estado com 3 opções e Dia editável com os 7 dias, mais o ponto de entrada "Excluir tarefa"). Retém o foco enquanto aberto; Esc fecha e descarta alterações não salvas, devolvendo o foco ao controle que abriu o modal.
- Campo obrigatório vazio (Nome ou Dia) ao tentar salvar: modal permanece aberto sinalizando os campos pendentes; Prioridade e Estado nunca bloqueiam o salvamento.
- Card de Tarefa: clique em qualquer área exceto o Indicador de Estado abre o Modal em modo edição; é arrastável (comportamento de arraste em si é do Epic 4).
- Tag de Prioridade: cor por nível (Alta/Média/Baixa), barra lateral de 3px ou pílula compacta; ausente por completo (sem placeholder vazio) quando não há prioridade definida.
- Confirmação de Exclusão é um passo interno do próprio Modal (nunca um segundo modal empilhado): substitui temporariamente o conteúdo por "Excluir esta tarefa? Essa ação não pode ser desfeita." com botões "Cancelar" (`ink-secondary`, sem destaque) e "Excluir" (`button-destructive`). "Excluir tarefa" dentro do modal de edição é um link discreto, nunca um botão de destaque.
- Microcopy fixa a usar literalmente: "Adicionar tarefa", "Nenhuma tarefa", "Excluir esta tarefa? Essa ação não pode ser desfeita.", "Excluir tarefa" / "Cancelar". Tom neutro e direto, sem exclamação nem emoji.
- Foco visível (outline) em todo elemento interativo do Modal; rótulos explícitos em vez de apenas ícones (ex. "Excluir tarefa").
- Tokens visuais relevantes: `task-modal` (`surface-raised`, `rounded.lg`, overlay `rgba(0,0,0,0.4)`), `button-primary` (fundo `accent`, texto semibold), `button-destructive` (fundo `priority-high`, texto semibold), `priority-tag` (cores `priority-high`/`-medium`/`-low`, variantes `-dark` sob `:root[data-theme="dark"]`).

## Cross-Story Dependencies

- Depende do Epic 1: estrutura da Visão Semanal (7 colunas) e da persistência em `localStorage` já funcionando, e do controle "+ Adicionar tarefa" no rodapé de cada Coluna do Dia (ponto de entrada da Story 2.1).
- O campo Estado no Modal (Story 2.2) é a via alternativa completa à mudança de estado — o controle rápido por clique no Indicador de Estado do Card é responsabilidade do Epic 3 e não deve ser antecipado aqui.
- A ordenação automática por nível de prioridade (Story 2.1/2.2) prepara o terreno para a reordenação manual dentro do nível e a mudança de prioridade/dia por arraste do Epic 4, que reutilizam a mesma função `reorderWithinGroup` e as mesmas funções de ação (`useTaskActions`) — nenhuma lógica deve ser duplicada entre os dois épicos.
- A diferenciação visual de tarefa concluída (opacidade + risco no texto) é tratada no Epic 3; este épico só precisa garantir que o campo Estado seja editável e persistido corretamente pelo Modal.

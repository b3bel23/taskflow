---
name: TaskFlow
status: final
sources:
  - "{planning_artifacts}/prds/prd-teste bmad-2026-09-09/prd.md"
  - "{planning_artifacts}/briefs/brief-teste bmad-2026-09-09/brief.md"
updated: 2026-09-10
---

# TaskFlow — Experience Spine

> Superfície única, web desktop. Usuária única (Isabel), sem login. Paired with `DESIGN.md` (paleta "Neutro Calmo"). Demonstra: resolução de uma premissa do PRD via decisão de UX (mudança de Estado), uma decisão delegada explicitamente pelo PRD à UX (ordem dentro da prioridade, resolvida como drag-and-drop), e Inspiration & Anti-patterns como disciplina de escopo (contrapondo a contramétrica SM-C1 do PRD).

## Foundation

Superfície única em navegador desktop — sem app nativo, sem versão mobile, sem responsividade no MVP (não-objetivo explícito do PRD §6/§7.2). Nenhum UI system herdado: componentes próprios, simples, definidos em `DESIGN.md`. Sem autenticação — todas as Tarefas pertencem implicitamente à única usuária da instalação. `DESIGN.md` é a referência de identidade visual; esta spine é a experiência.

Tema claro e escuro, ambos suportados desde o MVP, com alternância manual (não segue o SO) e preferência persistida entre sessões.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Visão Semanal | Abertura do app (única entrada) | Ver os 7 dias e as Tarefas de cada um simultaneamente; localizar "hoje"; ponto de partida de toda ação |
| Modal de Tarefa — criação | "+ Adicionar tarefa" numa Coluna do Dia | Criar uma Tarefa já vinculada àquele dia |
| Modal de Tarefa — edição | Clique num Card de Tarefa existente | Editar Nome/Prioridade/Estado/Dia; ponto de entrada para exclusão |
| Confirmação de Exclusão | "Excluir tarefa" dentro do modal de edição | Confirmar remoção definitiva antes de apagar |

Sem menu, sem abas, sem navegação: a Visão Semanal é o aplicativo inteiro. O Modal de Tarefa é a única sobreposição, empilha no máximo um nível — a Confirmação de Exclusão é um passo dentro do mesmo modal, não um segundo modal por cima do primeiro.

→ Composition reference: `mockups/key-weekly-view.html` (Visão Semanal, claro/escuro/arraste), `mockups/key-task-modal.html` (criação/edição/exclusão). Spine wins on conflict.

## Voice and Tone

Microcopy. Voz de marca e postura estética vivem em `DESIGN.md.Brand & Style`. Tom decidido: neutro e direto, sem gracinha, sem exclamação.

| Do | Don't |
|---|---|
| "Adicionar tarefa" | "Vamos lá, adicione sua primeira tarefa!" |
| "Nenhuma tarefa" | "Nada por aqui ainda ✨" |
| "Excluir esta tarefa? Essa ação não pode ser desfeita." | "Tem certeza mesmo? 😳" |
| "Excluir tarefa" / "Cancelar" | "Sim, apagar!" / "Não, deixa" |
| Frases curtas e completas, sem emoji | Pontos de exclamação, emojis, incentivo/gamificação |

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Coluna do Dia | Visão Semanal | Sempre as 7 visíveis ao mesmo tempo, ordem fixa Segunda→Domingo. Tarefas ordenadas automaticamente por Prioridade (Alta→Média→Baixa→sem prioridade — FR-6); dentro do mesmo nível, ordem manual via arraste. Controle "+ Adicionar tarefa" sempre visível no rodapé, mesmo com a coluna cheia. |
| Card de Tarefa | Coluna do Dia | Clique em qualquer área do Card exceto o Indicador de Estado → abre Modal de Tarefa em modo edição. É arrastável (ver Interaction Primitives). |
| Indicador de Estado | Card de Tarefa | Clique único cicla Pendente → Em andamento → Concluída → volta a Pendente (wraparound). Não abre o modal. Mudança refletida imediatamente na tela (FR-4). |
| Tag de Prioridade | Card de Tarefa | Mostra o nível quando definido; some completamente quando a Tarefa não tem prioridade (FR-6) — nunca um espaço reservado vazio. |
| Modal de Tarefa | Criação e edição | Modo criação: campos Nome (obrigatório) e Prioridade (opcional, nenhuma selecionada por padrão); Dia fixo = coluna de origem, não editável nesse fluxo. Modo edição: adiciona Estado (3 opções) e Dia (editável, com os 7 dias); inclui o ponto de entrada "Excluir tarefa". Nome e Dia continuam obrigatórios para salvar em ambos os modos (FR-1, FR-2). |
| Confirmação de Exclusão | Dentro do Modal de Tarefa (edição) | Pede confirmação explícita antes de remover (FR-3). Cancelar mantém a Tarefa intacta, sem nenhuma alteração. |
| Alternador de Tema | Cabeçalho | Alterna claro/escuro instantaneamente, sem recarregar a página; preferência salva e usada em toda sessão futura. Cabeçalho em si não tem outro comportamento — é chrome estático que só hospeda este controle e o título. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Dia sem Tarefas | Coluna do Dia | Texto discreto "Nenhuma tarefa" (`ink-secondary`) + controle "+ Adicionar tarefa" visível — nunca parece erro de carregamento (FR-5). |
| Tarefa Concluída | Card de Tarefa | Nome riscado + opacidade reduzida do Card inteiro (`{components.task-card.completed-opacity}` em `DESIGN.md`). Continua na posição da coluna, nunca ocultada ou removida (FR-7). |
| Tarefa sem prioridade | Card de Tarefa | Nenhuma Tag de Prioridade exibida. Ordenada por último dentro da coluna (depois de Baixa). |
| Arrastando | Card de Tarefa | Card levanta (sombra + leve rotação — único uso de sombra decorativa do produto); placeholder tracejado marca onde vai encaixar no destino. |
| Carregamento inicial | Visão Semanal | As 7 colunas e suas Tarefas aparecem já preenchidas na abertura — sem estado de carregamento visível esperado, dado que os dados são locais à instalação. [NOTE FOR ARCHITECTURE] se o mecanismo de persistência escolhido introduzir latência perceptível, definir um estado de carregamento breve não coberto aqui. |
| Tema | Global | Segue a preferência salva da usuária; nunca a preferência do sistema operacional. |
| Campo obrigatório vazio | Modal de Tarefa (criação/edição) | Tentar salvar com Nome ou Dia vazio não fecha o modal: mantém aberto e sinaliza os campos pendentes (FR-1, FR-2). Prioridade e Estado nunca bloqueiam o salvamento — são sempre opcionais/já definidos. |
| Falha ao salvar | Modal de Tarefa (criação/edição/exclusão) | [NOTE FOR ARCHITECTURE] Comportamento não definido — depende do mecanismo de persistência, ainda em aberto (PRD §5, Open Question 5). Decidir junto: modal com erro (recomendado) vs. nova tentativa silenciosa. |

## Interaction Primitives

- Clique no Indicador de Estado do Card → cicla o Estado (Pendente → Em andamento → Concluída → Pendente).
- Clique no restante do Card → abre o Modal de Tarefa em modo edição.
- Clique em "+ Adicionar tarefa" → abre o Modal de Tarefa em modo criação, Dia pré-definido pela coluna de origem.
- Arrastar um Card para outra faixa de Prioridade dentro do mesmo dia → muda a Prioridade da Tarefa (posição = prioridade).
- Arrastar um Card para a coluna de outro dia → muda o Dia da Semana da Tarefa; ela entra na nova coluna já ordenada pela sua Prioridade atual.
- O Modal de Tarefa é sempre uma via alternativa completa ao arraste — toda mudança de Prioridade ou Dia possível por arraste também é possível editando os campos do modal (necessário para teclado/acessibilidade, não apenas conveniência).
- Esc fecha o Modal de Tarefa (descarta alterações não salvas — formulário curto, de baixo risco; sem confirmação adicional).
- Excluir é sempre uma ação em duas etapas: "Excluir tarefa" no modal → Confirmação de Exclusão → remoção definitiva. Nunca exclusão direta de um clique.
- Animação mínima: transições curtas (~150–200ms) só onde esclarecem uma mudança (Card se reposicionando ao arrastar, abrir/fechar do modal). Sem animação decorativa.
- **Banido:** arraste como única forma de mudar Prioridade ou Dia (o modal precisa sempre funcionar); mais de um modal empilhado; qualquer navegação entre "páginas" para operações de CRUD da Tarefa.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md`.

- Foco visível (outline) em todo elemento interativo: Cards, Indicador de Estado, controles do Modal, Alternador de Tema.
- Modal de Tarefa retém o foco enquanto aberto; Esc fecha; foco retorna ao controle que abriu o modal.
- Toda ação alcançável por teclado, incluindo as que o arraste executa: ciclar Estado, mudar Prioridade, mudar Dia, salvar, excluir — nenhuma delas depende exclusivamente de drag-and-drop com mouse.
- Indicador de Estado anuncia o nome do estado atual para leitor de tela (não apenas o ícone/cor). Tag de Prioridade anuncia o nível por nome. Botão "Excluir tarefa" tem rótulo explícito, nunca só um ícone.
- **Limitação conhecida e aceita** — a Prioridade é sinalizada só por cor, sem ícone/letra de apoio — decisão consciente para um produto pessoal de usuária única, sem necessidade de suporte a daltonismo identificada até hoje. Registrado aqui para não ser esquecido silenciosamente se o público do produto mudar.

## Inspiration & Anti-patterns

- **Herdado de Todoist/Notion:** simplicidade de lista de tarefas focada em conteúdo, sem ruído visual.
- **Herdado de Kanban:** layout em colunas como unidade organizadora, arraste como gesto principal de reorganização.
- **Rejeitado — aparência corporativa/carregada de ferramenta de produtividade de equipe:** sem barras de ferramentas, sem tabelas densas, sem dashboards.
- **Rejeitado — múltiplas telas/menus:** tudo do MVP acontece na Visão Semanal + um modal; sem tela de configurações, sem navegação lateral.
- **Rejeitado, restatado do PRD (Non-Goals §6) como disciplina de design, não só de produto:** notificações/lembretes, tags/projetos/subtarefas, colaboração, IA, dashboard de relatórios — nenhum deles entra "só mais essa, é pequeno" (contrapõe SM-C1 do PRD).

## Responsive & Platform

Sem breakpoints responsivos nem layout mobile no MVP (ver `Foundation`) — adiado para v2, condicionado a login (Visão do brief, §7.2 do PRD). [NOTE FOR ARCHITECTURE/DEV] o PRD não define uma largura mínima de janela; esta spine assume uma janela desktop "razoável" para caber 7 colunas confortavelmente, mas o comportamento abaixo desse limiar (scroll horizontal? colunas mais estreitas?) não está especificado — decisão pendente na arquitetura/implementação, não bloqueia esta spine.

## Key Flows

### Flow 1 — Isabel planeja a semana (Isabel, domingo à noite)

1. Isabel abre o TaskFlow; a Visão Semanal mostra os 7 dias, a maioria ainda vazia.
2. Para cada Tarefa que já sabe que vai ter na semana, clica em "+ Adicionar tarefa" na Coluna do Dia certa.
3. No Modal de Tarefa, digita o nome; define Prioridade só nas que já sabe que importam mais — deixa as demais sem prioridade.
4. Confirma; o Card aparece imediatamente na coluna, já na posição correta pela ordenação de Prioridade.
5. Repete para as demais Tarefas, espalhadas pelos diferentes dias.
6. **Climax:** a tela inteira mostra a semana inteira já organizada — sete colunas, Tarefas ordenadas por prioridade — antes de qualquer dia começar.

Falha: tentar confirmar sem Nome preenchido mantém o Modal de Tarefa aberto, sinalizando o campo pendente — nada é criado até Nome e Dia estarem presentes (FR-1).

Realiza UJ-1 (FR-1, FR-5).

### Flow 2 — Isabel decide por onde começar o dia (Isabel, terça de manhã)

1. Isabel abre o TaskFlow. A Coluna do Dia de terça está destacada como "hoje".
2. As Tarefas do dia já aparecem ordenadas: Alta no topo, depois Média, Baixa, sem prioridade.
3. Ela clica no Indicador de Estado da primeira Tarefa Alta: ○ → ◐ ("Em andamento").
4. Ao longo do dia, repete esse clique em outras Tarefas conforme começa e termina cada uma: ◐ → ✓.
5. **Climax:** ao fim do dia, boa parte dos Cards da coluna de hoje está riscada e apagada — o progresso do dia visível de relance, sem abrir nada.

Sem estado de falha real aqui: qualquer transição de Estado é permitida a qualquer momento e em qualquer ordem (FR-4) — se Isabel marcar "Concluída" por engano, um clique a mais no Indicador de Estado volta a "Pendente" sem penalidade.

Realiza UJ-2 (FR-4, FR-5, FR-6, FR-7).

### Flow 3 — Isabel ajusta uma tarefa no meio da semana (Isabel, quarta à tarde)

1. Uma Tarefa de quinta ficou urgente. Isabel arrasta o Card para a faixa "Alta" dentro da própria Coluna de quinta.
2. O Card muda de posição e ganha a Tag de Prioridade Alta — sem abrir nenhum formulário.
3. Outra Tarefa deixou de fazer sentido. Isabel clica no Card, o Modal de Tarefa abre em modo edição; clica em "Excluir tarefa".
4. A Confirmação de Exclusão aparece: "Excluir esta tarefa? Essa ação não pode ser desfeita." Ela confirma.
5. **Climax:** a Tarefa some da coluna instantaneamente — a semana volta a refletir a realidade, sem reconstruir nada do zero.

Falha/alternativa: cancelar a Confirmação de Exclusão mantém a Tarefa intacta, sem nenhuma alteração (FR-3). Arrastar uma Tarefa para o dia ou faixa de prioridade errados por engano se corrige do mesmo jeito — arrastando de volta, ou pelo Modal de Tarefa.

Realiza UJ-3 (FR-2, FR-3).

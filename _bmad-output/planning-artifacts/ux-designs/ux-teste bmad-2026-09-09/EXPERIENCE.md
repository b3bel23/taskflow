---
name: TaskFlow
status: final
sources:
  - "{planning_artifacts}/prds/prd-teste bmad-2026-09-09/prd.md"
  - "{planning_artifacts}/briefs/brief-teste bmad-2026-09-09/brief.md"
updated: 2026-09-18
changelog:
  - "2026-09-18: janela dinâmica ancorada em hoje (substitui semana fixa), ordenação por horário (substitui ordenação por prioridade), Tag de Prioridade sempre visível com clique-ciclo. Ver sprint-change-proposal-2026-09-18.md. Mockups em mockups/ ainda refletem o desenho anterior — pendente de regeneração."
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
| Coluna do Dia | Visão Semanal | Sempre as 7 visíveis ao mesmo tempo, ordem dinâmica **hoje → hoje+6** (nunca uma semana de calendário fixa) — avança sozinha quando o dia vira, mesmo com o app aberto. Cada coluna rotulada com o nome do dia da semana + a Data real. Tarefas ordenadas automaticamente por **Horário** (sem Horário primeiro, depois ordem crescente — FR-6); sem reordenação manual dentro do dia. Controle "+ Adicionar tarefa" sempre visível no rodapé, mesmo com a coluna cheia. |
| Card de Tarefa | Coluna do Dia | Clique em qualquer área do Card exceto o Indicador de Estado e a Tag de Prioridade → abre Modal de Tarefa em modo edição. Mostra o rótulo de Horário quando definido. É arrastável só para outra coluna de dia (ver Interaction Primitives) — arrastar nunca muda Horário nem Prioridade. |
| Indicador de Estado | Card de Tarefa | Clique único cicla Pendente → Em andamento → Concluída → volta a Pendente (wraparound). Não abre o modal. Mudança refletida imediatamente na tela (FR-4). |
| Tag de Prioridade | Card de Tarefa | **Sempre visível**, inclusive sem Prioridade definida (estado neutro/discreto) — deixa de ser "ausente por completo" (regra revogada em 2026-09-18). Clique único cicla Sem prioridade → Baixa → Média → Alta → Sem prioridade; não abre o modal nem altera o Estado (FR-8). |
| Modal de Tarefa | Criação e edição | Modo criação: campos Nome (obrigatório), Horário (opcional) e Prioridade (opcional, nenhuma selecionada por padrão); Dia fixo = coluna de origem, não editável nesse fluxo. Modo edição: adiciona Estado (3 opções) e Dia (editável, com os 7 dias da janela atual); inclui o ponto de entrada "Excluir tarefa". Nome e Dia continuam obrigatórios para salvar em ambos os modos (FR-1, FR-2). |
| Confirmação de Exclusão | Dentro do Modal de Tarefa (edição) | Pede confirmação explícita antes de remover (FR-3). Cancelar mantém a Tarefa intacta, sem nenhuma alteração. |
| Alternador de Tema | Cabeçalho | Alterna claro/escuro instantaneamente, sem recarregar a página; preferência salva e usada em toda sessão futura. Cabeçalho em si não tem outro comportamento — é chrome estático que só hospeda este controle e o título. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Dia sem Tarefas | Coluna do Dia | Texto discreto "Nenhuma tarefa" (`ink-secondary`) + controle "+ Adicionar tarefa" visível — nunca parece erro de carregamento (FR-5). |
| Tarefa Concluída | Card de Tarefa | Nome riscado + opacidade reduzida do Card inteiro (`{components.task-card.completed-opacity}` em `DESIGN.md`). Continua na posição da coluna, nunca ocultada ou removida **enquanto sua Data estiver na janela de 7 dias visível** (FR-7) — ao sair da janela, some da tela (dados preservados, sem tela de Histórico no MVP). |
| Tarefa sem prioridade | Card de Tarefa | Tag de Prioridade em estado neutro/discreto, sempre visível (clicável — FR-8). Não afeta a posição da Tarefa na coluna (ordenação é por Horário, não por Prioridade). |
| Tarefa sem Horário | Card de Tarefa | Nenhum rótulo de horário exibido. Ordenada **antes** de todas as Tarefas com Horário dentro da mesma coluna — tratada como compromisso flexível/"dia inteiro". |
| Arrastando | Card de Tarefa | Card levanta (sombra + leve rotação — único uso de sombra decorativa do produto); placeholder tracejado marca a coluna de dia onde vai encaixar. Preserva Horário e Prioridade — arraste só muda a Data. |
| Janela avançando | Visão Semanal | Quando o dia vira com o app aberto, a janela de 7 dias e os rótulos de Data/dia-da-semana de cada coluna se atualizam automaticamente, sem recarregar a página (checagem periódica em segundo plano). |
| Rollover | Coluna do Dia (Hoje) | Tarefas não concluídas cuja Data ficou para trás aparecem automaticamente na coluna de Hoje, preservando Horário/Prioridade/Estado — sem nenhuma ação de Isabel, sem indicação visual especial de "foi movida" (comportamento silencioso e transparente, FR-9). |
| Carregamento inicial | Visão Semanal | As 7 colunas e suas Tarefas aparecem já preenchidas na abertura — sem estado de carregamento visível esperado, dado que os dados são locais à instalação. [NOTE FOR ARCHITECTURE] se o mecanismo de persistência escolhido introduzir latência perceptível, definir um estado de carregamento breve não coberto aqui. |
| Tema | Global | Segue a preferência salva da usuária; nunca a preferência do sistema operacional. |
| Campo obrigatório vazio | Modal de Tarefa (criação/edição) | Tentar salvar com Nome ou Dia vazio não fecha o modal: mantém aberto e sinaliza os campos pendentes (FR-1, FR-2). Horário, Prioridade e Estado nunca bloqueiam o salvamento — são sempre opcionais/já definidos. |
| Falha ao salvar | Modal de Tarefa (criação/edição/exclusão) | Modal permanece aberto com mensagem de erro inline, campos preservados, opção de tentar novamente ou cancelar — nunca retry silencioso (AD-4). |

## Interaction Primitives

- Clique no Indicador de Estado do Card → cicla o Estado (Pendente → Em andamento → Concluída → Pendente).
- Clique na Tag de Prioridade do Card → cicla a Prioridade (Sem prioridade → Baixa → Média → Alta → Sem prioridade); não abre o modal, não altera o Estado (FR-8, mesmo padrão do Indicador de Estado).
- Clique no restante do Card (fora do Indicador de Estado e da Tag de Prioridade) → abre o Modal de Tarefa em modo edição.
- Clique em "+ Adicionar tarefa" → abre o Modal de Tarefa em modo criação, Data pré-definida pela coluna de origem.
- Arrastar um Card para a coluna de outro dia → muda a Data da Tarefa; ela entra na nova coluna já ordenada pelo seu Horário atual. Horário e Prioridade da Tarefa **não mudam** por este gesto — só a Data. Para mudar Horário ou Prioridade, editar pelo Modal ou (Prioridade) clicar na Tag.
- O Modal de Tarefa é sempre uma via alternativa completa ao arraste — toda mudança de Data possível por arraste também é possível editando os campos do modal (necessário para teclado/acessibilidade, não apenas conveniência).
- Esc fecha o Modal de Tarefa (descarta alterações não salvas — formulário curto, de baixo risco; sem confirmação adicional).
- Excluir é sempre uma ação em duas etapas: "Excluir tarefa" no modal → Confirmação de Exclusão → remoção definitiva. Nunca exclusão direta de um clique.
- Animação mínima: transições curtas (~150–200ms) só onde esclarecem uma mudança (Card se reposicionando ao arrastar, abrir/fechar do modal). Sem animação decorativa.
- **Banido:** arraste como única forma de mudar Data (o modal precisa sempre funcionar); arraste como forma de mudar Prioridade ou Horário (esses só mudam por clique na Tag ou pelo Modal — nunca por arraste); mais de um modal empilhado; qualquer navegação entre "páginas" para operações de CRUD da Tarefa; reordenação manual dentro do dia (a ordem é sempre derivada do Horário).

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md`.

- Foco visível (outline) em todo elemento interativo: Cards, Indicador de Estado, controles do Modal, Alternador de Tema.
- Modal de Tarefa retém o foco enquanto aberto; Esc fecha; foco retorna ao controle que abriu o modal.
- Toda ação alcançável por teclado, incluindo as que o arraste executa (mudar Data), além de ciclar Estado e ciclar Prioridade — nenhuma delas depende exclusivamente de drag-and-drop ou clique de mouse.
- Indicador de Estado anuncia o nome do estado atual para leitor de tela (não apenas o ícone/cor). Tag de Prioridade anuncia o nível por nome, inclusive "Sem prioridade" quando não definida, e anuncia que é acionável para ciclar (mesmo padrão do Indicador de Estado). Botão "Excluir tarefa" tem rótulo explícito, nunca só um ícone.
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

### Flow 1 — Isabel planeja a semana (Isabel, qualquer dia — a janela já começa em hoje)

1. Isabel abre o TaskFlow; a janela mostra hoje + os 6 dias seguintes, a maioria ainda vazia.
2. Para cada Tarefa que já sabe que vai ter, clica em "+ Adicionar tarefa" na Coluna do Dia certa.
3. No Modal de Tarefa, digita o nome; define Horário só nas que já têm hora marcada, e Prioridade só nas que já sabe que importam mais — deixa as demais sem horário/sem prioridade.
4. Confirma; o Card aparece imediatamente na coluna, já na posição correta pela ordenação cronológica de Horário (sem horário primeiro).
5. Repete para as demais Tarefas, espalhadas pelos diferentes dias da janela.
6. **Climax:** a tela inteira mostra os 7 dias já organizados — Tarefas em ordem cronológica dentro de cada um — antes de qualquer dia começar.

Falha: tentar confirmar sem Nome preenchido mantém o Modal de Tarefa aberto, sinalizando o campo pendente — nada é criado até Nome e Data estarem presentes (FR-1).

Realiza UJ-1 (FR-1, FR-5).

### Flow 2 — Isabel decide por onde começar o dia (Isabel, qualquer manhã)

1. Isabel abre o TaskFlow. A primeira coluna da janela é sempre hoje, destacada como "hoje".
2. As Tarefas do dia já aparecem em ordem cronológica: as sem Horário primeiro, depois as com Horário crescente (`08:00`, `10:30`, `14:00`...).
3. Ela clica no Indicador de Estado da primeira Tarefa: ○ → ◐ ("Em andamento").
4. Ao longo do dia, repete esse clique em outras Tarefas conforme começa e termina cada uma: ◐ → ✓.
5. Uma Tarefa ficou mais urgente — ela clica direto na Tag de Prioridade do card, ciclando até "Alta", sem abrir nada.
6. **Climax:** ao fim do dia, boa parte dos Cards da coluna de hoje está riscada e apagada — o progresso do dia visível de relance, na ordem em que as coisas realmente aconteceram.

Sem estado de falha real aqui: qualquer transição de Estado é permitida a qualquer momento e em qualquer ordem (FR-4), e o ciclo de Prioridade também não tem penalidade (FR-8) — um clique a mais sempre volta.

Realiza UJ-2 (FR-4, FR-5, FR-6, FR-7, FR-8).

### Flow 3 — Isabel ajusta uma tarefa no meio da semana (Isabel, qualquer tarde)

1. Uma Tarefa mudou de horário. Isabel clica no Card (fora do Indicador de Estado e da Tag de Prioridade), o Modal de Tarefa abre em modo edição; ajusta o Horário e confirma.
2. Outra Tarefa precisa ir para amanhã. Isabel arrasta o Card para a coluna do dia seguinte — Horário e Prioridade continuam os mesmos, só a Data muda.
3. Outra Tarefa deixou de fazer sentido. Isabel clica no Card, o Modal de Tarefa abre em modo edição; clica em "Excluir tarefa".
4. A Confirmação de Exclusão aparece: "Excluir esta tarefa? Essa ação não pode ser desfeita." Ela confirma.
5. **Climax:** a Tarefa some da coluna instantaneamente — a semana volta a refletir a realidade, sem reconstruir nada do zero.

Falha/alternativa: cancelar a Confirmação de Exclusão mantém a Tarefa intacta, sem nenhuma alteração (FR-3). Arrastar uma Tarefa para o dia errado por engano se corrige do mesmo jeito — arrastando de volta, ou pelo Modal de Tarefa.

Realiza UJ-3 (FR-2, FR-3, FR-8).

### Flow 4 — Isabel reabre depois de alguns dias sem usar (Isabel, qualquer manhã, depois de um tempo fora)

1. Isabel não abre o TaskFlow há alguns dias. Ao abrir, a janela já está reancorada em hoje — não mostra mais os dias antigos.
2. As Tarefas não concluídas que ficaram para trás em dias que já passaram aparecem automaticamente na coluna de hoje, com Título/Horário/Prioridade/Estado preservados — nenhuma tarefa perdida, nenhuma duplicada.
3. Tarefas que ela já tinha concluído naqueles dias passados simplesmente não aparecem mais em lugar nenhum da tela (permanecem salvas, sem superfície de Histórico no MVP).
4. **Climax:** Isabel retoma exatamente de onde parou, sem precisar caçar tarefas perdidas em dias que já passaram.

Sem estado de falha: o rollover é automático e silencioso, sem exigir nenhuma ação de Isabel (FR-9).

Realiza UJ-4 (FR-9).

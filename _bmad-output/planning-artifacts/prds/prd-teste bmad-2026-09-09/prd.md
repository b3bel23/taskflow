---
title: TaskFlow
status: final
created: 2026-09-09
updated: 2026-09-21
changelog:
  - "2026-09-18: pivô pós-MVP para semana dinâmica ancorada em hoje, ordenação por horário e prioridade como atributo visual. Ver _bmad-output/planning-artifacts/sprint-change-proposal-2026-09-18.md."
  - "2026-09-21: reconciliação com o produto entregue — layout responsivo (§5 Plataforma e §7.2), sem alterar nenhum requisito funcional. A decisão original (só desktop) foi alterada depois da implementação, a pedido da Isabel; o texto anterior foi mantido riscado. Ver REQUIREMENTS.md §6."
---

# PRD: TaskFlow
*Título provisório — confirmar.*

## 0. Document Purpose

Este PRD traduz o Product Brief do TaskFlow (`_bmad-output/planning-artifacts/briefs/brief-teste bmad-2026-09-09/brief.md`) em requisitos funcionais testáveis, prontos para orientar UX e arquitetura. É lido principalmente por Isabel, atuando como PM, UX/arquiteta e desenvolvedora do próprio projeto — o documento serve tanto de especificação quanto de registro de decisões do processo BMAD/Spec-Driven Development. Estrutura: vocabulário fixado no Glossário (§3), funcionalidades agrupadas, com Requisitos Funcionais (FRs) numerados globalmente (§4), e pontos ainda em aberto sinalizados explicitamente (§9-10) em vez de deixados implícitos.

## 1. Vision

O TaskFlow é um organizador semanal de tarefas pessoais, com experiência próxima de uma agenda/calendário. A tela principal mostra sete dias lado a lado, sempre ancorados a partir de hoje — hoje + os 6 dias seguintes, avançando automaticamente conforme os dias passam. Toda tarefa nasce vinculada a uma data específica, com um estado de progresso (Pendente / Em andamento / Concluída), opcionalmente um horário (para ordenação cronológica dentro do dia) e opcionalmente uma prioridade (Baixa / Média / Alta) — que é apenas um atributo visual, sem efeito na ordem de exibição. A organização por data não é a única forma cogitada — foi um pivô deliberado a partir de uma ideia inicial mais genérica de gerenciador de tarefas; ver racional completo em `addendum.md` do Product Brief, seção "Evolução do escopo durante a descoberta". Um segundo pivô, pós-MVP, trocou a semana fixa Segunda→Domingo por uma janela dinâmica ancorada em hoje e a ordenação por prioridade pela ordenação por horário — ver `sprint-change-proposal-2026-09-18.md`.

Ele existe para resolver um problema concreto e vivido: hoje as tarefas de estudo, trabalho e vida pessoal de Isabel estão espalhadas entre anotações soltas, mensagens para si mesma no WhatsApp e aplicativos genéricos — o que gera esquecimentos, prazos perdidos e a sensação de não saber por onde começar o dia. O TaskFlow centraliza tudo isso em uma única visão semanal, sem fricção de configuração e sem recursos que não foram pedidos.

O TaskFlow não compete com Todoist, Trello ou Notion. Seu recorte é deliberado: uma pessoa, uma semana, o essencial para criar, editar, excluir e acompanhar o estado de cada tarefa. É também o veículo de um segundo objetivo igualmente real: percorrer o BMAD Method e o Spec-Driven Development de ponta a ponta, do problema ao código, com o mesmo rigor que se aplicaria a um produto real.

## 2. Target User

### 2.1 Jobs To Be Done

- Quando tenho tarefas de estudo, trabalho e vida pessoal acontecendo na mesma semana, quero um único lugar para colocá-las, para não depender de anotações soltas ou mensagens para mim mesma.
- Quando começo um dia, quero ver rapidamente o que está pendente, em andamento e concluído naquele dia, para saber por onde começar sem esforço mental extra.
- Quando uma tarefa muda de prioridade ou de dia ao longo da semana, quero atualizá-la em segundos, para que o TaskFlow continue refletindo a realidade e não vire mais uma lista desatualizada.
- Quando fecho e reabro o navegador, quero que minhas tarefas continuem lá, para não perder o que já organizei.

Não há personas secundárias no MVP: o público é a própria Isabel, que também define e valida o produto — não há necessidade de generalizar para outros perfis não validados.

*(2.2 Non-Users omitido de propósito: a fronteira de público já é óbvia — usuária única, ver JTBD acima.)*

### 2.3 Key User Journeys

- **UJ-1. Isabel planeja a semana antes de começar.**
  Domingo à noite ou segunda de manhã, Isabel abre o TaskFlow e vê a semana à frente. Ela vai lançando as tarefas de estudo, trabalho e vida pessoal em cada dia, definindo prioridade em algumas (nem todas — só as que já sabe que importam mais). Ao final, tem a semana inteira visível de uma vez, antes de qualquer dia começar. Realiza FR-1, FR-5.

- **UJ-2. Isabel decide por onde começar o dia.**
  Ao abrir o TaskFlow em qualquer dia, Isabel olha o dia atual e vê o que está pendente, o que já está em andamento e o que foi concluído, com as tarefas ordenadas cronologicamente pelo horário (as sem horário definido aparecem primeiro, como compromissos flexíveis do dia). Ela decide por onde começar, marca uma tarefa como "Em andamento" quando parte para ela, e como "Concluída" quando termina — vendo, ao longo do dia, o progresso se acumular. Realiza FR-4, FR-5, FR-6, FR-7.

- **UJ-3. Isabel ajusta uma tarefa no meio da semana.**
  Uma tarefa muda: o horário muda, a prioridade sobe porque ficou urgente, o prazo muda de dia, ou a tarefa deixou de fazer sentido. Isabel edita a tarefa (inclusive movendo-a para outro dia, ou arrastando o card para outra coluna) ou a exclui — com uma confirmação antes de apagar de vez, já que não há desfazer no MVP. Prioridade também pode ser ajustada rapidamente clicando na própria Tag de Prioridade do card, em ciclo, sem abrir o Modal. O TaskFlow volta a refletir a realidade da semana. Realiza FR-2, FR-3.

- **UJ-4. Isabel reabre o TaskFlow depois de alguns dias sem usar.**
  Isabel não abriu o TaskFlow há alguns dias. Ao reabrir, a janela de 7 dias já está reancorada em hoje, e toda tarefa não concluída que ficou para trás em dias que já passaram aparece automaticamente em hoje, com seus dados e estado preservados — ela não perde nem precisa procurar nada. Realiza FR-9.

## 3. Glossário

- **Tarefa** — unidade central do TaskFlow. Pertence a exatamente uma Data, tem um Estado, opcionalmente um Horário, e opcionalmente uma Prioridade.
- **Semana / Janela** — unidade de organização da tela principal: uma janela de 7 dias, sempre iniciando em Hoje e avançando automaticamente conforme os dias passam (hoje + próximos 6 dias). **Não é mais uma semana fixa Segunda→Domingo** — essa era uma assumption do PRD original, revogada em 2026-09-18 (ver `sprint-change-proposal-2026-09-18.md`).
- **Data** — dia real do calendário (ex. `2026-09-23`) ao qual uma Tarefa pertence. Substitui o antigo conceito de "Dia da Semana" abstrato (`mon`..`sun`). Uma Tarefa pode ser movida de uma Data para outra por edição ou por arraste do card para outra coluna.
- **Horário** — momento do dia (ex. `08:00`) opcionalmente atribuído a uma Tarefa. Determina a ordenação cronológica das Tarefas dentro de uma Data (ver FR-6). Tarefas sem Horário aparecem primeiro na Data, como compromissos flexíveis do dia.
- **Estado** — progresso de uma Tarefa. Valores possíveis: Pendente (padrão ao criar), Em andamento, Concluída. Os 3 estados (em vez de apenas Pendente/Concluída) foram uma escolha deliberada — ver racional em `addendum.md` do Product Brief, seção "Alternativas consideradas e descartadas".
- **Prioridade** — atributo visual (não ordena mais as Tarefas — ver FR-6) de importância de uma Tarefa. Valores possíveis: Baixa, Média, Alta, ou sem prioridade definida (padrão ao criar, se não escolhida explicitamente). Não é um sistema de pontuação — apenas 3 níveis + ausência. Editável no Modal, ou em ciclo por clique direto na Tag de Prioridade do card (FR-8).
- **Rollover** — migração automática da Data de uma Tarefa não concluída cuja Data original já saiu da Janela (ficou no passado) para Hoje, preservando título, Horário, Prioridade e Estado, sem duplicar a Tarefa (FR-9).

## 4. Features

### 4.1 Gestão de Tarefas
**Descrição:** Criação, edição e exclusão de Tarefas. É a base de tudo — sem isso não há o que visualizar ou acompanhar. Realiza UJ-1, UJ-3.

**Requisitos Funcionais:**

#### FR-1: Criar tarefa
Isabel pode criar uma Tarefa vinculada a uma Data específica. Realiza UJ-1.

**Consequências (testáveis):**
- A Tarefa exige um Título e uma Data; ambos são obrigatórios para salvar.
- O Horário é opcional na criação; se não escolhido, a Tarefa fica sem Horário definido.
- A Prioridade é opcional na criação; se não escolhida, a Tarefa fica sem prioridade definida (não há valor padrão atribuído automaticamente).
- O Estado da Tarefa criada é sempre Pendente.
- A Tarefa criada aparece imediatamente na Data correspondente, na posição correta segundo a ordenação cronológica por Horário (ver FR-6).
- [ASSUMPTION: não há limite máximo de Tarefas por dia no MVP.]

**Notas:**
- *[NOTE FOR PM]* O Product Brief original descrevia toda tarefa como criada "com uma prioridade" (Sumário Executivo, Escopo). Durante a elicitação deste PRD, a usuária esclareceu que a Prioridade é opcional na criação — este PRD reflete a versão mais recente e confirmada, que substitui essa leitura do brief.
- O mecanismo de Prioridade (3 níveis, sem pontuação) foi mantido depois de cogitado remover — ver racional em `addendum.md` do Product Brief, seção "Alternativas consideradas e descartadas".

#### FR-2: Editar tarefa
Isabel pode editar qualquer campo de uma Tarefa existente: Título, Data, Horário e Prioridade. Realiza UJ-3.

**Consequências (testáveis):**
- Editar a Data move a Tarefa da visualização do dia antigo para a do novo dia.
- Editar o Horário reordena a Tarefa dentro da sua Data conforme FR-6.
- Editar a Prioridade não altera a posição da Tarefa (Prioridade é só atributo visual — ver FR-6).
- Título e Data continuam obrigatórios na edição, seguindo a mesma regra do FR-1 — não é possível salvar a edição deixando qualquer um dos dois vazio.
- O Estado não é alterado por esta ação — alterar Estado é uma ação separada (FR-4). [ASSUMPTION: mudar Estado é uma ação rápida e distinta de abrir o formulário completo de edição.]

**Out of Scope:**
- Editar o Estado pela mesma interação de edição de campos (coberto por FR-4).

#### FR-3: Excluir tarefa
Isabel pode excluir uma Tarefa existente, com uma etapa de confirmação antes da exclusão definitiva. Realiza UJ-3.

**Consequências (testáveis):**
- Ao solicitar exclusão, o sistema pede confirmação explícita antes de remover a Tarefa.
- Após confirmada, a Tarefa some da visualização e dos dados persistidos; não há desfazer nem lixeira no MVP.
- Cancelar a confirmação mantém a Tarefa intacta.

### 4.2 Estado da Tarefa
**Descrição:** Alternância do progresso de uma Tarefa entre Pendente, Em andamento e Concluída — o mecanismo que permite a Isabel ver, ao longo do dia, o que já avançou. Realiza UJ-2.

**Requisitos Funcionais:**

#### FR-4: Alterar estado da tarefa
Isabel pode alterar o Estado de uma Tarefa entre Pendente, Em andamento e Concluída, a qualquer momento e em qualquer ordem. Realiza UJ-2.

**Consequências (testáveis):**
- A mudança de Estado é refletida imediatamente na visualização, incluindo a diferenciação visual de Tarefas Concluídas (FR-7).
- Não há restrição de transição — uma Tarefa pode voltar de Concluída para Em andamento ou Pendente se necessário.

### 4.3 Visualização Semanal
**Descrição:** A tela principal do TaskFlow — uma janela de 7 dias, ancorada em hoje e avançando automaticamente, cada um mostrando suas Tarefas ordenadas cronologicamente por Horário e diferenciadas por Estado, com Prioridade como atributo visual secundário. É o que resolve diretamente o problema de "não saber por onde começar o dia". Realiza UJ-1, UJ-2.

**Requisitos Funcionais:**

#### FR-5: Visualizar a janela de 7 dias ancorada em hoje
Isabel pode ver, em uma única tela, 7 dias — hoje e os 6 seguintes — e as Tarefas de cada um. Realiza UJ-1, UJ-2.

**Consequências (testáveis):**
- Os 7 dias são visíveis simultaneamente, sem precisar navegar entre telas para ver outro dia.
- O primeiro dia exibido é sempre hoje; os demais são hoje+1 .. hoje+6, cada um rotulado com a Data real e o nome do dia da semana.
- Quando o dia muda (virada de data), a janela avança automaticamente — inclusive com o app já aberto, sem precisar recarregar a página.
- Um dia sem Tarefas exibe claramente que está vazio (não é confundido com erro de carregamento).

#### FR-6: Ordenar por horário e sinalizar prioridade dentro do dia
Dentro de cada Data, as Tarefas são ordenadas automaticamente por Horário (ordem cronológica crescente); Tarefas sem Horário aparecem primeiro. A Prioridade de cada Tarefa é visualmente identificável, mas não determina mais a ordem de exibição. Realiza UJ-2.

**Consequências (testáveis):**
- Ordem de exibição dentro da Data: Tarefas sem Horário primeiro (nessa sub-lista, ordem de criação), depois Tarefas com Horário em ordem crescente (`08:00` antes de `14:00`).
- Prioridade **não** influencia a posição da Tarefa — mudar a Prioridade nunca reordena a lista.
- O nível de Prioridade de cada Tarefa é reconhecível à primeira vista (cor/rótulo na Tag de Prioridade), inclusive quando não definida (Tag em estado neutro, sempre visível — ver FR-8).
- Duas Tarefas com o mesmo Horário (ou ambas sem Horário) mantêm a ordem relativa de criação entre si. [Substitui a antiga Questão em Aberto 3, agora sem objeto — não existe mais "nível de prioridade" como critério de ordenação.]

#### FR-7: Diferenciar visualmente tarefas concluídas
Tarefas com Estado "Concluída" permanecem visíveis na sua Data, mas com uma diferenciação visual clara em relação a Pendente/Em andamento. Realiza UJ-2.

**Consequências (testáveis):**
- Uma Tarefa Concluída é reconhecível à primeira vista sem precisar ler o rótulo de Estado.
- Tarefas Concluídas não são ocultadas nem removidas da visualização **enquanto sua Data estiver dentro da janela de 7 dias visível**. Uma vez que a Data sai da janela (janela avança e a Data fica no passado), a Tarefa Concluída deixa de aparecer na tela — mas seus dados permanecem salvos (sem tela de Histórico no MVP; ver Non-Goals §6).

**Notas:** *[NOTE FOR PM]* O estilo exato da diferenciação visual (esmaecida, riscada, ícone, ou combinação) é decisão de UX — ver Questão em Aberto 1.

#### FR-8: Ciclar prioridade por clique na tag
Isabel pode clicar diretamente na Tag de Prioridade de um card para alternar a Prioridade em ciclo, sem abrir o Modal de Tarefa. Realiza UJ-3.

**Consequências (testáveis):**
- Clique único cicla: Sem prioridade → Baixa → Média → Alta → Sem prioridade (wraparound).
- O clique na Tag não abre o Modal de Tarefa nem altera o Estado da Tarefa.
- A Tag de Prioridade é sempre visível no card — inclusive sem Prioridade definida, em estado neutro/discreto — para servir de alvo de clique consistente. [Revoga a regra anterior de "Tag ausente quando sem prioridade".]
- Prioridade continua editável também pelo Modal de Tarefa (FR-2) — o clique na Tag é um atalho, não substitui essa via.

#### FR-9: Rollover automático de tarefas atrasadas
Toda Tarefa não concluída cuja Data já saiu da janela de 7 dias (ficou no passado) é movida automaticamente para Hoje. Realiza UJ-4.

**Consequências (testáveis):**
- Só Tarefas com Estado Pendente ou Em andamento sofrem rollover; Tarefas Concluídas nunca são movidas (permanecem na Data original, mesmo que saiam da visualização — ver FR-7).
- O rollover move a Tarefa diretamente para Hoje (nunca dia a dia) — preserva Título, Horário, Prioridade e Estado; nunca duplica a Tarefa.
- O rollover acontece ao abrir o TaskFlow (cobrindo o caso "app fechado por vários dias") e também com o app já aberto, quando a data virar sem que a página seja recarregada.

## 5. NFRs Transversais

- **Persistência:** os dados das Tarefas devem sobreviver ao fechar e reabrir o navegador, mesmo sem login — o MVP não pode depender apenas de estado em memória. O mecanismo exato (armazenamento local do navegador, backend com identificador implícito, etc.) é decisão da etapa de arquitetura, não deste PRD.
  - **Risco conhecido:** dependendo do mecanismo escolhido, limpar os dados do navegador ou trocar de navegador/perfil pode apagar as tarefas sem aviso. Avaliar explicitamente na etapa de arquitetura, com mitigação (aviso à usuária, exportação/backup manual) se necessário. [Ver Questão em Aberto 5.]
- **Plataforma:** ~~uso previsto apenas em navegador desktop. Não há requisito de responsividade mobile nem de sincronização entre dispositivos no MVP — esse cenário é adiado para quando houver login (ver Visão de produto no brief).~~ **[Decisão original alterada em 2026-09-21]** O app passou a ter layout responsivo (7 colunas a partir de 1100 px; 4 entre 700 e 1099 px; 1 coluna com os dias empilhados abaixo de 700 px), verificado em larguras emuladas de 360 a 1280 px, com alvos de toque maiores em telas estreitas ou de toque. **Não** foi testado em aparelho físico (o arraste por toque segue em aberto — `deferred-work.md`). **Sincronização entre dispositivos continua fora do escopo** (depende de login); o que existe é a sincronização entre abas do mesmo navegador.
- **Sem autenticação:** o MVP é single-user, sem cadastro nem login. Todas as Tarefas pertencem implicitamente ao único usuário do navegador/instalação.

## 6. Non-Goals (Explicit)

- Não haverá projetos, categorias, tags ou subtarefas no MVP.
- Não haverá colaboração entre usuários — mesmo a longo prazo, o TaskFlow permanece um produto de organização pessoal, não de gestão de equipes.
- Não haverá dashboard complexo nem relatórios de progresso no MVP.
- Não haverá inteligência artificial no MVP.
- Não haverá notificações nem lembretes no MVP.
- Não haverá tela/superfície de Histórico de tarefas concluídas fora da janela de 7 dias visível no MVP — decisão explícita de 2026-09-18 (ver `sprint-change-proposal-2026-09-18.md`), revisitável se o uso real mostrar necessidade real, não hipotética.
- Não haverá visualização em grade com eixo de horas (estilo Google Calendar) no MVP — a "experiência de agenda" é resolvida como lista ordenada cronologicamente por Horário, reaproveitando o layout de colunas por dia já existente.

## 7. MVP Scope

### 7.1 In Scope
- Exibir a janela de 7 dias ancorada em hoje, avançando automaticamente (FR-5).
- Criar tarefa vinculada a uma data, com horário e prioridade opcionais (FR-1).
- Editar tarefa, incluindo mudar de data, horário e prioridade (FR-2).
- Excluir tarefa, com confirmação (FR-3).
- Alterar o estado da tarefa: Pendente / Em andamento / Concluída (FR-4).
- Ordenar tarefas por horário dentro do dia; sinalizar prioridade visualmente sem afetar a ordem (FR-6).
- Diferenciar visualmente tarefas concluídas, enquanto sua data está na janela visível (FR-7).
- Ciclar prioridade por clique direto na Tag de Prioridade do card (FR-8).
- Mover tarefa não concluída de um dia passado automaticamente para hoje (rollover, FR-9).
- Migrar dados existentes (modelo antigo por dia-da-semana) para o novo modelo por data real, sem perda.
- Persistir os dados entre sessões do navegador, sem login (§5).

### 7.2 Out of Scope for MVP
- **Cadastro e login** — adiado para v2, condicionado a acesso multi-dispositivo (ver Visão do brief). *[NOTE FOR PM]* Revisitar se o uso real mostrar necessidade de acessar de mais de um lugar.
- ~~**Acesso multi-dispositivo / responsividade mobile** — adiado para v2, depende de login.~~ **Acesso multi-dispositivo** — adiado para v2, depende de login. *(A parte de **responsividade mobile** foi entregue em 2026-09-21 — ver §5 Plataforma.)*
- **Notificações e lembretes** — adiado para v3+.
- **Projetos, categorias, tags, subtarefas** — descartado para o MVP, não apenas adiado (ver Non-Goals).
- **Colaboração entre usuários** — descartada, inclusive no longo prazo (ver Non-Goals).
- **Dashboard / relatórios de progresso** — descartado para o MVP (ver Non-Goals).
- **Inteligência artificial** — descartada (ver Non-Goals).

## 8. Success Metrics

Este é um projeto de uso pessoal e de aprendizado — os critérios de sucesso são qualitativos, não métricas de produto. Não há necessidade de lançamento público nem de validação por outras pessoas: o critério de sucesso é o uso real e sustentado pela própria Isabel.

**Primary**
- **SM-1**: Isabel usa o TaskFlow no seu dia a dia real (não só em teste) e valida, na prática, que ele funciona de ponta a ponta conforme o escopo definido. Valida FR-1 a FR-7.
- **SM-2**: Todas as funcionalidades previstas (criar, editar, excluir, mudar estado, visualizar por dia e por prioridade) funcionam corretamente. Valida FR-1 a FR-7.

**Secondary**
- **SM-3**: Isabel completa as etapas do BMAD Method e do Spec-Driven Development de ponta a ponta (brief → PRD → arquitetura → épicos/histórias → código) e consegue explicar, na prática, como a especificação orientou a implementação.

**Counter-metrics (não otimizar)**
- **SM-C1**: Número de funcionalidades adicionadas além do escopo do MVP sem necessidade real comprovada no uso diário — não deve crescer "porque parece comum em produtos desse tipo" (o mesmo padrão que quase trouxe login para o MVP, corrigido durante a descoberta do brief). Contrabalança SM-1 e SM-2.

Métricas quantitativas de usuários, retenção ou adoção estão fora do escopo — não fazem sentido para este projeto.

## 9. Open Questions

1. Qual o estilo exato de diferenciação visual das Tarefas Concluídas (esmaecida, riscada, ícone, combinação)? Decisão de UX, não bloqueia o PRD. *(Resolvida na implementação original: opacidade + risco no texto.)*
2. Qual o mecanismo exato de persistência (armazenamento local do navegador vs. backend com identificador implícito)? Decisão de arquitetura — ver §5. *(Resolvida: `localStorage`.)*
3. ~~Dentro do mesmo nível de Prioridade, qual a ordem relativa das Tarefas?~~ **Moot desde 2026-09-18** — Prioridade não é mais critério de ordenação (FR-6); a pergunta equivalente agora é o desempate entre Tarefas com o mesmo Horário (ou ambas sem Horário), respondida em FR-6 como "ordem de criação".
4. Há um limite máximo de Tarefas por dia? Assumido que não há limite artificial no MVP (ver Assumptions Index).
5. Qual o risco real de perda de dados do mecanismo de persistência escolhido, e é necessária alguma mitigação (aviso à usuária, exportação/backup manual)? Decisão de arquitetura — ver §5. **Nova dimensão desde 2026-09-18:** a migração de schema (dia-da-semana → data real) é uma nova superfície de risco de perda de dados — tratamento explícito exigido na arquitetura, não apenas o aviso estático já existente (AD-3).
6. O timer periódico que recalcula a janela/dispara o rollover (FR-5, FR-9) roda com que granularidade e por qual mecanismo exato? Decisão de arquitetura — ver `ARCHITECTURE-SPINE.md`.

## 10. Assumptions Index

- ~~Inline assumption de §3 — a Semana é exibida de segunda a domingo (7 dias).~~ **Revogada em 2026-09-18** — a Semana/Janela agora é sempre hoje + 6 dias seguintes, nunca uma semana de calendário fixa.
- Inline assumption de §4.1 (FR-2) — alterar Estado é uma ação rápida e distinta da edição completa de campos, não exige abrir o formulário de edição.
- Inline assumption de §4.1 (FR-1) — sem limite artificial de Tarefas por dia no MVP (relacionado à Questão em Aberto 4).
- Inline assumption de §4.3 (FR-6), 2026-09-18 — Tarefas sem Horário aparecem antes das Tarefas com Horário dentro da mesma Data (tratadas como compromissos "flexíveis"/dia inteiro).
- Inline assumption de §4.3 (FR-9), 2026-09-18 — rollover move a Tarefa direto para Hoje, nunca incrementalmente dia a dia, já que dias passados nunca fazem parte da janela visível.

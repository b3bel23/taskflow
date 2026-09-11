---
title: TaskFlow
status: final
created: 2026-09-09
updated: 2026-09-09
---

# PRD: TaskFlow
*Título provisório — confirmar.*

## 0. Document Purpose

Este PRD traduz o Product Brief do TaskFlow (`_bmad-output/planning-artifacts/briefs/brief-teste bmad-2026-09-09/brief.md`) em requisitos funcionais testáveis, prontos para orientar UX e arquitetura. É lido principalmente por Isabel, atuando como PM, UX/arquiteta e desenvolvedora do próprio projeto — o documento serve tanto de especificação quanto de registro de decisões do processo BMAD/Spec-Driven Development. Estrutura: vocabulário fixado no Glossário (§3), funcionalidades agrupadas, com Requisitos Funcionais (FRs) numerados globalmente (§4), e pontos ainda em aberto sinalizados explicitamente (§9-10) em vez de deixados implícitos.

## 1. Vision

O TaskFlow é um organizador semanal de tarefas pessoais. A tela principal mostra os sete dias da semana lado a lado; toda tarefa nasce vinculada a um dia específico, com um estado de progresso (Pendente / Em andamento / Concluída) e, opcionalmente, uma prioridade (Baixa / Média / Alta). A organização por dia da semana não é a única forma cogitada — foi um pivô deliberado a partir de uma ideia inicial mais genérica de gerenciador de tarefas; ver racional completo em `addendum.md` do Product Brief, seção "Evolução do escopo durante a descoberta".

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
  Ao abrir o TaskFlow em qualquer dia, Isabel olha o dia atual e vê o que está pendente, o que já está em andamento e o que foi concluído, com as tarefas de maior prioridade aparecendo primeiro. Ela decide por onde começar, marca uma tarefa como "Em andamento" quando parte para ela, e como "Concluída" quando termina — vendo, ao longo do dia, o progresso se acumular. Realiza FR-4, FR-5, FR-6, FR-7.

- **UJ-3. Isabel ajusta uma tarefa no meio da semana.**
  Uma tarefa muda: o prazo muda de dia, a prioridade sobe porque ficou urgente, ou a tarefa deixou de fazer sentido. Isabel edita a tarefa (inclusive movendo-a para outro dia) ou a exclui — com uma confirmação antes de apagar de vez, já que não há desfazer no MVP. O TaskFlow volta a refletir a realidade da semana. Realiza FR-2, FR-3.

## 3. Glossário

- **Tarefa** — unidade central do TaskFlow. Pertence a exatamente um Dia da Semana, tem um Estado, e opcionalmente uma Prioridade.
- **Semana** — unidade de organização da tela principal. Exibida como os 7 Dias da Semana lado a lado. [ASSUMPTION: semana exibida de segunda a domingo — convenção mais comum no contexto de Isabel; poderia ser domingo a sábado.]
- **Dia da Semana** — um dos 7 dias que compõem a Semana. Toda Tarefa pertence a um Dia da Semana; uma Tarefa pode ser movida de um Dia da Semana para outro por meio de edição.
- **Estado** — progresso de uma Tarefa. Valores possíveis: Pendente (padrão ao criar), Em andamento, Concluída. Os 3 estados (em vez de apenas Pendente/Concluída) foram uma escolha deliberada — ver racional em `addendum.md` do Product Brief, seção "Alternativas consideradas e descartadas".
- **Prioridade** — sinalização de importância de uma Tarefa dentro do seu dia. Valores possíveis: Baixa, Média, Alta, ou sem prioridade definida (padrão ao criar, se não escolhida explicitamente). Não é um sistema de pontuação — apenas 3 níveis + ausência.

## 4. Features

### 4.1 Gestão de Tarefas
**Descrição:** Criação, edição e exclusão de Tarefas. É a base de tudo — sem isso não há o que visualizar ou acompanhar. Realiza UJ-1, UJ-3.

**Requisitos Funcionais:**

#### FR-1: Criar tarefa
Isabel pode criar uma Tarefa vinculada a um Dia da Semana específico. Realiza UJ-1.

**Consequências (testáveis):**
- A Tarefa exige um Título e um Dia da Semana; ambos são obrigatórios para salvar.
- A Prioridade é opcional na criação; se não escolhida, a Tarefa fica sem prioridade definida (não há valor padrão atribuído automaticamente).
- O Estado da Tarefa criada é sempre Pendente.
- A Tarefa criada aparece imediatamente no Dia da Semana correspondente, na posição correta segundo a ordenação por Prioridade (ver FR-6).
- [ASSUMPTION: não há limite máximo de Tarefas por dia no MVP.]

**Notas:**
- *[NOTE FOR PM]* O Product Brief original descrevia toda tarefa como criada "com uma prioridade" (Sumário Executivo, Escopo). Durante a elicitação deste PRD, a usuária esclareceu que a Prioridade é opcional na criação — este PRD reflete a versão mais recente e confirmada, que substitui essa leitura do brief.
- O mecanismo de Prioridade (3 níveis, sem pontuação) foi mantido depois de cogitado remover — ver racional em `addendum.md` do Product Brief, seção "Alternativas consideradas e descartadas".

#### FR-2: Editar tarefa
Isabel pode editar qualquer campo de uma Tarefa existente: Título, Dia da Semana e Prioridade. Realiza UJ-3.

**Consequências (testáveis):**
- Editar o Dia da Semana move a Tarefa da visualização do dia antigo para a do novo dia.
- Editar a Prioridade reordena a Tarefa dentro do seu dia conforme FR-6.
- Título e Dia da Semana continuam obrigatórios na edição, seguindo a mesma regra do FR-1 — não é possível salvar a edição deixando qualquer um dos dois vazio.
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
**Descrição:** A tela principal do TaskFlow — os 7 dias da semana lado a lado, cada um mostrando suas Tarefas ordenadas por Prioridade e diferenciadas por Estado. É o que resolve diretamente o problema de "não saber por onde começar o dia". Realiza UJ-1, UJ-2.

**Requisitos Funcionais:**

#### FR-5: Visualizar semana
Isabel pode ver, em uma única tela, os 7 dias da semana e as Tarefas de cada um. Realiza UJ-1, UJ-2.

**Consequências (testáveis):**
- Os 7 dias são visíveis simultaneamente, sem precisar navegar entre telas para ver outro dia.
- Um dia sem Tarefas exibe claramente que está vazio (não é confundido com erro de carregamento).

#### FR-6: Ordenar e sinalizar prioridade dentro do dia
Dentro de cada Dia da Semana, as Tarefas são ordenadas automaticamente por Prioridade, e o nível de Prioridade de cada Tarefa é visualmente identificável. Realiza UJ-2.

**Consequências (testáveis):**
- Ordem de exibição: Alta → Média → Baixa → sem prioridade definida.
- Dentro do mesmo nível de Prioridade, a ordem relativa não é especificada pelo MVP. [Ver Questão em Aberto 3.]
- O nível de Prioridade de cada Tarefa é reconhecível à primeira vista (cor, ícone ou rótulo) — não apenas implícito pela posição na ordenação. Tarefas sem prioridade definida não exibem nenhum indicador.

#### FR-7: Diferenciar visualmente tarefas concluídas
Tarefas com Estado "Concluída" permanecem visíveis no seu dia, mas com uma diferenciação visual clara em relação a Pendente/Em andamento. Realiza UJ-2.

**Consequências (testáveis):**
- Uma Tarefa Concluída é reconhecível à primeira vista sem precisar ler o rótulo de Estado.
- Tarefas Concluídas não são ocultadas nem removidas da visualização do dia no MVP.

**Notas:** *[NOTE FOR PM]* O estilo exato da diferenciação visual (esmaecida, riscada, ícone, ou combinação) é decisão de UX — ver Questão em Aberto 1.

## 5. NFRs Transversais

- **Persistência:** os dados das Tarefas devem sobreviver ao fechar e reabrir o navegador, mesmo sem login — o MVP não pode depender apenas de estado em memória. O mecanismo exato (armazenamento local do navegador, backend com identificador implícito, etc.) é decisão da etapa de arquitetura, não deste PRD.
  - **Risco conhecido:** dependendo do mecanismo escolhido, limpar os dados do navegador ou trocar de navegador/perfil pode apagar as tarefas sem aviso. Avaliar explicitamente na etapa de arquitetura, com mitigação (aviso à usuária, exportação/backup manual) se necessário. [Ver Questão em Aberto 5.]
- **Plataforma:** uso previsto apenas em navegador desktop. Não há requisito de responsividade mobile nem de sincronização entre dispositivos no MVP — esse cenário é adiado para quando houver login (ver Visão de produto no brief).
- **Sem autenticação:** o MVP é single-user, sem cadastro nem login. Todas as Tarefas pertencem implicitamente ao único usuário do navegador/instalação.

## 6. Non-Goals (Explicit)

- Não haverá projetos, categorias, tags ou subtarefas no MVP.
- Não haverá colaboração entre usuários — mesmo a longo prazo, o TaskFlow permanece um produto de organização pessoal, não de gestão de equipes.
- Não haverá dashboard complexo nem relatórios de progresso no MVP.
- Não haverá inteligência artificial no MVP.
- Não haverá notificações nem lembretes no MVP.

## 7. MVP Scope

### 7.1 In Scope
- Exibir a tela principal com os 7 dias da semana visíveis (FR-5).
- Criar tarefa vinculada a um dia, com prioridade opcional (FR-1).
- Editar tarefa, incluindo mudar de dia (FR-2).
- Excluir tarefa, com confirmação (FR-3).
- Alterar o estado da tarefa: Pendente / Em andamento / Concluída (FR-4).
- Ordenar tarefas por prioridade dentro do dia (FR-6).
- Diferenciar visualmente tarefas concluídas (FR-7).
- Persistir os dados entre sessões do navegador, sem login (§5).

### 7.2 Out of Scope for MVP
- **Cadastro e login** — adiado para v2, condicionado a acesso multi-dispositivo (ver Visão do brief). *[NOTE FOR PM]* Revisitar se o uso real mostrar necessidade de acessar de mais de um lugar.
- **Acesso multi-dispositivo / responsividade mobile** — adiado para v2, depende de login.
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

1. Qual o estilo exato de diferenciação visual das Tarefas Concluídas (esmaecida, riscada, ícone, combinação)? Decisão de UX, não bloqueia o PRD.
2. Qual o mecanismo exato de persistência (armazenamento local do navegador vs. backend com identificador implícito)? Decisão de arquitetura — ver §5.
3. Dentro do mesmo nível de Prioridade, qual a ordem relativa das Tarefas (ordem de criação, alfabética, etc.)? Não especificado no MVP; assumir ordem de criação até decisão em contrário.
4. Há um limite máximo de Tarefas por dia? Assumido que não há limite artificial no MVP (ver Assumptions Index).
5. Qual o risco real de perda de dados do mecanismo de persistência escolhido, e é necessária alguma mitigação (aviso à usuária, exportação/backup manual)? Decisão de arquitetura — ver §5.

## 10. Assumptions Index

- Inline assumption de §3 — a Semana é exibida de segunda a domingo (7 dias).
- Inline assumption de §4.1 (FR-2) — alterar Estado é uma ação rápida e distinta da edição completa de campos, não exige abrir o formulário de edição.
- Inline assumption de §4.1 (FR-1) — sem limite artificial de Tarefas por dia no MVP (relacionado à Questão em Aberto 4).

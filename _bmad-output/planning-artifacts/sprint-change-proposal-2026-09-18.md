---
title: TaskFlow — Semana Dinâmica, Agenda por Horário e Prioridade Visual
status: aprovado — artefatos atualizados (PRD, UX, Arquitetura, SPEC, Epics, sprint-status)
created: 2026-09-18
approved: 2026-09-18
scope: major
trigger: pivô deliberado de produto (Isabel), não um bug de implementação
---

# Sprint Change Proposal — TaskFlow: Semana Dinâmica / Agenda por Horário

> **Fase:** análise/planejamento apenas. Nenhum código foi alterado. Nenhum artefato (`prd.md`, `EXPERIENCE.md`, `DESIGN.md`, `ARCHITECTURE-SPINE.md`, `SPEC.md`, `epics.md`) foi editado ainda — este documento é a proposta para aprovação antes de tocar em qualquer um deles.

## 1. Resumo do Gatilho

TaskFlow (MVP completo: Epics 1–4, todas as 9 capacidades CAP-1..CAP-9 implementadas e `done` em `sprint-status.yaml`) evolui de "organizador semanal de tarefas por dia-da-semana + prioridade" para "gerenciador semanal com experiência de agenda/calendário": semana ancorada na data real de hoje, ordenação primária por horário, prioridade como atributo secundário, e rollover automático de tarefas atrasadas.

**Categoria do gatilho:** pivô estratégico deliberado — não uma falha técnica nem mal-entendido de requisito anterior. Análoga ao pivô já registrado no histórico do projeto (Product Brief `addendum.md`, "Evolução do escopo durante a descoberta"), mas desta vez pós-MVP, sobre um produto já funcionando.

**Evidência:** pedido explícito de Isabel com 7 blocos de requisito (semana dinâmica, rollover, ordenação por horário, estados mantidos, prioridade visual, drag reavaliado, persistência com datas reais) + 5 decisões já resolvidas nesta sessão (seção 2).

## 2. Decisões já tomadas com Isabel nesta sessão

| # | Decisão | Escolha |
|---|---|---|
| D1 | Densidade visual da "agenda" | **Lista ordenada por horário** dentro da coluna do dia (não grade com eixo de horas). Reaproveita `DayColumn`/`TaskCard`. |
| D2 | Posição de tarefas sem horário | **No topo**, antes das com horário (padrão "dia inteiro"). |
| D3 | Tarefa concluída cuja data saiu da janela de 7 dias | **Sem tela de Histórico.** Permanece salva no `localStorage` com a data original, mas some da interface — não há nova superfície de UI no MVP. |
| D4 | Alvo de clique da Tag de Prioridade quando "sem prioridade" | **Tag sempre visível**, inclusive em estado neutro/discreto quando não definida — muda a regra atual de "ausente por completo". |
| D5 | Quando recalcular a janela/"hoje" | **Timer ativo** (checagem periódica em segundo plano), não apenas ao carregar/focar a aba. |

Essas 5 decisões condicionam todo o restante da análise abaixo — são tratadas como resolvidas, não reabertas.

## 3. Impacto por Épico (checklist §2)

| Épico | Situação | Impacto |
|---|---|---|
| Epic 1 — Fundação | `done` | **Alto.** Story 1.1 (semana vazia): a definição de "os 7 dias" deixa de ser um array estático `mon..sun` e passa a ser uma janela calculada a partir de "hoje". Story 1.2 (persistência): schema muda de forma incompatível (day-of-week → data real) — precisa de **migração**, não apenas versionamento cosmético. Story 1.3 (tema): sem impacto. |
| Epic 2 — Gerenciar Tarefas | `done` | **Alto.** Criar/editar tarefa ganham campo Horário opcional. FR-6 (ordenar por prioridade) é substituído por ordenação por horário — muda o contrato de "posição correta" nas Stories 2.1/2.2. |
| Epic 3 — Progresso do Dia | `done` | **Baixo.** Ciclo de Estado e diferenciação visual de concluída continuam idênticos. Único ajuste: a garantia "nunca ocultada" (UX-DR5/FR-7) passa a valer apenas *enquanto a data está na janela visível* — precisa de uma frase explícita nova, não uma reescrita. |
| Epic 4 — Reordenar e Mudar por Arraste | `done` | **Muito alto — parte fica obsoleta.** Story 4.1 (reordenar manualmente dentro do mesmo nível de prioridade) **deixa de fazer sentido**: não há mais níveis de prioridade como zona de drop, e a ordem deixa de ser editável manualmente (passa a ser sempre derivada do horário). Story 4.2 (mudar prioridade OU dia arrastando) **perde a metade "prioridade"** — no novo modelo, arrastar só muda o dia; prioridade só muda por edição no Modal ou pelo clique-ciclo (D4). |

**Novos épicos necessários** (não cobertos por nenhum épico existente): janela dinâmica + rollover + migração de dados (fundação nova), horário como critério de ordenação, prioridade como clique-ciclo. Detalhado na seção 6.

**Não invalida** Epic 1–3 como capacidades — a fundação (persistência, tema, CRUD, estados) continua toda válida; o que muda é o *modelo de dados subjacente* e *duas regras de exibição* (ordenação, janela).

## 4. Conflitos e impacto por artefato (checklist §3)

### 4.1 PRD (`prd.md`)

Conflitos diretos com o texto atual:

- **§1 Vision:** "A tela principal mostra os sete dias da semana lado a lado" continua verdadeiro, mas implica semana fixa por associação com §3. Precisa de uma frase: "...ancorados a partir do dia atual, avançando automaticamente".
- **§3 Glossário — "Semana":** hoje diz *"[ASSUMPTION: semana exibida de segunda a domingo]"*. Essa assumption é **revogada**, não apenas ajustada — vira "janela de 7 dias iniciando em hoje". Termo **"Dia da Semana"** deixa de existir como enum abstrato (`mon`..`sun`) e vira **"Data"** (data real do calendário). Novos termos a definir: **Horário** (opcional, HH:MM), **Rollover** (migração automática de tarefa atrasada).
- **§4.1 FR-1/FR-2:** "vinculada a um Dia da Semana" → "vinculada a uma Data"; adicionar Horário opcional como novo campo do FR-1/FR-2.
- **§4.3 FR-6:** hoje é *"ordenadas automaticamente por Prioridade... Alta→Média→Baixa→sem prioridade"*. Isso é **substituído** por ordenação por Horário (tarefas sem horário primeiro — D2). FR-6 precisa ser reescrito, não estendido — a regra antiga deixa de ser verdadeira.
- **§4.3 FR-7:** "Tarefas Concluídas não são ocultadas nem removidas da visualização do dia" — precisa da ressalva "enquanto a Data está dentro da janela de 7 dias visível" (D3).
- **Novo FR necessário:** ciclar Prioridade por clique na tag (D4), sem abrir o Modal e sem interferir no Estado — mesmo padrão do StateIndicator (FR-4), mas para Prioridade.
- **Novo FR necessário:** rollover automático de tarefas não concluídas de dias passados para "hoje", preservando dados/estado, sem duplicar.
- **§9 Open Questions:** OQ3 ("ordem relativa dentro do mesmo nível de prioridade") fica **moot** — não existe mais "nível de prioridade" como critério de ordenação; remover ou marcar como resolvida-por-superação. OQ5 (risco de perda de dados) ganha uma nova dimensão: a migração de schema em si é uma nova superfície de risco de perda de dados — vale registrar explicitamente.
- **§10 Assumptions Index:** remover a assumption de semana Segunda→Domingo; adicionar as novas (janela dinâmica, timer de recálculo — D5).
- **§6 Non-Goals:** vale adicionar uma linha explícita "sem tela de Histórico de tarefas concluídas fora da janela" (D3), documentando a decisão para não ser revisitada silenciosamente depois.

**Conclusão:** o MVP como definido no PRD atual **não é mais o MVP-alvo** — não é uma extensão aditiva, é uma redefinição de 2 FRs centrais (FR-6, e parcialmente FR-1/FR-2) mais 2 FRs novos. PRD precisa de uma rodada de edição formal (`bmad-prd`, modo update), não um patch informal.

### 4.2 UX — `EXPERIENCE.md` + `DESIGN.md`

- **Component Patterns → "Coluna do Dia":** *"ordem fixa Segunda→Domingo"* → ordem dinâmica hoje→hoje+6. *"Tarefas ordenadas automaticamente por Prioridade"* → ordenadas por Horário (sem horário primeiro, D2).
- **Component Patterns → "Card de Tarefa":** precisa de um novo elemento visual — rótulo de Horário (ex. "08:00") quando definido.
- **Component Patterns → "Tag de Prioridade":** regra atual *"some completamente quando a Tarefa não tem prioridade — nunca um espaço reservado vazio"* é **revogada** por D4 — agora sempre visível, com estado neutro clicável. Precisa de spec visual nova em `DESIGN.md` para o estado "sem prioridade" (cor neutra, ainda reconhecível como tag).
- **Interaction Primitives:** remover a linha "Arrastar um Card para outra faixa de Prioridade dentro do mesmo dia → muda a Prioridade". Adicionar: "Clique na Tag de Prioridade → cicla Sem prioridade → Baixa → Média → Alta → Sem prioridade, sem abrir o Modal, sem alterar o Estado" (mesmo padrão do StateIndicator — UX-DR7 ganha um "irmão").
- **Interaction Primitives → banido:** a lista de banidos já diz *"arraste como única forma de mudar Prioridade ou Dia"* — isso se resolve sozinho (prioridade não muda mais por arraste, então a cláusula fica vazia para Prioridade e só resta Dia).
- **State Patterns:** nova linha "Tarefa sem Horário" (D2: aparece primeiro, sem rótulo de hora). Linha "Tarefa Concluída" ganha a mesma ressalva do FR-7 (só enquanto a Data está na janela visível).
- **Key Flows:** Flow 1 e Flow 2 descrevem explicitamente "ordenação por prioridade" como parte da narrativa (`"já na posição correta pela ordenação de Prioridade"`, `"Alta no topo, depois Média..."`) — ambos precisam reescrita de trecho, não só nota de rodapé.
- **Mockups (`mockups/key-weekly-view.html`):** hoje mostra 7 colunas Segunda→Domingo com faixas de prioridade coloridas como estrutura visual. Precisa de regeneração — spine explicitamente diz "wins on conflict" sobre o mockup, mas o mockup ficaria enganoso se não for atualizado.
- **Accessibility Floor:** sem mudança estrutural — "toda ação alcançável por teclado" continua valendo, só o inventário de ações muda (perde "mudar Prioridade por arraste", ganha "ciclar Prioridade por tecla/Enter na Tag").

### 4.3 Arquitetura (`ARCHITECTURE-SPINE.md`)

Este é o artefato com o impacto mais profundo — várias regras **ADOTADAS** mudam de forma incompatível, não apenas se estendem:

- **Modelo de dados (`Task`):** `day: DayOfWeek` → `date: string` (ISO `YYYY-MM-DD`); novo campo `time: string | null` (`HH:mm`). O campo `order` muda de escopo — hoje é `(day, priorityGroup)`; no novo modelo não existe mais `priorityGroup` como eixo de ordenação, então `order` só faz sentido como **desempate estável** para tarefas com o mesmo horário (ou ambas sem horário) dentro da mesma `date`. Isso torna `reorderWithinGroup`/`reorderGroupByIndex` (hoje "função pura única" por AD-7) **obsoletas** — não há mais reordenação manual dentro do dia para elas resolverem.
- **AD-2 (persistência, `schemaVersion`):** a regra atual é explícita e taxativa — *"`schemaVersion` não reconhecido → cai no estado vazio padrão"* (mesmo caminho de `loadError`, ou seja, **descarta os dados**). Isso está em **conflito direto** com o requisito de Isabel ("migração dos dados existentes sem perder tarefas"). AD-2 precisa de uma exceção nova e explícita: `schemaVersion === 1` (formato antigo, `day`-based) deixa de cair em `loadError` e passa por uma função de migração dedicada antes de virar `schemaVersion === 2`. Qualquer *outro* valor não reconhecido continua no caminho de descarte atual (não há terceiro formato histórico a preservar).
- **AD-6/AD-7 (drag-and-drop):** AD-7 inteiro ("Ordem manual dentro do mesmo nível de prioridade") fica obsoleto como está escrito — não existe mais "nível de prioridade" como escopo de ordenação nem reordenação manual por arraste. AD-6 (drag sempre com equivalente por teclado) continua válido em princípio, mas o que o drag *faz* muda: só move a tarefa para outra Data; a Data destino já vem ordenada automaticamente por Horário (sem gesto de "soltar na posição X").
- **Novo AD necessário — Janela dinâmica de 7 dias:** substitui a constante estática `DAYS_OF_WEEK`. Regra: janela = `[hoje, hoje+1, ..., hoje+6]`, recalculada (D5) por timer periódico enquanto o app está aberto, e sempre ao carregar. Rótulo de dia-da-semana (Segunda-feira etc.) passa a ser derivado de `date.getDay()` por coluna, não mais de uma posição fixa no array.
- **Novo AD necessário — Rollover de tarefas atrasadas:** toda tarefa com `state !== 'done'` e `date < hoje` tem sua `date` reatribuída para `hoje` (nunca para uma data intermediária — ver §5.3 para o racional). Isso roda: (a) uma vez ao carregar os dados (cobre "app fechado e reaberto depois"), e (b) a cada disparo do timer de D5, caso a data mude com o app aberto. Persistência continua atômica (AD-4): o rollover computa a lista afetada, tenta salvar em lote (**uma única escrita**, não N escritas), e só então comita ao estado React — mesma disciplina do resto do app, aplicada a uma mutação disparada pelo sistema, não por clique de Isabel.
- **AD-4 (atomicidade):** regra em si não muda, mas seu escopo de "toda função de ação" precisa **explicitamente** incluir o rollover automático e a migração de schema — hoje o texto enumera criar/editar/excluir/mudar-estado/reordenar/arraste; rollover e migração são mutações nascidas do sistema, não de clique de Isabel, e é fácil esquecê-las na hora de re-escrever essa lista.
- **AD-9 (estilo):** sem impacto — tokens e CSS Modules continuam válidos; só adiciona um novo token/classe para o rótulo de Horário e para a Tag de Prioridade em estado "sem prioridade" (D4).
- **Consistency Conventions (tabela):** entrada `DayOfWeek ('mon'..'sun')` → `date (string ISO)`; nova entrada `time (string HH:mm | null)`. Formato de data: **decisão recomendada** — usar `Date` nativo do navegador (sem nova dependência), já que a spine favorece "tecnologia enfadonha" (ver decisão TypeScript 6.0) e o escopo de aritmética de datas aqui é simples (somar/subtrair dias, formatar ISO, comparar strings `YYYY-MM-DD` que já ordenam lexicograficamente = cronologicamente). Nenhuma biblioteca de datas nova é necessária — sinalizo isso como recomendação, não pergunta, por ser de baixo risco e alinhado ao precedente já registrado na spine.
- **Structural Seed:** `constants/days.ts` (`DAYS_OF_WEEK`, `getTodayDayOfWeek`) é substituído por algo como `constants/week.ts` (`getWeekWindow(anchor: Date): string[]`, `getWeekdayLabel(date: string): string`). `state/selectors.ts` perde `reorderWithinGroup`/`reorderGroupByIndex` (ou os reduz a uma função só de desempate por `order` dentro da mesma `date`) e ganha `sortTasksInDay` reescrita (horário cronológico, sem-horário primeiro — D2) e uma nova função pura de rollover (`applyRollover(tasks, today): Task[]`). `storage/tasksStorage.ts` ganha a migração `migrateFromV1`.

### 4.4 SPEC (`SPEC.md`, `glossary.md`)

`epics.md` já declara a SPEC como "fonte canônica de escopo — nenhuma capacidade nova é introduzida além de CAP-1..CAP-9". Esse invariante **é quebrado** por este pivô, deliberadamente:

- **CAP-1/CAP-2** (criar/editar): "vinculada a um dia da semana" → "vinculada a uma data"; adicionar horário opcional ao `success`.
- **CAP-6** hoje mistura duas coisas (ordenação automática por prioridade + reordenação manual por arraste) que **deixam de existir juntas**. Precisa virar duas capacidades novas: uma de ordenação por horário, outra de mover-por-arraste-só-entre-dias (sem a parte de reordenação manual, que desaparece).
- **CAP-7:** ganha a ressalva "dentro da janela de 7 dias visível" (mesma de FR-7/UX-DR5).
- **Novas CAPs necessárias:** (a) horário opcional por tarefa e ordenação cronológica; (b) ciclar prioridade por clique na tag; (c) janela semanal dinâmica ancorada em hoje; (d) rollover automático de tarefas atrasadas; (e) migração de dados do schema antigo (day-of-week) para o novo (data real) sem perda.
- **Constraints:** *"Semana exibida de segunda a domingo"* é removida/substituída.
- **Non-goals:** vale adicionar explicitamente "sem tela de Histórico de tarefas concluídas fora da janela visível" (D3), para a mesma decisão não ser reaberta silenciosamente numa iteração futura.

### 4.5 Outros artefatos (checklist §3.4)

- **Testes:** `architecture.test.ts` (que verifica AD-8/AD-9 por substring) e os testes colocalizados de `selectors.test.ts`, `tasksStorage.test.ts`, `days.test.ts`, `dragChange.test.ts` **todos** precisam de reescrita relevante — não é um ajuste cosmético, o modelo de dados que eles testam muda de forma. Fora de escopo desta análise (é trabalho de implementação), mas relevante para o Effort Estimate da seção 5.
- **`sprint-status.yaml`:** precisa de novas entradas de épico/história em `backlog` assim que os novos épicos forem aprovados (checklist §6.4) — não altero o arquivo agora, só registro que ele precisará de atualização após aprovação.
- **Sem impacto:** deploy/CI (`AD-1`/Deferred já diz "sem hospedagem, sem CI/CD" — GitHub Pages deploy do commit recente `b79b54b` é sobre o build estático, não sobre este pivô), observabilidade (continua "nenhuma").

## 5. Caminho recomendado (checklist §4)

| Opção | Viável? | Esforço | Risco |
|---|---|---|---|
| **1. Ajuste direto** (novas histórias dentro da estrutura de épicos existente, sem tocar código ainda) | **Sim — recomendada** | Alto (5 artefatos + 3 épicos novos + revisão do Epic 4), mas incremental e sequenciável | Médio — maior risco concentrado na migração de schema (item único que pode perder dados se malfeito) |
| **2. Rollback** (reverter Epic 4, refazer do zero) | Não viável | — | Desnecessário: Epic 4 não está "errado", só parcialmente obsoleto (a metade "mudar dia por arraste" continua 100% válida) |
| **3. Revisão de escopo do MVP** (reduzir ambição em vez de expandir) | Não se aplica — Isabel está pedindo expansão deliberada, não corte | — | — |

**Recomendação: Opção 1 (Ajuste direto), tratado como mudança Major** — reabre PRD/UX/Arquitetura/SPEC/Epics formalmente (não é um patch de história isolada), mas reaproveita a fundação existente (persistência, tema, CRUD, estados, guard de atomicidade AD-4) quase integralmente. O maior risco concreto é a migração de `schemaVersion` 1→2: se malfeita, é o único ponto real de perda de dados de Isabel. Recomendo que a história de migração seja a **primeira** implementada e testada isoladamente (dados reais exportados do `localStorage` atual dela, se possível, como fixture de teste) antes de qualquer outra mudança visual.

## 6. Novos Épicos e Histórias propostos

Não renumero nem revisito Epics 1–3 (`done`, sem mudança de comportamento). Proponho **3 épicos novos** + **1 revisão** do Epic 4, nesta ordem de dependência:

### Epic 5 (novo): Data Real e Janela Semanal Dinâmica — *fundação, bloqueia os demais*
Migra o modelo de dados de `day: DayOfWeek` para `date` real, introduz a janela de 7 dias ancorada em hoje, e o rollover automático de tarefas atrasadas.

- **Story 5.1 — Migrar dados existentes para o modelo de data real:** ao carregar `taskflow:tasks` com `schemaVersion: 1`, cada tarefa é remapeada para a data (dentro da primeira janela hoje→hoje+6) correspondente ao seu dia-da-semana antigo, e o arquivo é regravado como `schemaVersion: 2`. Nenhuma tarefa é perdida; a migração roda uma única vez por instalação.
- **Story 5.2 — Exibir a janela dinâmica de 7 dias:** a tela mostra hoje + próximos 6 dias, com data e nome do dia da semana; a coluna de hoje mantém o destaque `today-background`.
- **Story 5.3 — Avançar a janela automaticamente com o timer ativo (D5):** enquanto o app está aberto, um timer periódico detecta a virada de dia e recalcula a janela sem precisar de reload/foco.
- **Story 5.4 — Rollover automático de tarefas atrasadas:** ao carregar e a cada disparo do timer (5.3), toda tarefa não concluída com data anterior a hoje é movida para hoje, preservando título/prioridade/horário/estado, sem duplicar.

### Epic 6 (novo): Organização por Horário
Adiciona horário opcional à tarefa e substitui a ordenação por prioridade pela ordenação cronológica.

- **Story 6.1 — Definir horário ao criar/editar tarefa:** campo Horário (HH:MM), opcional, no Modal de criação e edição.
- **Story 6.2 — Ordenar tarefas do dia por horário:** dentro de cada coluna, tarefas com horário aparecem em ordem crescente; tarefas sem horário aparecem primeiro (D2), em ordem de criação entre si.

### Epic 7 (novo): Prioridade como Atributo Visual
Prioridade deixa de ordenar; ganha interação rápida de clique-ciclo.

- **Story 7.1 — Tag de Prioridade sempre visível:** mesmo sem prioridade definida, a tag aparece em estado neutro/discreto (D4), substituindo a regra atual de "ausente por completo".
- **Story 7.2 — Ciclar prioridade por clique na tag:** clique único cicla Sem prioridade → Baixa → Média → Alta → Sem prioridade; não abre o Modal; não altera o Estado; equivalente completo por teclado (mesmo padrão do StateIndicator, UX-DR7/UX-DR13).

### Epic 4 (revisão, não recriação): Mover Tarefa Entre Dias por Arraste
- **Story 4.1 — REMOVIDA.** "Reordenar por arraste dentro do mesmo nível de prioridade" deixa de existir como capacidade — não há mais reordenação manual (ordem é sempre derivada do horário).
- **Story 4.2 — REVISADA.** Passa a ser só "mudar o dia arrastando o card" — preserva prioridade e horário da tarefa; a metade "mudar prioridade arrastando para outra faixa" é removida do escopo da história.

**Sequência recomendada:** Epic 5 → Epic 6 → Epic 7 → revisão do Epic 4. Epic 5 é bloqueante de tudo (sem data real, nada mais faz sentido). Epic 4 revisado vai por último de propósito: só depois que Epic 6/7 definem as regras finais de ordenação e prioridade é que o comportamento correto do "soltar" no drag fica totalmente especificado.

## 7. Pontos que seguem como recomendação técnica (não bloqueiam, mas registro para você poder vetar)

Estes eu tratei como decisões de baixo risco/derivadas diretamente do que você já pediu — não usei `AskUserQuestion` para eles, mas sinalizo explicitamente para veto:

1. **Sem biblioteca de datas nova** (`date-fns` etc.) — `Date` nativo é suficiente para o escopo (somar dias, formatar ISO, comparar strings `YYYY-MM-DD`). Consistente com o precedente "tecnologia enfadonha" já registrado na spine.
2. **Rollover sempre joga a tarefa direto para "hoje"**, nunca dia-a-dia (ex.: uma tarefa de 5 dias atrás não passa por +1, +2, +3... até chegar em hoje — pula direto). É a única leitura consistente de "próximo dia disponível" dado que a janela é sempre hoje→hoje+6 (dias passados nunca são "disponíveis").
3. **Migração de schema mapeia cada dia-da-semana antigo para a data correspondente dentro da primeira janela calculada** (ex.: se hoje é sexta e a tarefa era `'mon'`, ela vira a próxima Segunda dentro da janela, não a Segunda já passada) — evita que a migração em si já jogue tarefas "para trás" e dispare rollover na mesma hora.
4. **Desempate de ordem entre tarefas com mesmo horário (ou ambas sem horário)** continua por ordem de criação (reaproveita o campo `order` já existente, com escopo reduzido de `(day, priorityGroup)` para `(date)`).
5. **`schemaVersion` diferente de 1 ou 2** continua caindo no caminho de descarte atual (`loadError`) — só a versão 1 (formato real já em uso) ganha caminho de migração; não invento suporte a formatos que nunca existiram.

## 8. Handoff (checklist §5.5 / §6)

**Classificação:** Major — reabre PRD, UX (2 documentos), Arquitetura, SPEC e Epics formalmente antes de qualquer código.

**Responsável:** você (Isabel), acumulando os papéis de PM/UX/Arquiteta/Dev do projeto, como já é o padrão deste repositório. Este documento é o artefato de handoff entre "eu decidindo sozinha" e "próxima etapa formal de cada disciplina".

**Próximos passos sugeridos, na ordem, cada um só após sua aprovação explícita:**
1. Atualizar o PRD (`bmad-prd`, modo update) com as mudanças da seção 4.1.
2. Atualizar UX (`bmad-ux` ou edição direta de `EXPERIENCE.md`/`DESIGN.md`) com as mudanças da seção 4.2, incluindo regeneração dos mockups.
3. Atualizar a Arquitetura (`bmad-architecture`, modo update) com as mudanças da seção 4.3 — priorizar a especificação exata da migração de schema antes de qualquer outra coisa, dado o risco de perda de dados.
4. Atualizar a SPEC (`bmad-spec`) com as mudanças da seção 4.4.
5. Rodar `bmad-create-epics-and-stories` (ou edição direta) para formalizar os Epics 5–7 e a revisão do Epic 4 da seção 6, com Acceptance Criteria completos no padrão Gherkin já usado em `epics.md`.
6. Atualizar `sprint-status.yaml` com as novas entradas em `backlog`.
7. Só então: implementação, começando pela Story 5.1 (migração) isolada e testada antes de qualquer mudança visual.

**Não sigo para nenhum desses passos sem sua aprovação explícita deste documento.**

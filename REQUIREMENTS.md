# TaskFlow — Requisitos (consolidado)

Resumo do que o TaskFlow **deve** fazer, extraído dos artefatos BMAD aprovados. Não cria requisitos novos: cada item aponta para a fonte. Em caso de divergência, vale o artefato — a fonte de verdade é o [PRD](_bmad-output/planning-artifacts/prds/prd-teste%20bmad-2026-09-09/prd.md) (atualizado em 2026-09-18).

*Projeto Node/npm: as dependências ficam em `package.json`/`package-lock.json`, por isso não existe `requirements.txt`.*

## 1. Objetivo

Um organizador semanal de tarefas pessoais: uma pessoa, uma janela de 7 dias a partir de hoje, o essencial para criar, editar, excluir e acompanhar o estado de cada tarefa — sem cadastro, sem backend e sem recursos que não foram pedidos. Resolve tarefas de estudo, trabalho e vida pessoal espalhadas entre anotações e mensagens. É também o veículo de um objetivo de aprendizado: percorrer BMAD Method + Spec-Driven Development de ponta a ponta. *(PRD §1, §8)*

## 2. Requisitos funcionais

| ID | Requisito | Fonte |
|---|---|---|
| FR-1 | Criar tarefa numa **Data**, com **Título** e Data obrigatórios; **Horário** e **Prioridade** opcionais; estado inicial sempre Pendente; aparece na hora, já na posição certa. | PRD §4.1 |
| FR-2 | Editar Título, Data, Horário e Prioridade (não o Estado). Mudar a Data move a tarefa de coluna; mudar o Horário a reposiciona; mudar a Prioridade nunca reposiciona. | PRD §4.1 |
| FR-3 | Excluir com **confirmação** explícita; cancelar mantém a tarefa; sem desfazer nem lixeira. | PRD §4.1 |
| FR-4 | Alterar o **Estado** (Pendente / Em andamento / Concluída), a qualquer momento e em qualquer ordem, por uma ação rápida distinta da edição. | PRD §4.2 |
| FR-5 | Ver numa só tela **hoje + os 6 dias seguintes**, cada um com nome do dia e Data real; a janela avança sozinha na virada do dia, mesmo com o app aberto; dia vazio é sinalizado. | PRD §4.3 |
| FR-6 | Dentro do dia, ordenar por **Horário** (sem horário primeiro, em ordem de criação; depois crescente). A Prioridade é visual e **não** influencia a ordem. Empate: ordem de criação. | PRD §4.3 |
| FR-7 | Tarefas concluídas ficam visíveis, com diferenciação visual clara, enquanto a Data estiver na janela; ao sair dela deixam de aparecer, mas os dados são preservados. | PRD §4.3 |
| FR-8 | Ciclar a Prioridade clicando na **Tag** do cartão (Sem prioridade → Baixa → Média → Alta → Sem prioridade), sem abrir o modal nem mudar o Estado; a Tag é sempre visível. | PRD §4.3 |
| FR-9 | **Rollover**: tarefa não concluída cuja Data ficou no passado vai direto para hoje (nunca dia a dia), preservando título, horário, prioridade e estado, sem duplicar — ao abrir o app e com ele aberto. | PRD §4.3 |
| — | Mudar a Data de uma tarefa **arrastando** o cartão para outra coluna, com equivalente completo por teclado e pelo modal. | Epic 4 (Story 4.2 revisada) · AD-6 |
| — | **Migrar** dados do formato antigo (dia da semana) para o novo (data real) sem perda. | PRD §7.1 · AD-2 · Story 5.1 |
| — | **Tema** claro/escuro, persistente, que nunca segue o sistema operacional. | UX `EXPERIENCE.md` Foundation · AD-9 |

## 3. Requisitos não funcionais

- **Persistência:** as tarefas sobrevivem a fechar e reabrir o navegador, sem login (`localStorage`). Falha ao salvar: o estado não muda, o modal fica aberto com erro e com o que foi digitado, sem nova tentativa silenciosa. Falha ao carregar: começa vazio com um aviso único, sem travar. *(PRD §5 · AD-2, AD-4)*
- **Risco de perda de dados:** aviso estático permanente de que os dados ficam só neste navegador/computador; sem backup nem exportação. *(AD-3)*
- **Sem backend, sem infraestrutura própria, sem autenticação;** usuária única. *(PRD §5 · AD-1)*
- **Consistência:** toda mutação de tarefa passa por uma ação que persiste **antes** de alterar o estado; só a camada `src/storage/` toca o `localStorage`; só o `ThemeContext` escreve o tema no DOM. *(AD-4, AD-8, AD-9)*
- **Estado e estilo:** React nativo (`useReducer` + Context), sem biblioteca de estado; CSS Modules + tokens em custom properties. *(AD-5, AD-9)*
- **Acessibilidade (piso):** foco visível em tudo que é interativo; o modal retém o foco, Esc fecha e o foco volta ao controle de origem; toda ação alcançável por teclado; estado e prioridade anunciados por nome; "Excluir tarefa" com rótulo explícito. *(UX `EXPERIENCE.md` Accessibility Floor)*
- **Datas:** dia local do navegador, sem fuso explícito; janela recalculada por um timer de ~60 s. *(AD-10)*

## 4. Regras de negócio principais

1. Toda tarefa pertence a **uma** Data e tem um Estado; Título e Data são obrigatórios.
2. **Ordem no dia = Horário.** Sem Horário → primeiro. Prioridade nunca ordena.
3. **Rollover só para tarefas não concluídas**, direto para hoje. Concluídas nunca rolam, mesmo saindo da tela.
4. **Concluídas fora da janela não são apagadas** — só deixam de aparecer (sem tela de Histórico).
5. **Excluir exige confirmação** e é definitivo.
6. **Nada é gravado sem persistir primeiro:** falha de escrita = tela e dados iguais ao antes.
7. Dados salvos no formato antigo migram para datas reais **dentro da primeira janela** (nunca para uma data já passada).
8. `schemaVersion` desconhecido ou dado ilegível → começa vazio com aviso; nunca lança exceção na abertura.

## 5. Limitações

- Dados só no navegador e no computador em que foram criados; sem sincronização entre dispositivos, sem backup. *(AD-3, PRD §5)*
- Sem cadastro/login, notificações/lembretes, projetos/categorias/tags/subtarefas, colaboração, IA, relatórios/dashboard, tela de Histórico ou grade com eixo de horas. *(PRD §6)*
- A Prioridade é sinalizada só por cor — limitação conhecida e aceita. *(`EXPERIENCE.md`)*
- Desfazer não existe. *(PRD FR-3)*

## 6. Divergências entre os artefatos e o app atual

Não são requisitos novos: são pontos em que o produto entregue vai **além ou ao lado** dos artefatos aprovados, à espera de uma decisão para reconciliar (mudar o artefato ou o código).

| Onde | O artefato diz | O app faz |
|---|---|---|
| Plataforma | PRD §5/§7.2 e `EXPERIENCE.md`: só desktop, sem layout mobile no MVP. | Layout responsivo (7 colunas → 4 → 1) com áreas de toque maiores, a pedido da usuária. |
| Deploy | Spine: "só dev local, sem CI/CD, sem hospedagem" (AD-1, Deferred). | Publicado no GitHub Pages por GitHub Actions; o workflow está configurado para rodar testes unitários e E2E antes do deploy. |
| Arraste | AD-6: `@dnd-kit/react`. | `@dnd-kit/core` (sensor de teclado próprio: `weekKeyboardCoordinates`). |
| Várias abas | Não especificado. | Duas abas abertas se mantêm sincronizadas (evento `storage`). |

## 7. Documentos de origem

- **Produto:** [Brief](_bmad-output/planning-artifacts/briefs/brief-teste%20bmad-2026-09-09/brief.md) · [PRD](_bmad-output/planning-artifacts/prds/prd-teste%20bmad-2026-09-09/prd.md)
- **Especificação:** [SPEC.md](_bmad-output/specs/spec-taskflow/SPEC.md) · [glossário](_bmad-output/specs/spec-taskflow/glossary.md)
- **UX:** [EXPERIENCE.md](_bmad-output/planning-artifacts/ux-designs/ux-teste%20bmad-2026-09-09/EXPERIENCE.md) · [DESIGN.md](_bmad-output/planning-artifacts/ux-designs/ux-teste%20bmad-2026-09-09/DESIGN.md)
- **Arquitetura:** [ARCHITECTURE-SPINE.md](_bmad-output/planning-artifacts/architecture/architecture-teste%20bmad-2026-09-10/ARCHITECTURE-SPINE.md)
- **Mudança de curso (semana dinâmica, horário, prioridade visual):** [sprint-change-proposal-2026-09-18.md](_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-18.md)
- **Épicos e histórias (com critérios de aceite):** [epics.md](_bmad-output/planning-artifacts/epics.md)
- **Especificações por história, retrospectivas e andamento:** [`_bmad-output/implementation-artifacts/`](_bmad-output/implementation-artifacts/) · [sprint-status.yaml](_bmad-output/implementation-artifacts/sprint-status.yaml) · [deferred-work.md](_bmad-output/implementation-artifacts/deferred-work.md)

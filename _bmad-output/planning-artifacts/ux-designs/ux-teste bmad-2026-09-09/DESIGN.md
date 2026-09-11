---
name: TaskFlow
description: Organizador semanal de tarefas pessoais, usuária única, navegador desktop. Clean, calmo, minimalista — sem carga corporativa.
status: final
sources:
  - "{planning_artifacts}/prds/prd-teste bmad-2026-09-09/prd.md"
  - "{planning_artifacts}/briefs/brief-teste bmad-2026-09-09/brief.md"
updated: 2026-09-10
colors:
  surface-base: '#F7F7F5'
  surface-raised: '#FFFFFF'
  ink-primary: '#2B2B28'
  ink-secondary: '#6B6B66'
  border-hairline: '#E5E4E0'
  accent: '#6C7A89'
  priority-high: '#D64545'
  priority-medium: '#E8A33D'
  priority-low: '#4F9D69'
  surface-base-dark: '#1C1C1A'
  surface-raised-dark: '#262624'
  ink-primary-dark: '#EDEDEA'
  ink-secondary-dark: '#A3A39C'
  border-hairline-dark: '#38382F'
  accent-dark: '#8FA3B3'
  priority-high-dark: '#E5716B'
  priority-medium-dark: '#F0BB6B'
  priority-low-dark: '#6FBF8B'
typography:
  heading:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 20px
    fontWeight: '600'
  day-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 13px
    fontWeight: '600'
    letterSpacing: 0.02em
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: '400'
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  column-gap: '{spacing.4}'
components:
  header:
    background: '{colors.surface-base}'
    border-bottom: '{colors.border-hairline}'
    padding: '{spacing.4} {spacing.5}'
  day-column:
    background: 'transparent'
    radius: '{rounded.lg}'
    padding: '{spacing.3}'
    gap: '{spacing.2}'
    today-background: '{colors.accent}' # aplicado a ~8% de opacidade — ver Colors
  task-card:
    background: '{colors.surface-raised}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
    border: '{colors.border-hairline}'
    completed-opacity: '0.55'
  priority-tag:
    high: '{colors.priority-high}'
    medium: '{colors.priority-medium}'
    low: '{colors.priority-low}'
    shape: 'barra lateral de 3px ou pílula pequena — ver Components'
  state-indicator:
    shape: '{rounded.full}'
    size: '18px'
    border: '{colors.ink-secondary}'
    fill-in-progress: '{colors.accent}'
    fill-done: '{colors.ink-secondary}'
  task-modal:
    background: '{colors.surface-raised}'
    radius: '{rounded.lg}'
    overlay: 'rgba(0,0,0,0.4)'
    padding: '{spacing.5}'
  button-primary:
    background: '{colors.accent}'
    text: '{colors.surface-raised}'
    text-weight: '600'
    radius: '{rounded.sm}'
  button-destructive:
    background: '{colors.priority-high}'
    text: '{colors.surface-raised}'
    text-weight: '600'
    radius: '{rounded.sm}'
  theme-toggle:
    icon-color: '{colors.ink-secondary}'
    icon-color-active: '{colors.accent}'
---

# TaskFlow — Design Spine

> Organizador semanal de tarefas pessoais de uma única usuária. Web app desktop, superfície única, sem UI system herdado — componentes próprios e simples. Paleta "Neutro Calmo" escolhida entre 5 variações renderizadas em `.working/color-themes-1.html`. Paired with `EXPERIENCE.md`.

## Brand & Style

TaskFlow não é uma ferramenta de produtividade corporativa — é a agenda semanal de uma pessoa só. A régua de design é: menos do que Notion, menos do que Todoist, o suficiente para ver a semana e nada mais. Nenhum elemento decorativo, nenhuma cor que não carregue significado (prioridade, estado, "hoje").

O registro visual é calmo e levemente neutro-quente — cinzas com uma leve nota terrosa, um único `accent` azul-acinzentado discreto, e as três cores de prioridade como os únicos destaques cromáticos "fortes" da tela, sempre em doses pequenas (uma tag, nunca um card inteiro). Espaço generoso entre colunas e cards é o que faz a semana parecer organizada, não apertada.

## Colors

- **`surface-base`** (`#F7F7F5` claro / `#1C1C1A` escuro) — fundo da aplicação, atrás das colunas de dia.
- **`surface-raised`** (`#FFFFFF` / `#262624`) — superfície dos cards de tarefa e do modal; único degrau de elevação tonal que existe no produto.
- **`ink-primary`** (`#2B2B28` / `#EDEDEA`) — texto de tarefas, títulos, rótulos principais.
- **`ink-secondary`** (`#6B6B66` / `#A3A39C`) — meta-texto: nome do dia, "Nenhuma tarefa", borda do indicador de estado não iniciado.
- **`border-hairline`** (`#E5E4E0` / `#38382F`) — única linha divisória do produto, no contorno sutil dos cards.
- **`accent`** (`#6C7A89` / `#8FA3B3`) — cor de marca única. Dois usos, e só esses dois: (1) botão primário / foco de teclado; (2) destaque da coluna do dia atual ("hoje"), aplicado como um fundo suave (~8% de opacidade) na coluna inteira e uma borda superior sólida — nunca nos dois papéis ao mesmo tempo dentro do mesmo elemento.
- **`priority-high` / `-medium` / `-low`** (`#D64545`/`#E8A33D`/`#4F9D69` claro, `#E5716B`/`#F0BB6B`/`#6FBF8B` escuro) — os únicos indicadores de prioridade. Usados exclusivamente na Tag de Prioridade (nunca pintando o card inteiro, nunca em texto corrido). **Limitação conhecida e aceita** — é o único sinal de prioridade, sem ícone ou letra de apoio — ver `EXPERIENCE.md.Accessibility Floor`.

Evitar: gradientes, sombras coloridas, qualquer cor fora desta lista (sem paleta secundária "decorativa").

**Contraste:** `ink-primary` sobre `surface-base`/`surface-raised` e `ink-secondary` sobre as mesmas superfícies devem atingir no mínimo AA (4.5:1) para texto normal, nos dois temas — são as combinações que carregam todo o texto de tarefa e meta-texto da interface. Conferir os hex exatos na implementação; nenhum deles foi escolhido para ficar abaixo desse piso.

**Limitação conhecida e aceita** — o texto branco sobre `accent`/`priority-high` nos botões (`button-primary`, `button-destructive`) mede ≈4.4:1 em tema claro, pouco abaixo do piso de 4.5:1. Mitigação: rótulo de botão sempre em `fontWeight: 600` (semibold), nunca peso regular. Não estender esses tons a nenhum outro uso de texto sobre cor.

## Typography

Pilha de fontes de sistema (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`) — sem webfont carregada, consistente com a proposta "sem carga desnecessária".

- `heading` — título "TaskFlow" no cabeçalho. Único uso de peso 600 em tamanho grande na aplicação inteira.
- `day-label` — nome do dia da semana no topo de cada coluna (ex. "Quarta-feira"). Levemente espaçado (`letterSpacing`) para funcionar como rótulo, não como frase.
- `body` — nome da tarefa no card, campos do modal. É o tamanho que carrega toda a informação real da tela.
- `meta` — texto secundário: "Nenhuma tarefa", rótulos de campo no modal, texto de confirmação de exclusão.

Sem tamanhos de display, sem uppercase decorativo.

## Layout & Spacing

Escala: `4 / 8 / 12 / 16 / 24 / 32px`. `column-gap` (= `{spacing.4}`) separa as 7 colunas de dia entre si — o espaço mais repetido da tela, por isso nomeado à parte.

A Visão Semanal é uma grade de 7 colunas de largura igual, lado a lado, sem scroll vertical independente por coluna no caso comum (cada coluna cresce com o conteúdo). O Cabeçalho ocupa uma faixa fina no topo, fora da grade. O Modal de Tarefa é a única sobreposição do produto — nunca duas camadas de modal ao mesmo tempo; a confirmação de exclusão é um passo dentro do mesmo modal, não uma segunda janela empilhada.

## Elevation & Depth

TaskFlow usa um único degrau de elevação: `surface-raised` sobre `surface-base`, diferenciado por tom e uma borda `border-hairline` sutil — não por sombra. A única sombra real da interface aparece no Card de Tarefa durante o arraste (`Interaction Primitives` em `EXPERIENCE.md`), como pista física temporária de que o card está "solto", não como recurso decorativo permanente.

## Shapes

`rounded.sm` (8px) em botões e no indicador de estado quando não circular. `rounded.md` (12px) nos Cards de Tarefa. `rounded.lg` (16px) nas Colunas de Dia e no Modal de Tarefa. `rounded.full` no Indicador de Estado (sempre um círculo) e, opcionalmente, na Tag de Prioridade se implementada como pílula. Nada com cantos vivos na interface.

## Components

→ Composition reference: `mockups/key-weekly-view.html` (Coluna do Dia, Card de Tarefa, Tag de Prioridade, Indicador de Estado, Cabeçalho, claro/escuro/arraste), `mockups/key-task-modal.html` (Modal de Tarefa, Confirmação de Exclusão). Spine wins on conflict.

- **Cabeçalho (`header`)** — faixa fina no topo: título "TaskFlow" (`typography.heading`) à esquerda, Alternador de Tema à direita. Único elemento fora da grade de dias.
- **Coluna do Dia (`day-column`)** — nome do dia (`day-label`) no topo; lista de Cards de Tarefa; controle "+ Adicionar tarefa" sempre visível no rodapé. A coluna do dia atual recebe o tratamento `today-background` (ver Colors).
- **Card de Tarefa (`task-card`)** — `surface-raised`, `rounded.md`, borda `border-hairline`. Contém: Indicador de Estado (canto), nome da tarefa (`body`), Tag de Prioridade (quando definida). Tarefa Concluída aplica `completed-opacity` (0.55) ao card inteiro e risca o nome (`text-decoration: line-through`).
- **Tag de Prioridade (`priority-tag`)** — elemento pequeno e discreto (barra lateral fina de 3px ou pílula compacta — implementação livre, desde que nunca ocupe mais do que uma fração pequena do card). Cor = nível de prioridade. Ausente quando a tarefa não tem prioridade definida — nunca um espaço reservado vazio.
- **Indicador de Estado (`state-indicator`)** — círculo pequeno (`rounded.full`, 18px). Pendente: contorno `ink-secondary`, preenchimento vazio. Em andamento: metade preenchida com `accent`. Concluída: preenchido com `ink-secondary` (não usa cor de prioridade nem accent, para não competir com esses dois sinais).
- **Modal de Tarefa (`task-modal`)** — `surface-raised`, `rounded.lg`, sobre overlay escurecido. Dois modos (criação/edição) descritos em `EXPERIENCE.md.Component Patterns`. Botão principal usa `button-primary`; "Excluir tarefa" é um link/texto discreto em `ink-secondary`, nunca um botão de destaque — só a confirmação final usa `button-destructive`.
- **Alternador de Tema (`theme-toggle`)** — ícone sol/lua no Cabeçalho; `icon-color-active` (accent) indica o tema atualmente ativo.
- **Confirmação de Exclusão** — não é um componente à parte, é um passo do próprio Modal de Tarefa: substitui temporariamente o conteúdo do modal por uma pergunta curta (`meta`) e dois botões — "Cancelar" (`ink-secondary`, sem destaque) e "Excluir" (`button-destructive`). Único lugar da interface onde `priority-high` aparece fora de uma Tag de Prioridade.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Cor de prioridade só na Tag de Prioridade, pequena e discreta | Pintar o card inteiro com a cor de prioridade |
| Um único accent (`accent`), para ação primária e destaque de "hoje" | Introduzir uma segunda cor de marca ou cores decorativas |
| Diferenciar Concluída por opacidade + risco no texto | Remover, esmaecer para invisível, ou ocultar a tarefa Concluída |
| Elevação só por tom + borda hairline | Sombras decorativas fora do estado de arraste |
| Espaço generoso entre colunas e cards | Comprimir a grade para caber mais informação |
| Um modal, dois modos (criar/editar), confirmação como passo interno | Empilhar um segundo modal por cima do primeiro |

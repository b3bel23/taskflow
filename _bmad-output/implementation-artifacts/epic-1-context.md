# Epic 1 Context: Fundação — App, Persistência, Semana Vazia e Tema

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Este épico estabelece a fundação sobre a qual todo o resto do TaskFlow é construído. Isabel abre o app e já vê a estrutura da semana inteira (7 dias, estado vazio claro, nunca parecendo erro de carregamento), com a coluna do dia atual destacada visualmente. A persistência de dados funciona desde o início — as tarefas (ainda nenhuma, neste épico) sobrevivem a fechar e reabrir o navegador, sem exigir login, com tratamento explícito de dado ausente ou corrompido. Isabel também pode alternar manualmente entre tema claro e escuro pelo Cabeçalho, com a preferência salva separadamente das tarefas e nunca seguindo a preferência do sistema operacional. O que importa aqui não é só a entrega visível: o padrão de persistência atômica (salvar antes de commitar ao estado) e a separação de camadas (só o storage adapter toca `localStorage`) introduzidos neste épico são o contrato que todos os épicos seguintes (criação/edição/exclusão de tarefas, mudança de estado, arraste) precisam obedecer sem exceção.

## Stories

- Story 1.1: Visualizar a Semana vazia
- Story 1.2: Persistir dados de tarefas entre sessões
- Story 1.3: Alternar entre tema claro e escuro

## Requirements & Constraints

- Os 7 dias da semana (Segunda a Domingo) devem ser visíveis simultaneamente, sem qualquer navegação entre telas.
- Um dia sem tarefas deve comunicar claramente que está vazio ("Nenhuma tarefa", em tom discreto) — nunca deve ser confundido com um erro ou estado de carregamento.
- O controle "+ Adicionar tarefa" fica sempre visível no rodapé de cada coluna, mesmo quando vazia.
- A coluna do dia atual recebe destaque visual distinto das demais.
- Os dados de tarefas devem sobreviver a fechar e reabrir o navegador — sem exigir cadastro ou login (produto single-user; todas as tarefas pertencem implicitamente à única usuária da instalação).
- Falha ao carregar dados salvos nunca pode travar o app (crash) — deve cair graciosamente num estado vazio, com um aviso único e discreto.
- A interface deve exibir um aviso estático informando que os dados ficam salvos apenas neste navegador/computador (não há backup/exportação no MVP).
- A preferência de tema é independente da preferência de tarefas, persiste entre sessões, e nunca deriva da preferência do sistema operacional (`prefers-color-scheme`).

## Technical Decisions

- **Sem backend.** TaskFlow é 100% client-side (SPA React + Vite); nenhum comportamento do MVP depende de servidor, API própria ou infraestrutura remota.
- **Persistência via `localStorage`, duas chaves independentes**, cada uma com seu próprio formato — nunca misturadas:
  - `taskflow:tasks` — sempre `JSON.stringify`/`JSON.parse` de `{ schemaVersion: number, tasks: Task[] }`.
  - `taskflow:theme` — sempre uma **string crua** (`'light'`/`'dark'`), nunca serializada como JSON.
  - Chave ausente (primeira instalação) → estado vazio padrão, sem erro. Chave presente mas ilegível (leitura lança, parse falha, versão de schema não reconhecida) → também cai no estado vazio padrão, mas sinaliza um aviso mostrado **uma única vez** na abertura, distinto do aviso permanente de risco de perda de dados.
  - Tema padrão no primeiro uso é sempre `'light'`.
- **Persistência e commit de estado são atômicos**: toda função de ação tenta a escrita síncrona em `localStorage` primeiro; só em caso de sucesso ela despacha a mudança ao estado React. Falha não muda o estado exibido e retorna um resultado de erro estruturado (nunca lança exceção) para quem chamou.
- **Estado gerenciado via `useReducer` + `Context` nativo do React** — sem biblioteca externa de state management. Um par reducer/context para tarefas, outro para tema.
- **Limite de camada:** só o módulo de storage acessa `window.localStorage` diretamente; componentes e módulos de estado nunca o fazem.
- **Estilo e tema via CSS custom properties**: tokens de design vivem em um arquivo global de CSS, com variantes `-dark` redefinidas sob um seletor de tema no elemento raiz; alternar tema seta apenas um atributo no DOM — a troca visual é 100% CSS, sem re-render de estilos via JS. Cada componente usa CSS Module colocalizado; sem CSS-in-JS/Tailwind.
- **Carregamento inicial é síncrono**: as 7 colunas já aparecem preenchidas (ou vazias) na primeira renderização — não há estado de loading visível a projetar.

## UX & Interaction Patterns

- **Cabeçalho**: faixa fina no topo, título "TaskFlow" à esquerda, Alternador de Tema à direita — único elemento fora da grade de dias.
- **Coluna do Dia (estado vazio)**: texto discreto "Nenhuma tarefa" + controle "+ Adicionar tarefa" sempre visível no rodapé.
- **Destaque do dia atual**: fundo suave em baixa opacidade na coluna inteira mais borda superior sólida — nunca combinado com o outro uso da mesma cor de destaque (botão primário) no mesmo elemento.
- **Alternador de Tema**: ícone sol/lua no Cabeçalho; a cor ativa indica o tema atualmente selecionado; alterna instantaneamente, sem recarregar a página; foco visível quando navegado por teclado.
- **Microcopy**: tom neutro e direto, sem exclamação nem emoji; textos fixados incluem "Adicionar tarefa" e "Nenhuma tarefa".

## Cross-Story Dependencies

- Story 1.1 (semana vazia) depende do comportamento de fallback definido na Story 1.2: sem chave salva ou com chave ilegível, o carregamento deve cair no estado vazio padrão para que a Coluna do Dia possa renderizar "Nenhuma tarefa" corretamente, sem tela de erro.
- O padrão de persistência atômica e a separação de camadas estabelecidos nas Stories 1.2 e 1.3 (guard de salvar-antes-de-commitar, único módulo tocando `localStorage`) são a base estrutural que os Épicos 2, 3 e 4 reutilizam para toda mutação de tarefa (criar, editar, excluir, mudar estado, reordenar por arraste) — nenhum caminho de mutação futuro pode contornar esse contrato.
- O componente Cabeçalho introduzido aqui (hospedando o Alternador de Tema da Story 1.3) é reaproveitado sem alteração pelos épicos seguintes.

---
id: SPEC-taskflow
companions:
  - '../../planning-artifacts/architecture/architecture-teste bmad-2026-09-10/ARCHITECTURE-SPINE.md'
  - '../../planning-artifacts/ux-designs/ux-teste bmad-2026-09-09/DESIGN.md'
  - '../../planning-artifacts/ux-designs/ux-teste bmad-2026-09-09/EXPERIENCE.md'
  - 'glossary.md'
sources:
  - '../../planning-artifacts/prds/prd-teste bmad-2026-09-09/prd.md'
  - '../../planning-artifacts/briefs/brief-teste bmad-2026-09-09/brief.md'
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# TaskFlow

## Why

Isabel concilia tarefas de estudo, trabalho e vida pessoal espalhadas entre anotações soltas, mensagens para si mesma no WhatsApp e apps genéricos — o que gera esquecimentos, prazos perdidos e dificuldade de saber por onde começar o dia. TaskFlow é a vontade de fazer existir um único lugar, organizado pela semana, para uma única usuária (a própria Isabel, que também é PM, UX, arquiteta e desenvolvedora do produto). É simultaneamente um exercício completo de BMAD Method e Spec-Driven Development, do problema ao código, com o mesmo rigor de um produto real.

## Capabilities

- **CAP-1**
  - **intent:** Isabel cria uma tarefa vinculada a uma data específica, com título obrigatório, horário opcional e prioridade opcional.
  - **success:** a tarefa aparece imediatamente na data certa, já ordenada cronologicamente por horário (sem horário primeiro), com Estado inicial sempre Pendente; salvar sem título ou data falha e mantém o formulário aberto sinalizando os campos pendentes.

- **CAP-2**
  - **intent:** Isabel edita título, data, horário e prioridade de uma tarefa existente.
  - **success:** mudar a data move a tarefa para a coluna nova; mudar o horário reposiciona a tarefa cronologicamente; mudar a prioridade não reposiciona a tarefa (atributo visual — CAP-10); título e data continuam obrigatórios para salvar; o Estado não muda por esta ação (ação separada, CAP-4).

- **CAP-3**
  - **intent:** Isabel exclui uma tarefa existente, com confirmação explícita antes da remoção definitiva.
  - **success:** a exclusão só ocorre após confirmar; cancelar mantém a tarefa intacta; sem desfazer nem lixeira no MVP.

- **CAP-4**
  - **intent:** Isabel alterna o Estado de uma tarefa entre Pendente, Em andamento e Concluída, a qualquer momento e em qualquer ordem.
  - **success:** a mudança é refletida imediatamente na tela; qualquer transição é permitida, inclusive voltar de Concluída para um estado anterior.

- **CAP-5**
  - **intent:** Isabel vê, numa única tela, uma janela de 7 dias — hoje e os 6 seguintes — e as tarefas de cada um, sem navegar entre telas. A janela avança automaticamente quando o dia vira, mesmo com o app aberto.
  - **success:** os 7 dias ficam visíveis simultaneamente, sempre com hoje como primeiro; um dia sem tarefas exibe claramente que está vazio, nunca parece erro de carregamento; a janela se atualiza sozinha na virada do dia, sem exigir reload.

- **CAP-6**
  - **intent:** dentro de cada dia, as tarefas são ordenadas automaticamente por Horário (sem horário primeiro, depois ordem crescente), com o nível de prioridade reconhecível visualmente mas sem efeito na ordem; Isabel também pode mudar a data de uma tarefa arrastando o card para a coluna de outro dia, preservando horário e prioridade, com equivalente completo pelo Modal de Tarefa.
  - **success:** ordem cronológica correta dentro do dia; arrastar move a tarefa para a data de destino sem alterar horário nem prioridade; toda mudança de data possível por arraste também é possível pelo modal (nenhuma ação depende exclusivamente de mouse); não há mais reordenação manual dentro do dia (a ordem é sempre derivada do horário).

- **CAP-7**
  - **intent:** tarefas com Estado Concluída permanecem visíveis na sua data, com diferenciação visual clara, enquanto essa data estiver dentro da janela de 7 dias visível.
  - **success:** uma tarefa concluída é reconhecível sem ler o rótulo de Estado; nunca é ocultada ou removida da visualização enquanto sua data está na janela; ao sair da janela, some da tela mas os dados permanecem salvos (sem tela de Histórico — CAP-11 nunca a move).

- **CAP-8**
  - **intent:** os dados das tarefas sobrevivem a fechar e reabrir o navegador, sem login, com aviso de que os dados são locais, tratamento explícito de falha ao salvar/carregar, e migração automática e sem perdas do formato antigo (por dia da semana) para o novo formato (por data real).
  - **success:** reabrir o navegador mostra as mesmas tarefas; falha ao salvar mantém o Modal aberto com erro inline e o que foi digitado preservado (nunca retry silencioso); falha ao carregar cai num estado vazio com aviso único, nunca crash; dados salvos no formato antigo (`schemaVersion: 1`) são migrados automaticamente para o novo formato na primeira abertura após a atualização, sem perder nenhuma tarefa.

- **CAP-9**
  - **intent:** Isabel alterna entre tema claro e escuro manualmente pelo Alternador de Tema no Cabeçalho; a preferência é salva e usada em sessões futuras.
  - **success:** alternância instantânea, sem recarregar a página; o tema nunca segue a preferência do sistema operacional, nem no primeiro uso (padrão é sempre claro).

- **CAP-10**
  - **intent:** Isabel cicla a Prioridade de uma tarefa (Sem prioridade → Baixa → Média → Alta → Sem prioridade) clicando diretamente na Tag de Prioridade do card, sem abrir o Modal de Tarefa.
  - **success:** clique cicla corretamente com wraparound; não abre o Modal; não altera o Estado; a Tag de Prioridade é sempre visível (inclusive sem prioridade definida) para servir de alvo de clique consistente.

- **CAP-11**
  - **intent:** toda tarefa não concluída cuja data já saiu da janela de 7 dias (ficou no passado) é movida automaticamente para hoje, preservando título, horário, prioridade e estado, sem duplicar.
  - **success:** ao abrir o app após dias sem uso, ou durante o uso quando o dia vira, tarefas atrasadas reaparecem em hoje intactas; tarefas concluídas nunca sofrem rollover (permanecem na data original, mesmo fora da janela visível — CAP-7).

## Constraints

- Single-user, sem cadastro/login/autenticação no MVP — todas as tarefas pertencem implicitamente à única usuária da instalação.
- 100% client-side, sem backend/servidor próprio — nenhuma capacidade do MVP exige servidor (ver `ARCHITECTURE-SPINE.md` AD-1).
- ~~Uso previsto só em navegador desktop; sem responsividade mobile nem sincronização entre dispositivos no MVP.~~ **[Decisão original alterada em 2026-09-21]** Layout responsivo (7 → 4 → 1 coluna); sem sincronização entre dispositivos (só entre abas do mesmo navegador).
- Janela de 7 dias sempre ancorada em hoje (hoje + 6 seguintes), nunca uma semana de calendário fixa; sem limite artificial de tarefas por dia.
- Sem mecanismo de backup/exportação de dados no MVP — mitigação do risco de perda de dados é um aviso estático na interface (`ARCHITECTURE-SPINE.md` AD-3), decisão explícita revisitável se o uso real mostrar perda recorrente.
- Stack e regras estruturais definidos em `ARCHITECTURE-SPINE.md` (companion, AD-1..AD-9) — Vite+React+TypeScript client-only, `useReducer`+`Context` nativo, `@dnd-kit/core` para arraste acessível (~~`@dnd-kit/react`~~, trocado em 2026-09-16), `localStorage` via duas chaves independentes. Downstream lê o companion, não reimplementa essas escolhas.

## Non-goals

- Projetos, categorias, tags ou subtarefas.
- Colaboração entre usuários — mesmo a longo prazo.
- Dashboard complexo ou relatórios de progresso.
- Inteligência artificial.
- Notificações ou lembretes.
- Cadastro, login e acesso multi-dispositivo~~/mobile~~ no MVP — adiado para v2, não descartado. *(A parte mobile/responsiva foi entregue em 2026-09-21.)*
- Exportar/importar dados no MVP — decidido na arquitetura, revisitável se o uso real mostrar necessidade.
- Tela/superfície de Histórico de tarefas concluídas fora da janela de 7 dias visível — decisão de 2026-09-18, revisitável se o uso real mostrar necessidade real, não hipotética.
- Grade/visualização com eixo de horas (estilo Google Calendar) — a "experiência de agenda" é resolvida como lista ordenada cronologicamente por horário, decisão de 2026-09-18.

## Success signal

Isabel usa o TaskFlow no seu dia a dia real (não só em teste) e todas as 11 capacidades (CAP-1..CAP-11) funcionam corretamente de ponta a ponta. Contra-métrica: o número de funcionalidades adicionadas além deste escopo sem necessidade real comprovada no uso diário não deve crescer — critério qualitativo, consistente com um projeto pessoal e de aprendizado, sem métricas de adoção.

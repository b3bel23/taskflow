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
  - **intent:** Isabel cria uma tarefa vinculada a um dia da semana, com título obrigatório e prioridade opcional.
  - **success:** a tarefa aparece imediatamente no dia certo, já ordenada por prioridade, com Estado inicial sempre Pendente; salvar sem título ou dia falha e mantém o formulário aberto sinalizando os campos pendentes.

- **CAP-2**
  - **intent:** Isabel edita título, dia da semana e prioridade de uma tarefa existente.
  - **success:** mudar o dia move a tarefa para a coluna nova; título e dia continuam obrigatórios para salvar; o Estado não muda por esta ação (ação separada, CAP-4).

- **CAP-3**
  - **intent:** Isabel exclui uma tarefa existente, com confirmação explícita antes da remoção definitiva.
  - **success:** a exclusão só ocorre após confirmar; cancelar mantém a tarefa intacta; sem desfazer nem lixeira no MVP.

- **CAP-4**
  - **intent:** Isabel alterna o Estado de uma tarefa entre Pendente, Em andamento e Concluída, a qualquer momento e em qualquer ordem.
  - **success:** a mudança é refletida imediatamente na tela; qualquer transição é permitida, inclusive voltar de Concluída para um estado anterior.

- **CAP-5**
  - **intent:** Isabel vê, numa única tela, os 7 dias da semana e as tarefas de cada um, sem navegar entre telas.
  - **success:** os 7 dias ficam visíveis simultaneamente; um dia sem tarefas exibe claramente que está vazio, nunca parece erro de carregamento.

- **CAP-6**
  - **intent:** dentro de cada dia, as tarefas são ordenadas automaticamente por Prioridade (Alta→Média→Baixa→sem prioridade), com o nível reconhecível visualmente; dentro do mesmo nível, Isabel reordena manualmente por arraste, com equivalente completo pelo Modal de Tarefa.
  - **success:** ordem de exibição correta por nível; reordenar dentro do nível persiste entre sessões; toda mudança de prioridade ou dia possível por arraste também é possível pelo modal (nenhuma ação depende exclusivamente de mouse).

- **CAP-7**
  - **intent:** tarefas com Estado Concluída permanecem visíveis no seu dia, com diferenciação visual clara.
  - **success:** uma tarefa concluída é reconhecível sem ler o rótulo de Estado; nunca é ocultada ou removida da visualização do dia.

- **CAP-8**
  - **intent:** os dados das tarefas sobrevivem a fechar e reabrir o navegador, sem login, com aviso de que os dados são locais e tratamento explícito de falha ao salvar/carregar.
  - **success:** reabrir o navegador mostra as mesmas tarefas; falha ao salvar mantém o Modal aberto com erro inline e o que foi digitado preservado (nunca retry silencioso); falha ao carregar cai num estado vazio com aviso único, nunca crash.

- **CAP-9**
  - **intent:** Isabel alterna entre tema claro e escuro manualmente pelo Alternador de Tema no Cabeçalho; a preferência é salva e usada em sessões futuras.
  - **success:** alternância instantânea, sem recarregar a página; o tema nunca segue a preferência do sistema operacional, nem no primeiro uso (padrão é sempre claro).

## Constraints

- Single-user, sem cadastro/login/autenticação no MVP — todas as tarefas pertencem implicitamente à única usuária da instalação.
- 100% client-side, sem backend/servidor próprio — nenhuma capacidade do MVP exige servidor (ver `ARCHITECTURE-SPINE.md` AD-1).
- Uso previsto só em navegador desktop; sem responsividade mobile nem sincronização entre dispositivos no MVP.
- Semana exibida de segunda a domingo; sem limite artificial de tarefas por dia.
- Sem mecanismo de backup/exportação de dados no MVP — mitigação do risco de perda de dados é um aviso estático na interface (`ARCHITECTURE-SPINE.md` AD-3), decisão explícita revisitável se o uso real mostrar perda recorrente.
- Stack e regras estruturais definidos em `ARCHITECTURE-SPINE.md` (companion, AD-1..AD-9) — Vite+React+TypeScript client-only, `useReducer`+`Context` nativo, `@dnd-kit/react` para arraste acessível, `localStorage` via duas chaves independentes. Downstream lê o companion, não reimplementa essas escolhas.

## Non-goals

- Projetos, categorias, tags ou subtarefas.
- Colaboração entre usuários — mesmo a longo prazo.
- Dashboard complexo ou relatórios de progresso.
- Inteligência artificial.
- Notificações ou lembretes.
- Cadastro, login e acesso multi-dispositivo/mobile no MVP — adiado para v2, não descartado.
- Exportar/importar dados no MVP — decidido na arquitetura, revisitável se o uso real mostrar necessidade.

## Success signal

Isabel usa o TaskFlow no seu dia a dia real (não só em teste) e todas as 9 capacidades (CAP-1..CAP-9) funcionam corretamente de ponta a ponta. Contra-métrica: o número de funcionalidades adicionadas além deste escopo sem necessidade real comprovada no uso diário não deve crescer — critério qualitativo, consistente com um projeto pessoal e de aprendizado, sem métricas de adoção.

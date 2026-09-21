# TaskFlow v1.0.0 — notas de release

> **RASCUNHO.** Preparado para revisão. A tag e o release só serão criados depois que o CI passar no GitHub.

**App:** https://b3bel23.github.io/taskflow/ · **Requisitos:** [`REQUIREMENTS.md`](../REQUIREMENTS.md) · **Licença:** MIT

TaskFlow é um organizador semanal de tarefas pessoais que roda 100% no navegador: hoje e os 6 dias seguintes lado a lado, com horário, prioridade e estado por tarefa. Sem cadastro, sem servidor.

## O que a v1.0.0 entrega

- **Janela de 7 dias ancorada em hoje**, que avança sozinha na virada do dia, mesmo com a aba aberta.
- **Rollover automático:** tarefas não concluídas de dias passados voltam para hoje; as concluídas ficam onde estão.
- **Criar, editar e excluir** tarefas (a exclusão pede confirmação), com **horário opcional** e **prioridade** opcional.
- **Ordem por horário** dentro do dia (sem horário primeiro); a prioridade é só um rótulo visual, clicável para ciclar.
- **Estado de progresso** (Pendente, Em andamento, Concluída) pelo indicador do cartão; concluídas ficam riscadas e esmaecidas.
- **Arrastar e soltar** um cartão para outro dia, com mouse ou pelo teclado.
- **Persistência local** com migração automática do formato antigo (por dia da semana) para datas reais, sem perda de tarefas.
- **Tema claro/escuro**, persistente. **Layout responsivo** (7 colunas, 4 em tablet, 1 no celular).
- **Várias abas** se mantêm sincronizadas.

## Qualidade

- Cerca de **400 testes unitários** e **60 testes E2E** em Chrome real (fusos e horário de verão, virada de dia, virada de mês/ano e ano bissexto, dados corrompidos, falhas de escrita, duas abas, arraste).
- O deploy no GitHub Pages só acontece se testes unitários, build e E2E passarem.
- Regras de arquitetura (só a camada de storage acessa `localStorage`, só um módulo escreve o tema) são verificadas por teste.

## Corrigido durante o endurecimento para a v1.0

- **Arraste por teclado entre dias não funcionava:** as setas nunca moviam o cartão. Corrigido, com teste em navegador real (desktop e celular).
- **Duas abas** se sobrescreviam sem aviso; agora acompanham uma à outra.
- Um **horário fora de `HH:mm`** podia ser gravado e depois fazer o app descartar todas as tarefas; agora é recusado na escrita.
- Criar tarefa **falhava fora de contexto seguro** (http por IP da rede); agora usa um gerador de id alternativo.
- Rollover e janela: corrigidos casos de `order` repetido, data passada salva por um modal aberto na virada do dia e falha de escrita silenciosa.

## Limitações conhecidas

- Os dados ficam **só no navegador e no computador** onde foram criados; não há sincronização entre dispositivos nem backup. O app avisa isso na tela.
- Não há desfazer.
- Os anúncios de leitor de tela do arraste usam o texto padrão da biblioteca (em inglês).
- **Ainda não verificado em aparelho real:** arraste por toque num celular, uso com leitor de tela e o job de E2E no CI do GitHub (só rodou localmente).

## Atualizando

Quem já usava o app não precisa fazer nada: os dados salvos no formato antigo são migrados sozinhos na primeira abertura.

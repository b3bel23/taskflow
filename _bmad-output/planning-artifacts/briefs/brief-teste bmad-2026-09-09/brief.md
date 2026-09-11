---
title: "Product Brief: TaskFlow"
status: ready
created: 2026-09-09
updated: 2026-09-09
---

# Product Brief: TaskFlow

## Sumário Executivo

TaskFlow é um organizador semanal de tarefas pessoais. A tela principal mostra os dias da semana lado a lado, e cada tarefa é criada vinculada a um dia específico, com uma prioridade (Baixa, Média ou Alta) e um estado de progresso (Pendente, Em andamento, Concluída).

O projeto nasce de uma necessidade real e concreta: a usuária concilia estudo, trabalho e vida pessoal, e hoje mantém suas tarefas espalhadas entre anotações, mensagens para si mesma no WhatsApp e aplicativos soltos — o que gera esquecimentos, prazos perdidos e dificuldade de saber por onde começar o dia. O TaskFlow resolve isso centralizando as tarefas em uma única visão semanal, simples e sem fricção.

Este é também um projeto de aprendizado prático: percorrer o BMAD Method e o Spec-Driven Development do zero — da descoberta do problema até o código — mantendo o rigor de um produto real, mas com escopo deliberadamente pequeno. O critério de sucesso não é adoção de mercado; é a usuária conseguir usar o TaskFlow no seu dia a dia real e o processo BMAD/SDD ter sido seguido de ponta a ponta.

## O Problema

A usuária lida diariamente com tarefas de naturezas diferentes — estudo, trabalho, vida pessoal — e hoje não tem um lugar único para organizá-las. As tarefas ficam espalhadas em anotações soltas, lembretes que ela manda para si mesma no WhatsApp e aplicativos simples de tarefas, sem integração entre eles.

Essa fragmentação gera um problema central: **falta de visão clara e centralizada da semana**. Mesmo sabendo que tem várias coisas para fazer, é difícil visualizar rapidamente o que está pendente, o que já está em andamento, o que foi concluído e o que é mais importante em meio a tudo isso.

O custo concreto de não resolver isso: tarefas esquecidas, prazos perdidos e a sensação de não saber por onde começar quando há muita coisa espalhada em lugares diferentes.

## A Solução

O TaskFlow organiza as tarefas em torno da unidade que mais importa para esse problema: **a semana**. A tela principal apresenta os dias da semana, e cada tarefa é criada já vinculada a um dia.

Dentro de cada dia, duas informações tornam a priorização visual e imediata:

- **Prioridade** (Baixa / Média / Alta) — sinalização simples do que merece mais atenção, sem sistema de pontuação complexo.
- **Estado de progresso** (Pendente / Em andamento / Concluída) — para diferenciar o que ainda não foi iniciado, o que está em curso e o que já foi resolvido.

O conjunto de funcionalidades do MVP é intencionalmente enxuto: criar, editar e excluir tarefas, e alternar seu estado — o suficiente para que a usuária veja, todos os dias, exatamente o que precisa fazer e o que já fez.

## O Que Torna Isso Diferente

O TaskFlow não compete com ferramentas robustas como Todoist, Trello ou Notion — não é essa a proposta. O diferencial é ser deliberadamente simples e recortado exatamente para a necessidade real da usuária: uma visão semanal, sem fricção de configuração, sem recursos que ela não pediu.

O segundo diferencial é o processo: o TaskFlow serve como exercício completo de BMAD Method e Spec-Driven Development, do problema ao código, com a mesma disciplina que se aplicaria a um produto real.

## Quem Isso Serve

**Persona primária**: a própria usuária — alguém que concilia múltiplas responsabilidades (estudo, trabalho e vida pessoal) e precisa de uma forma simples de ver, em um único lugar, o que tem para fazer durante a semana, sem depender de anotações soltas, mensagens para si mesma ou aplicativos genéricos demais.

Não há personas secundárias no MVP — o TaskFlow é construído para um único usuário real, que também é quem está definindo e validando o produto.

## Critérios de Sucesso

Como este é um projeto de uso pessoal e de aprendizado, os critérios de sucesso são qualitativos, não métricas de produto:

**Sucesso do produto:**
- A usuária consegue utilizar o TaskFlow no seu dia a dia real e validar, na prática, que ele funciona de ponta a ponta conforme o escopo definido neste brief.
- As funcionalidades previstas (criar, editar, excluir, mudar estado, visualizar por dia e por prioridade) funcionam corretamente.
- Não há necessidade de lançamento público nem de validação por outras pessoas.

**Sucesso do aprendizado:**
- A usuária completa as etapas do BMAD Method e do Spec-Driven Development.
- A usuária entende, na prática, como a especificação orienta a implementação.

Métricas quantitativas de usuários, retenção ou adoção estão fora do escopo — não fazem sentido para este projeto.

## Escopo

**Dentro do MVP:**
- Exibir tela principal com os dias da semana visíveis
- Criar tarefa vinculada a um dia, com prioridade (Baixa / Média / Alta)
- Editar tarefa
- Excluir tarefa
- Alterar o estado da tarefa (Pendente / Em andamento / Concluída)
- Visualizar claramente tarefas pendentes, em andamento e concluídas

**Fora do MVP (explicitamente adiado ou descartado):**
- Cadastro e login (adiado — ver Visão)
- Projetos, categorias, tags, subtarefas
- Colaboração entre usuários
- Dashboard complexo / relatórios de progresso
- Inteligência artificial
- Notificações e lembretes

**Expectativas não funcionais do MVP:**
- **Persistência**: os dados das tarefas devem continuar salvos entre sessões — fechar e reabrir o navegador não pode apagar as tarefas, mesmo sem login.
- **Dispositivo**: uso previsto apenas em navegador desktop (computador). Acesso via navegador mobile ou por múltiplos dispositivos não é necessário no MVP — a usuária reconhece que esse cenário só faria sentido com login, o que fica para uma versão futura.

## Visão

Se o TaskFlow evoluir além do MVP, os próximos passos naturais, na ordem em que fazem sentido, são:

1. **Cadastro e login**, permitindo múltiplas contas e persistência individual por usuário.
2. **Acesso multi-dispositivo**, incluindo uso confortável pelo celular (não necessariamente um app nativo — inicialmente poderia ser web responsivo).
3. Eventualmente, **notificações e lembretes**.

Não há intenção, mesmo no longo prazo, de transformar o TaskFlow em uma ferramenta de colaboração ou gestão de equipes — ele permanece um produto de organização pessoal.

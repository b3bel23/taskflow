---
title: "Addendum: TaskFlow Product Brief"
related_brief: "brief.md"
created: 2026-09-09
updated: 2026-09-09
---

# Addendum: TaskFlow

Conteúdo de apoio ao brief — contexto e decisões de escopo que não pertencem ao brief final, mas são úteis para as próximas etapas (PRD, arquitetura).

## Evolução do escopo durante a descoberta

A ideia inicial discutida era um gerenciador de tarefas mais genérico, centrado em "centralizar tarefas e ver o que está pendente/em andamento/concluído", sem uma unidade organizadora específica. Durante a conversa, a usuária percebeu que essa direção estava maior e mais vaga do que o produto que realmente imaginava. Ela então pivotou para um conceito mais concreto: **organização semanal**, inspirada conceitualmente (não visualmente) em uma agenda semanal simples, com os dias da semana como eixo principal da tela.

Esse pivô reduziu significativamente o escopo e deu ao MVP uma unidade de organização clara (o dia da semana), em vez de uma lista genérica de tarefas.

## Alternativas consideradas e descartadas

**Estados da tarefa — 2 vs. 3 estados.**
Foi considerado simplificar para apenas "Pendente / Concluída" (2 estados), já que a lista de escopo revisada não mencionava mais "Em andamento". A usuária optou por manter os 3 estados (Pendente / Em andamento / Concluída), avaliando que o estado intermediário agrega valor real sem adicionar complexidade significativa.

**Cadastro/login no MVP.**
Cadastro e login chegaram a fazer parte da primeira versão do escopo revisado, mas por um motivo pouco examinado ("parece comum em aplicações desse tipo"), não por necessidade real. Ao ser questionada diretamente, a usuária confirmou que não há necessidade de autenticação no MVP e optou por adiar esse recurso para uma versão futura, mantendo o MVP single-user. Essa foi uma decisão consciente de redução de escopo, não um esquecimento.

**Mecanismo de prioridade.**
Foi cogitado descartar qualquer mecanismo de priorização no MVP, já que a versão inicial da lista de escopo revisada não o incluía. A usuária optou por mantê-lo, mas de forma bem simples (3 níveis: Baixa/Média/Alta, sinalização visual, sem pontuação), para não perder a capacidade de diferenciar o que é mais importante dentro de cada dia.

## Restrições técnicas para arquitetura

As restrições abaixo não são decisões de arquitetura em si — são condicionantes a considerar na etapa seguinte.

- Os dados precisam persistir entre sessões do navegador mesmo sem conta de usuário — ou seja, o MVP não pode ficar "sem persistência nenhuma" (ex.: estado apenas em memória). A forma exata de persistência (armazenamento local no navegador, backend com identificador implícito, etc.) fica para a etapa de arquitetura.
- O uso é previsto apenas em navegador desktop; não há requisito de responsividade mobile nem de sincronização entre dispositivos no MVP. Esse ponto é explicitamente revisitado na Visão do brief como próximo passo natural, condicionado à introdução de login.

## Persona — nota de contexto

A persona descrita no brief ("pessoa com múltiplas responsabilidades pessoais e de estudo/trabalho") não é uma persona de mercado abstrata — é a própria usuária, que testará o TaskFlow no seu dia a dia. Isso foi confirmado explicitamente durante a descoberta e deve ser levado em conta em qualquer decisão de UX futura: o produto pode (e deve) ser calibrado para o caso de uso real dela, sem necessidade de generalizar para outros perfis não validados.

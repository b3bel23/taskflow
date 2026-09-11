---
title: "Reconciliação de Input — Addendum do Brief vs. PRD"
input: "addendum.md (brief-teste bmad-2026-09-09)"
target: "prd.md (prd-teste bmad-2026-09-09)"
created: 2026-09-09
---

# Reconciliação: addendum.md → prd.md

**Input analisado:** `_bmad-output/planning-artifacts/briefs/brief-teste bmad-2026-09-09/addendum.md`

## Lacunas encontradas

### 1. Racional da decisão "3 estados vs. 2 estados" não documentado
O addendum registra que foi cogitado reduzir para 2 estados (Pendente/Concluída) e que a usuária optou por manter 3 porque "o estado intermediário agrega valor real sem adicionar complexidade significativa". O PRD reflete corretamente o resultado (Glossário §3, FR-4), mas não preserva esse racional em lugar nenhum. Se a decisão for questionada futuramente (ex.: durante arquitetura ou uma revisão de escopo), o motivo de rejeitar a alternativa mais simples se perde. Candidato natural para um addendum.md do próprio PRD.

### 2. Racional da decisão "manter mecanismo de prioridade" não documentado
Semelhante ao item 1: o addendum registra que descartar priorização foi cogitado (a lista de escopo revisada não a incluía) e que foi mantida, deliberadamente simples (3 níveis, sem pontuação), para não perder a capacidade de diferenciar importância dentro do dia. O PRD reflete o resultado (FR-6, Glossário), mas não o fato de que essa era uma alternativa ativamente descartada, nem o porquê.

### 3. Pivô conceitual do produto (gerenciador genérico → organização semanal) ausente do PRD
O addendum descreve que a ideia inicial era um gerenciador de tarefas genérico sem unidade organizadora, e que o pivô para "semana com dias como eixo principal" foi o que reduziu o escopo e deu ao MVP sua unidade clara. O PRD (Vision, §1) apresenta a organização semanal como dado, sem registrar que essa era uma escolha deliberada sobre uma alternativa mais ampla e vaga que foi descartada. Não afeta requisitos, mas é contexto relevante para quem revisitar o "porquê" da unidade "dia da semana" em vez de uma lista de tarefas genérica extensível — especialmente útil para a etapa de arquitetura entender que a rigidez da unidade organizadora é intencional, não uma limitação técnica.

## Itens verificados e considerados bem cobertos (sem lacuna)

- **Cadastro/login no MVP**: decisão e racional bem refletidos — o PRD não só registra "sem autenticação" (NFR §5) como referencia explicitamente o padrão "parece comum em produtos desse tipo" no counter-metric SM-C1.
- **Persona = a própria usuária**: nota do addendum está quase verbatim refletida em §2.1 do PRD ("não há necessidade de generalizar para outros perfis não validados").
- **Restrições técnicas para arquitetura** (persistência, desktop-only): corretamente presentes no PRD (§5 NFRs) e deliberadamente não detalhadas quanto ao mecanismo exato — isso é por design, não lacuna.

## Conclusão

O PRD reflete corretamente todas as decisões de escopo do addendum, mas perde o racional por trás de duas alternativas descartadas (2-estados, remover prioridade) e o contexto do pivô conceitual original do produto — conteúdo que vale preservar em um addendum.md do próprio PRD, não no corpo do PRD.

---
title: "Reconciliação de Input — Brief vs PRD (TaskFlow)"
created: 2026-09-09
---

# Reconciliação de Input: Brief → PRD

**Input original:** `_bmad-output/planning-artifacts/briefs/brief-teste bmad-2026-09-09/brief.md`
**Documento produzido:** `_bmad-output/planning-artifacts/prds/prd-teste bmad-2026-09-09/prd.md`

## Lacunas Identificadas

### 1. Prioridade deixou de ser obrigatória na criação, sem essa mudança ser sinalizada como decisão

**Trecho do brief (Sumário Executivo):**
> "cada tarefa é criada vinculada a um dia específico, com uma prioridade (Baixa, Média ou Alta) e um estado de progresso (Pendente, Em andamento, Concluída)."

**Trecho do brief (Escopo, "Dentro do MVP"):**
> "Criar tarefa vinculada a um dia, com prioridade (Baixa / Média / Alta)"

Em nenhum desses trechos o brief menciona a possibilidade de a tarefa não ter prioridade — a leitura natural é que toda tarefa nasce com uma das três prioridades definidas. O PRD (FR-1 e Glossário §3) introduz um quarto estado, "sem prioridade definida", e torna o campo opcional na criação ("se não escolhida, a Tarefa fica sem prioridade definida — não há valor padrão atribuído automaticamente"). Essa é uma mudança de comportamento testável (afeta inclusive a ordenação em FR-6, que passa a ter 4 níveis em vez de 3) e não está listada no Assumptions Index (§10) do PRD, onde decisões desse tipo deveriam aparecer explicitamente. A lacuna não é a ideia em si (pode ser uma melhoria razoável), mas o fato de ela alterar silenciosamente um requisito que o brief apresentava como certo, sem rastreabilidade da decisão.

### 2. "Priorização visual e imediata" foi reduzida a ordenação, sem exigir que o nível de prioridade seja visível

**Trecho do brief (A Solução):**
> "Dentro de cada dia, duas informações tornam a priorização visual e imediata: **Prioridade** (Baixa / Média / Alta) — sinalização simples do que merece mais atenção, sem sistema de pontuação complexo."

O brief descreve a prioridade como uma "sinalização" que deve ser "visual e imediata" — ou seja, a usuária deve conseguir ver de relance qual o nível de prioridade de cada tarefa. No PRD, a única Requisito Funcional que trata de prioridade na visualização é o FR-6 ("Ordenar tarefas por prioridade dentro do dia"), que garante apenas a ordem de exibição (Alta → Média → Baixa → sem prioridade). Não há nenhum FR que exija que o nível de prioridade seja visivelmente rotulado/sinalizado na tarefa (cor, ícone, badge etc.) — diferente do que acontece com o Estado, que tem um FR dedicado à diferenciação visual (FR-7). Uma implementação que apenas ordenasse as tarefas sem mostrar a prioridade de cada uma satisfaria o FR-6 ao pé da letra, mas não cumpriria a intenção qualitativa do brief de "sinalização visual". Esse é exatamente o tipo de nuance qualitativa que a estrutura de FRs "engoliu" ao traduzir "sinalização visual e imediata" apenas em regra de ordenação.

### 3. Critério de sucesso "não precisa de lançamento público nem validação por terceiros" não aparece no PRD

**Trecho do brief (Critérios de Sucesso):**
> "Não há necessidade de lançamento público nem de validação por outras pessoas."

Esse é um critério de sucesso explícito no brief — define o que *não* é necessário para o projeto ser considerado bem-sucedido. A seção 8 (Success Metrics) do PRD lista SM-1, SM-2 e SM-3, todos girando em torno do uso real por Isabel e da conclusão do processo BMAD/SDD, mas nenhum deles reafirma essa negativa explícita. A ideia é parcialmente inferível de outros trechos (§2.1: "não há necessidade de generalizar para outros perfis não validados"), mas a formulação específica sobre dispensa de lançamento público/validação externa como parte do critério de sucesso do produto não foi transposta, nem de forma equivalente, para o PRD.

## Conclusão

O PRD reflete fielmente a maior parte do escopo, das exclusões e do tom de simplicidade do brief, mas contém uma mudança de comportamento não rastreada (prioridade opcional) e duas nuances qualitativas — sinalização visual da prioridade e dispensa explícita de validação externa — que a estrutura de FRs e métricas não capturou de forma equivalente.

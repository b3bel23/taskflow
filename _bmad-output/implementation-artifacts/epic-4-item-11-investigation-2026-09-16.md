---
item: epic-4-retro-item-11
date: 2026-09-16
status: done — resolvido por migração estrutural para `@dnd-kit/core`+
  `@dnd-kit/sortable` (pacotes clássicos/estáveis), eliminando a causa raiz
  (mutação imperativa de DOM concorrendo com a fiber tree do React); 6
  tentativas de patch interno no `@dnd-kit` pre-1.0 foram tentadas e
  descartadas antes disso; validado em navegador real (teclado, mouse,
  mesmo grupo, cruzamento de dia/prioridade, foco, persistência, ausência
  de removeChild) e via 234/234 testes automatizados
related: _bmad-output/implementation-artifacts/epic-4-retro-2026-09-15.md
---

# Investigação — epic-4-retro-item-11 (drag por teclado no grid 2D)

Continuação da investigação de causa raiz do `NotFoundError: removeChild` /
perda de foco / tela em branco ao arrastar entre dias/prioridades (relatada
inicialmente em `epic-4-retro-2026-09-15.md`). Ao todo, quatro correções
foram tentadas nesta linha de investigação, **as quatro descartadas** —
nenhum código de produto foi mantido no repositório ao final de nenhuma
delas; só este registro e a correção já fechada do `epic-3-retro-item-7`
(não relacionada) permanecem. As duas primeiras tentativas (Opção A e o
fork `SafeOptimisticSortingPlugin`) estão documentadas nas seções abaixo. A
terceira (`feedback: 'none'`) e a quarta (`feedback: 'move'`) estão
registradas nas seções "Atualização" ao final deste documento.

## Causa raiz revisada

**Hipótese original (sessão anterior):** o crash só acontecia ao cruzar de
grupo (dia/prioridade), porque `OptimisticSortingPlugin` (`@dnd-kit`) usa
`insertAdjacentElement` para reparentar o `<li>` real de uma sub-árvore
React (`DayColumn` de origem) para outra (`DayColumn` de destino) — e essa
divergência entre o DOM real e a árvore de fibers do React é o que
`removeChild` não perdoa.

**Hipótese revisada, confirmada nesta sessão:** o reparenting entre
`DayColumn`s diferentes é *um* gatilho, mas não o único. `useSortable`
(`@dnd-kit/react`) assina as propriedades reativas do `sortable`
(`isDragging`, `isDropTarget`, `isDropSource`, `group`, `index`, via
`useDeepSignal`) e força um re-render do React **sempre que qualquer uma
delas muda — em qualquer arraste ativo, mesmo dentro do mesmo grupo**,
independente de `state.tasks` (que só muda no drop confirmado). Como
`OptimisticSortingPlugin` também mexe fisicamente no DOM (`reorder()` via
`insertAdjacentElement`) a cada `dragover` — inclusive para reordenar
irmãos dentro do *mesmo* `<ul>` — existe uma janela em que o React tenta
reconciliar essa subárvore (por causa do re-render reativo) enquanto o DOM
real já foi mexido por fora do seu controle. A causa real é essa corrida
genérica entre "React re-renderiza reativamente" e "`@dnd-kit` já mexeu no
DOM", não especificamente "cruzou de grupo" — cruzar grupo é só o caso mais
fácil de expor o problema, não o único.

## Evidências do crash também no mesmo grupo

Teste controlado, devagar, sem repetição rápida de teclas (para descartar
corrida causada pela própria velocidade do teste):

1. Seed: 2 tarefas, `Tarefa A` (order 0) e `Tarefa B` (order 1), mesmo
   `(day: 'mon', priority: 'high')`.
2. Foco na alça de `Tarefa A` (`.focus()`), despacho de `keydown Enter`
   (pickup) — confirmado ativo (zona vazia mostrando `<span>` do rótulo,
   only-during-drag).
3. Espera de 400ms.
4. Despacho de **uma única** `keydown ArrowDown` — espera de 500ms antes de
   checar qualquer coisa.
5. Resultado: **console mostrou o mesmo `NotFoundError: Failed to execute
   'removeChild' on 'Node': The node to be removed is not a child of this
   node.`**, com a mesma pilha interna do React
   (`commitDeletionEffectsOnFiber`/`commitMutationEffectsOnFiber`/
   `flushMutationEffects`/`commitRoot`) já vista na investigação original —
   confirmando que é exatamente a mesma classe de falha, agora disparada
   sem nunca cruzar de dia/prioridade.
6. Também observado, no mesmo teste: um nó DOM **duplicado** da mesma
   tarefa (`"AltaTarefa A"` aparecendo duas vezes na lista de `<li>` da
   coluna de Segunda-feira) e **perda de foco para `<body>`** já antes do
   crash — os mesmos dois sintomas colaterais da investigação original,
   agora no caminho que se assumia seguro.

## Opção A descartada — desabilitar `OptimisticSortingPlugin` inteiro

**O que foi tentado:** `plugins: () => [SortableKeyboardPlugin]` em ambos
os `useSortable()` de `DayColumn.tsx` — remove o plugin inteiro, mantendo
só o sensor de colisão/movimento do teclado.

**Por que foi descartada:** eliminou o crash de fato (confirmado em
navegador real, foco preservado, sem `removeChild`), mas **quebrou a
reordenação em si** — tanto dentro do mesmo grupo (Story 4.1) quanto entre
grupos (Story 4.2) pararam de persistir qualquer mudança. Causa: o helper
`move()` de `@dnd-kit/helpers` (usado por `resolveWeekDragChange`,
`dragChange.ts`) lê `source.index` para decidir a posição de destino — essa
propriedade só é atualizada reativamente pelo próprio
`OptimisticSortingPlugin` (dentro do `batch()` que ele executa a cada
`dragover`). Sem o plugin, `source.index` fica congelado no valor inicial,
e `move()` sempre calcula um no-op. Ou seja: o plugin não é só cosmético —
é também a fonte de verdade da reindexação reativa que a lógica de decisão
já existente depende. Revertida imediatamente ao ser descoberto.

## Fork `SafeOptimisticSortingPlugin` descartado — por quê

**O que foi tentado:** fork mínimo do `OptimisticSortingPlugin` original
(copiado linha a linha do código-fonte do `@dnd-kit`), mantendo a
reindexação reativa (`batch()`) incondicional nos dois casos, mas
condicionando a chamada real de `reorder()`/`insertAdjacentElement` a
`if (sameGroup)` — a premissa era que reordenar dentro do mesmo `<ul>`
nunca reparenta para outra sub-árvore React, logo seria inerentemente
seguro (e é exatamente o que a Story 4.1 já usa e testa há 2 épicos sem
problema conhecido).

**Por que foi descartado:** build e os 235 testes automatizados passaram
limpos; em navegador real, o cruzamento de grupo parou de crashar (foco
preservado, sem `removeChild`) — mas o teste do caminho "mesmo grupo",
feito com cuidado extra (ver seção de evidências acima), reproduziu o
**mesmo crash que a correção deveria ter deixado intocado e seguro**. Isso
invalida a premissa central do fork: "mesmo pai = sempre seguro" está
errada — o gatilho real é mais amplo (qualquer re-render reativo do
`@dnd-kit` durante um arraste ativo, combinado com qualquer mutação
imperativa do DOM pelo mesmo plugin, é uma corrida em potencial,
independente de cruzar grupo ou não). Revertido imediatamente
(`git checkout` nos 3 arquivos tocados + remoção do novo arquivo de
plugin); build e 235 testes confirmados de volta ao estado limpo antes de
encerrar.

## Limitações encontradas na validação do navegador

- No meio da sessão, o despacho de teclas via `computer.key` (extensão
  `claude-in-chrome`, CDP) parou de acionar de forma confiável o pickup de
  arraste por teclado do `@dnd-kit` — confirmado com um teste de controle
  usando o `DayColumn.tsx` **100% original, sem nenhuma mudança desta
  sessão**, que também falhou em iniciar o arraste. Isso prova que foi
  degradação da entrega de eventos desta sessão do navegador, não
  regressão de código.
- Capturas de tela/zoom deram timeout intermitente (`Renderer may be
  frozen or unresponsive`) várias vezes ao longo da sessão.
- Para continuar testando, troquei para despachar `KeyboardEvent` via
  JavaScript diretamente (não confiável/sintético) — foi esse método mais
  direto que revelou o crash no caminho "mesmo grupo". A evidência do
  crash em si (stack trace real do React, no console) é sólida
  independente do método de disparo; mas a frequência/timing exatos desse
  crash numa interação 100% real de usuária (mouse ou teclado físico,
  sem CDP no meio) não foi plenamente caracterizada.
- Só havia um navegador Chrome conectado nesta sessão (`list_connected_browsers`
  retornou 1 resultado) — trocar para uma conexão nova exigiria pedir para
  você reconectar manualmente, o que não foi feito.
- Arraste por **mouse** entre grupos segue não verificado em navegador real
  em nenhuma das duas sessões (a ferramenta de automação só consegue fazer
  um "salto" único de posição, insuficiente para o sensor de ponteiro do
  `@dnd-kit` reconhecer um arraste de verdade) — item já registrado como
  lacuna em `deferred-work.md` desde a Story 4.2, ainda sem fechamento.

## Estado atual

- **`epic-4-retro-item-11` continua `open`** em `sprint-status.yaml` — não
  alterado nesta sessão (nem o status, nem o texto do item).
- Nenhum código de produto foi alterado por esta investigação — as duas
  tentativas (Opção A e o fork `SafeOptimisticSortingPlugin`) foram
  revertidas por completo antes de encerrar. `git status` confirma só a
  correção já fechada do `epic-3-retro-item-7` (CSS + teste) e os
  documentos de retro/investigação como mudanças reais no repositório.
- Build limpo e 235/235 testes automatizados confirmados no estado final.

## Próxima investigação sugerida

1. **Começar numa sessão de navegador nova, sem histórico acumulado** —
   validar com um teste trivial (ex. só o Tab mudando o foco) que o
   despacho de teclas está confiável *antes* de investigar o problema real,
   para não perder tempo com degradação do ambiente no meio.
2. **Mapear exatamente quais propriedades reativas do `sortable`** (`isDragging`,
   `isDropTarget`, `isDropSource`, `group`, `index`) disparam o re-render
   de `SortableTaskItem`/`EmptyZoneDropTarget` via `useDeepSignal` durante
   um arraste ativo — isso vai dizer se dá para evitar o re-render
   problemático de forma cirúrgica (ex. memoizando o componente contra
   essas mudanças específicas) em vez de mexer na lógica do plugin.
3. **Considerar uma abordagen estruturalmente diferente**: em vez de
   condicionar `reorder()`, avaliar se o padrão de "Feedback"/clone visual
   que o próprio `@dnd-kit` expõe (`Feedback`, visto em
   `node_modules/@dnd-kit/dom/index.js`) desacopla completamente a camada
   visual do arraste da árvore real que o React gerencia — isso eliminaria
   a corrida pela raiz (nunca mexendo no nó real do React durante o
   gesto) em vez de tentar prever todos os casos em que mexer nele é
   "seguro o suficiente". **[Seguido nesta sessão — ver "Atualização —
   `feedback: 'none'`" ao final: a opção oficial mais simples (desligar o
   `Feedback` inteiro) foi testada e descartada por degradar o arraste por
   teclado; o caminho refinado (item 6 abaixo) é o que resta a tentar.]**
4. **Reavaliar a Opção C (Error Boundary)**, hoje fora de escopo por pedido
   explícito, mas cada vez mais relevante dado que a causa raiz real é mais
   difícil de fechar do que se pensava — um Error Boundary não resolve o
   problema, mas evita que ele vire tela em branco enquanto a correção de
   verdade não é encontrada.
5. Fechar também a lacuna de verificação por **mouse** (nunca testado em
   navegador real, nem antes nem agora) quando uma ferramenta de automação
   capaz de simular um gesto de arraste incremental estiver disponível.
6. ~~(Novo, pós `feedback: 'none'`) Preservar o cálculo/geometria do
   `Feedback`, bloquear só suas mutações diretas de DOM~~ — **testado e
   descartado nesta sessão** (`feedback: 'move'`, que faz exatamente isso
   via configuração oficial da lib): o crash continua mesmo assim. Ver
   "Atualização — `feedback: 'move'`" abaixo. A hipótese "só as 2 chamadas
   de DOM do `Feedback` importam" está descartada — a causa é mais ampla.
7. **(Novo, pós `feedback: 'move'`) Investigar a interação reativa entre
   `Feedback` e `OptimisticSortingPlugin`, não linhas isoladas de nenhum
   dos dois** — ver "Atualização — `feedback: 'move'`" abaixo para o
   raciocínio completo. Resumo: bloquear só as mutações de DOM de um
   plugin de cada vez não resolveu; falta entender exatamente que
   interação de timing entre os dois efeitos reativos (o de `Feedback`,
   sempre ativo por causa da leitura de `position`, e o `dragover` do
   `OptimisticSortingPlugin`) cria a janela em que o React reconcilia
   contra um DOM que um dos dois já mudou.

## Atualização — `feedback: 'none'` testado e descartado

Terceira tentativa desta linha de investigação, seguindo a sugestão do
item 3 acima (a opção "oficial" mais simples: reconfigurar o `Feedback` via
`Feedback.configure({ feedback: 'none' })` no `plugins` do
`<DragDropProvider>`, sem fork).

**`feedback: 'none'` elimina o crash de fato** — testado em navegador real,
múltiplas sequências, mesmo grupo e entre grupos: zero `NotFoundError`,
zero perda de foco pra `<body>`, zero tela em branco, console limpo em
todos os testes.

**Porém degrada fortemente o arraste por teclado entre grupos** — a ponto
de ficar praticamente inutilizável. Comparação direta, mesmo gesto (Enter
+ `ArrowRight` repetido), mesma tarefa, no mesmo navegador:

| | Código original (`Feedback` padrão) | Com `feedback: 'none'` |
|---|---|---|
| Teclas até cruzar de Segunda pra Quinta-feira | **3** | **11+, nunca cruzou** |

**Causa provável:** `Feedback.render_fn` é quem mantém `dragOperation.shape`
atualizado — seta no pickup (`dragOperation.shape = initialShape`) e
reatualiza a cada passo, dentro do efeito reativo "Update transform on
move" (`dragOperation.shape = new DOMRectangle(feedbackElement)` ou a
versão traduzida). Com `feedback: 'none'`, `render_fn` retorna cedo
*antes* de chegar nesse cálculo (`if (!element || feedback === "none" ||
...) return;`) — `dragOperation.shape` nunca mais é atualizado depois do
pickup. `SortableKeyboardPlugin` (o sensor de teclado) lê exatamente essa
propriedade (`dragOperation.shape.current`) pra calcular colisão a cada
seta — sem ela ser atualizada, o cálculo passa a rodar contra uma
geometria congelada/desatualizada, exigindo muito mais teclas (e talvez
nunca o suficiente) pra cruzar qualquer fronteira real.

**A solução foi revertida por completo** — `git checkout` em
`WeekView.tsx`, build confirmado limpo (mesmo hash de antes), nenhum
código de produto alterado no repositório ao final.

**`epic-4-retro-item-11` continua `open`.**

**Próximo caminho sugerido:** nem `feedback: 'none'` (perde a geometria)
nem remover o `Feedback` inteiro da lista de plugins (mesmo problema) — a
correção precisa **preservar o cálculo/geometria que o `Feedback` mantém
vivo** (`dragOperation.shape`/`.transform`, essenciais pro sensor de
teclado funcionar com poucas teclas) **e bloquear só as suas mutações
diretas de DOM**: `element.insertAdjacentElement("afterend", placeholder)`
(criação do placeholder, dentro de `render_fn`) e
`placeholder.replaceWith(feedbackElement)` (dentro de `finalize()`,
chamado por `cleanup()`). Isso volta a apontar para um fork parcial do
`Feedback` — maior e mais arriscado que o do `OptimisticSortingPlugin`
(geometria, observers, popover, animação de soltar todos entrelaçados no
mesmo `render_fn`), mas agora com um alvo preciso: manter tudo que lê/
escreve `dragOperation.shape`/`.transform`/estilos CSS intacto, remover só
as duas chamadas que tocam o DOM real.

**Nota:** este "próximo caminho" foi testado na sessão seguinte via
`feedback: 'move'` (uma opção oficial da própria lib que já faz exatamente
essa troca — placeholder sempre `null`, geometria intacta, sem precisar de
fork) — **e não resolveu o crash**. Ver seção seguinte.

## Atualização — `feedback: 'move'` testado e descartado

Quarta tentativa desta linha de investigação. `feedback: 'move'` é outra
opção de configuração já suportada pelo `Feedback` (linha 957 do
`render_fn`: `const placeholder = feedback !== "move" && !this.overlay ?
createPlaceholder(...) : null;`) — diferente de `'none'`, ela **não**
retorna cedo (o early-return da linha 914 só verifica `feedback ===
"none"`), então:

- `placeholder` fica sempre `null` → `insertAdjacentElement` (linha 1038)
  e `placeholder.replaceWith(feedbackElement)`/`placeholder?.remove()`
  (linhas 1137-1140) nunca rodam — as duas mutações diretas de DOM do
  `Feedback` ficam bloqueadas, exatamente como o "próximo caminho sugerido"
  pedia.
- `dragOperation.shape = initialShape` (pickup) e o efeito reativo "Update
  transform on move" (que mantém `shape`/`.transform` atualizados a cada
  tecla) continuam rodando normalmente — a geometria não se perde.
- Confirmado por leitura de código que `createResizeObserver`/
  `runDropAnimation` já tratam `placeholder == null` como caminho legítimo
  e testado pela própria lib (ex. `runDropAnimation`: `const target =
  ctx.placeholder ?? ctx.element`).

**Resultado no navegador real:**

- **A responsividade do teclado ficou ótima** — 3 teclas (`Enter` +
  3×`ArrowRight`) cruzaram de Segunda pra Terça-feira, praticamente igual
  ao código original (3 teclas pra Quinta-feira, medido na tentativa
  anterior). A perda de geometria que degradava `feedback: 'none'` (11+
  teclas sem cruzar) **não se repete** com `'move'` — confirma que a causa
  daquela degradação específica era mesmo a geometria, como suspeitado.
- **Mas o crash continua.** Mesmo gesto (Enter → 3×`ArrowRight` → Enter,
  cruzando de Segunda pra Terça-feira): console mostrou de novo o mesmo
  `NotFoundError: Failed to execute 'removeChild' on 'Node': The node to
  be removed is not a child of this node.`, com a mesma pilha interna do
  React (`commitDeletionEffectsOnFiber`/`commitMutationEffectsOnFiber`/
  `flushMutationEffects`/`commitRoot`), e a tela ficou em branco
  (`document.getElementById('root').children.length === 0`) no final —
  apesar do dado ter persistido corretamente no `localStorage`
  (`day: 'tue'`) antes do crash. Também confirmado: perda de foco pra
  `<body>` já durante o gesto, antes mesmo de confirmar o drop.

**Portanto: bloquear só `insertAdjacentElement`/`replaceWith` não
resolve.** A hipótese que motivou o fork parcial (achado da sessão
anterior: "a correção precisa preservar geometria e bloquear só as 2
mutações diretas de DOM do `Feedback`") está **refutada por teste direto**
— removê-las de fato (via `'move'`, sem fork nenhum) não impede o crash.

**A interação problemática envolve mais do que as mutações diretas de DOM
do `Feedback`.** Evidência indireta forte: `feedback: 'none'` (que torna
`render_fn` praticamente inerte — nunca chega a registrar o efeito
reativo "Update transform on move", já que retorna antes de qualquer
`effects(...)`) eliminou o crash em todos os testes; `feedback: 'move'`
(que mantém esse efeito reativo totalmente ativo, só sem as 2 chamadas de
DOM) não eliminou. A diferença relevante entre os dois modos não é "o
`Feedback` mexe ou não mexe no DOM" — é "o `Feedback` está ou não
reativamente ativo" (registrando/re-executando efeitos a cada mudança de
`dragOperation.position`/`.transform`/`.status`). Isso sugere que o
`OptimisticSortingPlugin` sozinho (via seu próprio `reorder()`, nunca
tocado nesta tentativa) já é capaz de crashar quando o `Feedback` está
ativo ao lado dele — o problema parece ser de **timing entre dois efeitos
reativos concorrentes**, não de qual dos dois efetivamente toca o DOM.

**A hipótese do fork parcial do `Feedback` (item 6 da lista anterior) fica
descartada** — não há mais razão para investir nesse fork especificamente,
já que a via mais barata de testar sua premissa central (`feedback:
'move'`, zero fork) já a refutou.

**A solução foi revertida por completo** — `git checkout` em
`WeekView.tsx`, build confirmado limpo (mesmo hash de antes), nenhum
código de produto alterado no repositório ao final.

**`epic-4-retro-item-11` continua `open`.**

**Próxima investigação sugerida:** focar na **interação reativa entre
`Feedback` e `OptimisticSortingPlugin`** — não em linhas isoladas de
nenhum dos dois. Perguntas concretas a responder:
- Com `Feedback` totalmente ativo (padrão) mas `OptimisticSortingPlugin`
  desabilitado (sabendo que isso quebra a reordenação em si, ver "Opção A
  descartada" acima — mas só para fins de diagnóstico, sem aplicar), o
  crash desaparece? Isso isolaria se o `OptimisticSortingPlugin` é
  condição necessária, não só o `Feedback` estar ativo.
- Existe alguma combinação de flags/opções (`feedback: 'clone'` em vez de
  `'move'`/`'none'`? desabilitar só os observers do `Feedback` — resize/
  mutation — mantendo geometria e as 2 mutações de DOM?) que altere a
  frequência/timing dos re-renders o suficiente pra evitar a janela de
  colisão, mesmo sem eliminar nenhuma mutação de DOM?
- O `manager.renderer.rendering` (a promessa que sincroniza plugins com o
  ciclo de render do React, vista em `@dnd-kit/react/index.js`) é
  respeitado por *todos* os pontos que mexem no DOM (`OptimisticSortingPlugin.reorder()`,
  `Feedback`'s `insertAdjacentElement`/`replaceWith`) da mesma forma? Vale
  conferir se algum dos dois faz sua mutação de DOM **fora** dessa
  sincronização, o que explicaria a corrida diretamente.

## Atualização — combinação mínima de reprodução isolada

Sessão seguinte, focada exclusivamente na **interação entre `Feedback` e
`OptimisticSortingPlugin`** (primeira das 3 perguntas concretas da seção
anterior, adaptada para não repetir literalmente "Opção A"/os forks/
`feedback:'none'`/`feedback:'move'`, já descartados). Dois experimentos
novos, nenhuma correção proposta nem aplicada — só isolamento de causa.

**Experimento 1 — pickup + drop imediato, sem nenhum movimento, código
100% original (zero mudança de código):**

Foco na alça de `Tarefa A`, `Enter` (pickup, confirmado ativo), espera de
500ms, `Enter` de novo (confirma o drop) **sem nenhuma seta no meio**.
**Resultado: não crasha.** Foco preservado, console limpo, app intacto.

**Conclusão do Experimento 1: o crash exige um `dragover`/colisão real
disparando — o ciclo de vida sozinho do `Feedback` (montar ao pegar,
desmontar ao soltar) não é suficiente por si só.** O `OptimisticSortingPlugin`
precisa de fato processar um evento de movimento (mesmo que não mova
nada de verdade, no sentido de reordenar) para o crash aparecer.

**Experimento 2 — `DragDropProvider` com plugins reduzidos a só
`[Feedback]`:**

`plugins={() => [Feedback]}` no `<DragDropProvider>` — remove
`Accessibility`, `AutoScroller`, `Cursor` e `PreventSelection` da lista
padrão (`defaultPreset.plugins`), mantendo `OptimisticSortingPlugin`/
`SortableKeyboardPlugin` intocados no nível do `useSortable`. Repetido o
gesto que já crashava de forma confiável (Enter → 3×`ArrowDown`, mesmo
grupo → Enter): **crashou igual** — mesmo `NotFoundError: Failed to
execute 'removeChild' on 'Node': The node to be removed is not a child of
this node.`, mesma pilha do React, tela em branco no final
(`rootChildren: 0`).

**Conclusão do Experimento 2: nenhum dos 4 outros plugins padrão do
`@dnd-kit/dom` é necessário para o crash.**

**Combinação mínima de reprodução isolada, confirmada por teste direto:**

```
Feedback (nível do DragDropManager, config padrão)
+ OptimisticSortingPlugin (nível do useSortable, config padrão)
+ SortableKeyboardPlugin (nível do useSortable, config padrão)
+ um dragover real acontecendo (colisão contra outro alvo, não só pickup/drop no lugar)
```

`Accessibility`, `AutoScroller`, `Cursor`, `PreventSelection` — **não
necessários**. Nenhum código de produto foi alterado; ambos os
experimentos foram feitos em cima de código já revertido ao estado seguro
(o Experimento 1 nem precisou de mudança nenhuma; o Experimento 2 foi
revertido via `git checkout` em `WeekView.tsx` logo depois, build
confirmado limpo).

**`epic-4-retro-item-11` continua `open`.**

**Foco da próxima investigação:** a interação **entre** `Feedback` e
`OptimisticSortingPlugin` especificamente **durante o `dragover`** — não
mais "quais plugins estão presentes" (já respondido: só os 3 da
combinação mínima importam), e sim "o que exatamente acontece quando os
efeitos reativos dos dois disparam para o mesmo evento de `dragover`, na
mesma janela de tempo". As 3 perguntas concretas já registradas na seção
anterior (Opção A como diagnóstico isolado de `OptimisticSortingPlugin`
sozinho, outras combinações de opções do `Feedback`, e se
`manager.renderer.rendering` é respeitado igualmente pelos dois) seguem
válidas como próximos passos dentro desse foco.

## Atualização — sequência de eventos mapeada; hipótese `source.status`
## intermediário testada e refutada

Sessão seguinte, só leitura de código (nenhuma mudança) até o ponto de
propor um teste, depois um teste cirúrgico único. Objetivo: mapear a
ordem exata em que `Feedback` e `OptimisticSortingPlugin` reagem ao mesmo
`dragover`, e testar a hipótese mínima que essa leitura sugeriu.

### Sequência de eventos mapeada (por um único passo de teclado)

Rastreada por leitura direta de `@dnd-kit/abstract/index.js` (`DragActions.setDropTarget`),
`@dnd-kit/dom/sortable.js` (`SortableKeyboardPlugin`, `OptimisticSortingPlugin`)
e `@dnd-kit/dom/index.js` (`Feedback`):

1. `KeyboardSensor` traduz o `keydown` físico num evento monitor `"dragmove"`.
2. `SortableKeyboardPlugin` (handler de `dragmove`) calcula colisões e chama
   `actions.setDropTarget(id)`.
3. `DragActions.setDropTarget` **dispara `"dragover"` de forma síncrona**
   (`monitor.dispatch("dragover", event)`) — é esse dispatch que aciona o
   `OptimisticSortingPlugin`, não um evento passivo.
4. `OptimisticSortingPlugin` (handler de `"dragover"`, rodando **dentro**
   do dispatch síncrono do passo 3) computa `sameGroup`/instâncias e
   agenda o resto via `queueMicrotask(...)` — **esse `queueMicrotask` é
   registrado antes de `setDropTarget` sequer retornar sua própria
   promise**, então entra na fila de microtasks primeiro.
5. `setDropTarget` retorna `manager.renderer.rendering.then(...)` — como
   nenhum `onDragOver`/`onDragMove` foi passado ao `<DragDropProvider>`
   (só `onDragEnd`), `trackRendering` nunca é chamado em pleno gesto, e
   `manager.renderer.rendering` fica sempre pré-resolvida — mas cada
   acesso ao getter cria uma instância de promise nova (ainda que já
   resolvida), então a ordem relativa entre os `.then()` de cada plugin
   depende de quem anexou o seu primeiro.
6. Fila de microtasks processa em ordem: o callback do
   `OptimisticSortingPlugin` (agendado no passo 4) roda **antes** da
   continuação de `SortableKeyboardPlugin` (anexada só depois, no passo
   5) — e é dentro dele que a mutação real acontece: `reorder()`
   (`insertAdjacentElement`, DOM real) + `batch()` (reindexa
   `sortable.index`/`.group`, reativo).
7. Só depois disso a continuação de `SortableKeyboardPlugin` roda:
   recalcula shape/delta e chama `actions.move({by: delta})`, escrevendo
   em `dragOperation.transform`/`.position`.
8. `Feedback.render_fn` (efeito reativo assinando `position`) só
   re-executa **depois** disso — ou seja, **depois** que
   `OptimisticSortingPlugin` já reparentou o nó real no passo 6.

**Conclusão da leitura: `OptimisticSortingPlugin` sempre dispara e
completa sua mutação de DOM antes de `Feedback` reagir** — a ordem não é
ambígua, é estrutural (decorre de como as promises/microtasks são
encadeadas, não de uma corrida genuinamente aleatória passo a passo).

### Hipótese testada: suprimir `source.status = 'idle'` intermediário

A leitura também revelou que `Sortable.isDragging` (lido por
`SortableTaskItem` via `useSortable()`, e repassado ao `TaskCard`) é
literalmente `this.status === "dragging" && this.isDragSource` — e que o
`cleanup()`/`finalize()` do `Feedback` (que roda a cada re-execução
reativa do `render_fn`, **mesmo com `placeholder === null`**) grava
incondicionalmente `source.status = "idle"` por um instante antes do
`render_fn` seguinte devolver pra `"dragging"` via
`requestAnimationFrame`. Hipótese: esse "piscar" de `status` é o que
força o React a re-renderizar `SortableTaskItem` bem depois de
`OptimisticSortingPlugin` já ter mexido no DOM — a causa direta da
colisão.

**Teste:** patch cirúrgico em `node_modules/@dnd-kit/dom/index.js`
(arquivo já fora do controle de versão — `.gitignore` confirmado antes de
mexer), movendo a leitura de `dragOperation.status.dragging` pra antes da
escrita e condicionando: `if (!isDragging) { source.status = "idle"; }`
— suprime a escrita só quando o arraste **ainda está em andamento**
(limpeza intermediária), preserva a escrita real de fim de arraste
(`dragOperation.status.dragging` já `false` nesse ponto). Cache do Vite
limpo antes de subir o servidor pra forçar o rebundle a partir do arquivo
patcheado; **confirmado por grep no bundle servido** que o patch estava
mesmo ativo (`if (!isDragging) source.status = "idle";`) antes de testar.

**Resultado: o crash aconteceu de novo**, mesmo grupo (Segunda/Alta, 3
setas), mesmo `NotFoundError: Failed to execute 'removeChild' on 'Node':
The node to be removed is not a child of this node.`, mesma pilha do
React, tela em branco no final (`rootChildren: 0`). Foco também se
perdeu pra `<body>` já durante o gesto, antes do drop, como em todas as
tentativas anteriores.

**A hipótese está refutada.** O "piscar" de `source.status`/`isDragging`
não é a causa (isolada, pelo menos) do crash — ou existe outro gatilho de
re-render que eu ainda não mapeei, ou a colisão acontece por um caminho
diferente do que "React re-renderiza `SortableTaskItem` por causa de
`isDragging` mudar". A ordem mapeada (`OptimisticSortingPlugin` sempre
antes de `Feedback`) segue válida e não foi contestada por este teste —
só a explicação de *qual* re-render específico causa o `removeChild`
ficou sem confirmação.

**O teste foi revertido por completo:** `node_modules/@dnd-kit/dom/index.js`
restaurado do backup (confirmado: a linha 1134 voltou a
`source.status = "idle";` incondicional), `node_modules/.vite` (cache de
pre-bundle) limpo de novo, build confirmado com o mesmo hash de sempre.
Como `node_modules` está dentro do `.gitignore` (confirmado via
`git check-ignore` antes de aplicar o patch), o teste nunca apareceu em
`git status` em nenhum momento desta sessão — nenhum arquivo rastreado
foi tocado.

**`epic-4-retro-item-11` continua `open`.**

**Próxima investigação sugerida:** a ordem entre os dois plugins está bem
mapeada agora; falta achar **qual re-render específico do React** colide
com o DOM que `OptimisticSortingPlugin` já moveu, já que não é (só) o
`isDragging` via `source.status`. Candidatos ainda não descartados:
- Outras propriedades que `render_fn` escreve incondicionalmente mesmo
  com `placeholder === null` — `feedbackElement.setAttribute(ATTRIBUTE, "true")`,
  `styles.set(...)`, e principalmente `untracked(() => dragOperation.shape = initialShape)`
  (linha 1076-1077) — vale checar se **algum** componente React (não só
  `SortableTaskItem`) lê `dragOperation.shape` reativamente por um
  caminho ainda não rastreado.
- A possibilidade de que não seja um re-render do **React** disparado por
  uma leitura reativa específica, mas sim o próprio ciclo
  cleanup-depois-rerun do `registerEffect` do `Feedback` interagindo com
  o `ref` callback do `useSortable` (`sortable.js:150-159`, já lido
  numa sessão anterior — o guard que ignora `ref(null)` durante um
  arraste ativo) de uma forma que ainda não foi conectada ao restante da
  cadeia.
- Instrumentar de fato (`console.trace`/`performance.mark` temporários,
  não permanentes) o exato momento do `commitRoot` que lança o erro, pra
  comparar contra a sequência já mapeada aqui — a leitura de código já
  levou essa investigação bem longe, mas o próximo passo provavelmente
  precisa de instrumentação em tempo real pra ir além de hipóteses.

## Atualização — instrumentação em tempo real: causa raiz precisa capturada

Sessão seguinte. Logs `[T]` temporários (`console.log`/`performance.now()`)
adicionados em `@dnd-kit/abstract/index.js` (`DragActions.setDropTarget`/
`.move`), `@dnd-kit/dom/sortable.js` (`OptimisticSortingPlugin`, `reorder()`),
`@dnd-kit/dom/index.js` (`Feedback.render_fn`/`cleanup`/`finalize`/efeito de
transform) e `@dnd-kit/react/sortable.js` (`ref` callback do `useSortable`) —
todos em `node_modules` (fora do controle de versão, confirmado via
`git check-ignore` antes de mexer). Também instalado um monkey-patch de
`Node.prototype.removeChild` (via `window.__trace`, lido depois direto da
memória da página, contornando uma limitação encontrada na ferramenta de
automação: `read_console_messages` perde o buffer de rastreamento bem no
instante do crash — múltiplas tentativas de reconsulta com padrões
diferentes não recuperaram os logs `[T]` daquele momento específico).

**Ajuste necessário durante a instrumentação:** a primeira versão de um dos
logs (leitura de `source.status` dentro de `Feedback.render_fn`) não estava
envolta em `untracked()`, diferente do código original — criou uma
assinatura reativa nova que não existia, causando um pico de ~1500
mensagens num simples pickup-e-espera (esperado: dezenas). Corrigido
envolvendo as leituras diagnósticas em `untracked(() => ...)`, igual ao
padrão que o próprio código-fonte já usa.

**Sequência observada (reprodução real, mesmo grupo, atingindo zona vazia:
pickup + 3×`ArrowDown` + `Enter` de confirmação):**

1. `OptimisticSortingPlugin` processa o `dragover`: `reorder()` chama
   `insertAdjacentElement`, movendo fisicamente o `<li>` da tarefa
   arrastada para **fora** do `<ul>` original — e escreve
   `sortable.index`/`.group` (reativo).
2. Gap de ~1047ms até o próximo evento relevante — um commit/re-render real
   do React acontece nesse intervalo, disparado pela confirmação do drop
   (`Enter`).
3. React entra em commit e chama `ref(null)` no `<li>` da tarefa arrastada
   (unmount da posição antiga na fiber tree).
4. O guard do `useSortable` (`@dnd-kit/react/sortable.js`, ~linha 154)
   **ignora** esse `ref(null)` — comportamento propositalmente existente na
   lib, porque o elemento ainda está `isConnected` e o arraste ainda não
   está `idle` (evita perder `sortable.element` no meio do gesto).
5. Imediatamente em seguida: **`removeChild` lança `NotFoundError`** —
   `parent` é o `<ul>` **antigo** (de onde o `insertAdjacentElement` já
   havia removido o nó no passo 1), `child` é o `<li>` da tarefa arrastada.

**Causa raiz precisa, agora confirmada por captura direta (não só leitura de
código):** o React, na fase de commit, ainda acredita — pela fiber tree —
que a tarefa precisa ser removida do `<ul>` original. Mas o nó físico já
não é mais filho desse `<ul>`, porque o `OptimisticSortingPlugin` já o
realocou um passo antes via `insertAdjacentElement`. O guard do `ref(null)`
faz o `@dnd-kit` "fechar os olhos" para essa divergência (por design, para
não perder a referência ao elemento em pleno gesto) — só que isso também
significa que nada sincroniza as duas visões de mundo (fiber tree vs. DOM
físico) antes do commit do React tentar o `removeChild` no lugar errado.
Depois do crash, `#root` fica com 0 filhos — o React desmonta a árvore
inteira (comportamento padrão para erro não capturado em commit).

### Hipótese mínima testada: suprimir só o `reorder()` físico

**O que foi tentado:** `reorder()` (função compartilhada do
`OptimisticSortingPlugin`, usada tanto no caminho de `dragover` quanto no
de cancelamento) alterado para retornar sem chamar `insertAdjacentElement`
— tudo mais do plugin (o `batch()` que escreve `sortable.index`/`.group`
reativamente, o `setDropTarget` re-chamado depois, `SortableKeyboardPlugin`,
`Feedback`) permanece 100% ativo e intocado.

**Resultado, validado no navegador real:**

| Cenário | Resultado |
|---|---|
| Reprodução exata do crash original (mesmo grupo, 3×`ArrowDown` até zona vazia) | **Sem crash** — `rootChildren` estável (3→3), zero `removeChild` lançado, em múltiplas repetições |
| Mesmo grupo (`Tarefa A` ↔ `Tarefa B`, `Enter`+`ArrowDown`+`Enter`) | Sem crash; `order` persistiu trocado corretamente no `localStorage`; **mas foco não restaurado** — foi parar em `<body>`, não na alça |
| Entre dias/prioridades (`Enter`+`ArrowRight`+`ArrowDown`+`Enter`) | Sem crash; **mas o movimento entre grupos não persistiu** — dia/prioridade da tarefa continuaram os originais no `localStorage` após o gesto completo |

**Confirma a hipótese da causa raiz** (a divergência entre mutação física do
DOM e a fiber tree do React é o gatilho direto do `removeChild`), mas na
mesma linha dos testes anteriores (`feedback:'none'`, `feedback:'move'`):
eliminar a mutação física do `OptimisticSortingPlugin` tira o crash à custa
de funcionalidade essencial — movimento real entre grupos parou de
funcionar (a lógica de reindexação parece depender de algo que o
`reorder()` físico também dispara/sincroniza, além do `batch()` isolado) e
a restauração de foco pós-drop quebrou mesmo no caminho antes seguro
(mesmo grupo).

**O teste foi revertido por completo** — os 4 arquivos de `node_modules`
restaurados dos backups, `node_modules/.vite` limpo de novo, `npm run
build` confirmado com os mesmos hashes de sempre, `git status` sem nenhuma
mudança inesperada (só as alterações já rastreadas de sessões anteriores).

**`epic-4-retro-item-11` continua `open`.**

**Conclusão desta linha de investigação:** seis tentativas de correção
pontual dentro do `@dnd-kit` (Opção A, fork `SafeOptimisticSortingPlugin`,
`feedback:'none'`, `feedback:'move'`, supressão do `source.status='idle'`
intermediário, supressão do `reorder()` físico) foram tentadas e
descartadas — todas ou não eliminam o crash, ou eliminam à custa de
funcionalidade essencial (cruzamento de grupo e/ou foco). A causa raiz
agora está bem entendida e confirmada por captura direta: é uma
divergência estrutural entre a mutação imperativa de DOM que o
`OptimisticSortingPlugin` faz durante o gesto e a fiber tree que o React
mantém para a mesma subárvore — não há patch pontual dentro do `@dnd-kit`
capaz de eliminar essa divergência sem também remover a funcionalidade que
depende dela. **Por decisão explícita, patches internos do `@dnd-kit`
(`node_modules`) não serão mais tentados** — o próximo passo é avaliar
alternativas estruturais (ver seção seguinte / próxima investigação
sugerida).

## Solução final — migração para `@dnd-kit/core`+`@dnd-kit/sortable`

Sessão seguinte. Comparadas 3 alternativas estruturais (leitura de código,
sem alterar nada): (A) migrar para `@dnd-kit/core`+`@dnd-kit/sortable`
(pacotes clássicos/estáveis do mesmo autor, já sinalizados no próprio
review de arquitetura do projeto — `AD-6`, `review-version-check.md`,
2026-09-10 — como a alternativa madura ao par `@dnd-kit/react`+
`@dnd-kit/dom` pre-1.0); (B) ficar na mesma família de pacotes, trocando
`useSortable` por `useDraggable`+`useDroppable` crus e reimplementando a
reordenação otimista à mão; (C) trocar de biblioteca inteiramente.
**Opção A recomendada e aprovada**: elimina a causa raiz estruturalmente
(nunca há mutação imperativa de DOM concorrendo com a fiber tree — durante
o gesto só `transform`/`transition` CSS), reaproveita quase toda a lógica
de domínio já escrita, e é o menor volume de código novo das três.

Antes de implementar, um ponto de decisão real foi levantado e confirmado
com Isabel: o `@dnd-kit/core` clássico não tem "salto" visual ao vivo entre
containers/grupos prontos (isso é o que o `OptimisticSortingPlugin` da
versão anterior fazia via mutação de DOM — a própria causa do crash).
Decisão: cruzar de dia/prioridade só é decidido no soltar (`onDragEnd`),
sem o Card pular de coluna durante o gesto — menor migração, sem lógica
nova de `onDragOver`.

**Migração implementada** (`git log`, commit descrito abaixo):

- `package.json`: removidos `@dnd-kit/dom`, `@dnd-kit/react`,
  `@dnd-kit/helpers`; adicionados/fixados `@dnd-kit/core@6.3.1`,
  `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`.
- `WeekView.tsx`: `DragDropProvider` → `DndContext` (sensores
  `PointerSensor`+`KeyboardSensor` com `sortableKeyboardCoordinates` —
  multi-container por natureza, considera TODOS os alvos soltáveis
  registrados, não só o grupo atual; `collisionDetection: closestCenter`).
  `handleDragEnd` **intocado por dentro** — mesma chamada a
  `resolveWeekDragChange`/`applyWeekDragChange`/`isDragHandleFocused`.
- `DayColumn.tsx`: `SortableTaskItem` usa `useSortable` clássico (`data:
  {group}`, `setNodeRef`+`transform`/`transition` CSS em vez de mutação de
  DOM); `EmptyZoneDropTarget` virou `useDroppable` puro (nunca arrastável);
  cada `PriorityZone` com tarefas ganhou seu próprio `<SortableContext>`;
  `useDragOperation` → `useDndContext`.
- `TaskCard.tsx`: novo prop opaco `dragHandleProps` (attributes+listeners
  do `useSortable`, espalhados na alça) — continua sem importar nenhum
  tipo do `@dnd-kit`.
- `dragChange.ts`: **`applyWeekDragChange`/`WeekDragActions`/
  `WeekDragChange` preservados 100% intocados** (mesma regra: mesmo grupo
  -> `reorderTask`, cruzou grupo -> `updateTask` único). Só
  `resolveWeekDragChange` foi adaptado — lê `active`/`over` +
  `data.current.group` (grupo no momento do render, já que não há mais
  salto ao vivo) em vez de `source.group`/`.initialGroup`; `arrayMove`
  (`@dnd-kit/sortable`) no lugar de `@dnd-kit/helpers.move`.
- `dragHandleRegistry.ts` e `useTaskActions`: **zero alterações** — já
  eram desacoplados dos internals do `@dnd-kit`.
- Sem `<DragOverlay>` (decisão consciente): o próprio Card arrastado
  recebe o `transform` do `useSortable` e flutua no lugar — o visual de
  sombra+rotação já vinha de `.dragging` (`TaskCard.module.css`, via
  `isDragging`), reaproveitado sem mudança.
- CSS morta removida: a regra `[data-dnd-placeholder]` em
  `DayColumn.module.css` (convenção específica do `@dnd-kit/dom` antigo,
  nunca mais existe nenhum atributo desses).

**Validação em navegador real** (`window.__trace` com trap em
`Node.prototype.removeChild`, sem nenhuma instrumentação de produção):

| Cenário | Resultado |
|---|---|
| Mesmo grupo, teclado | Reordenou, persistiu, **foco permaneceu na alça** |
| Cruzamento de dia/prioridade, teclado | Persistiu corretamente, **foco restaurado** na alça remontada via `dragHandleRegistry` |
| Mouse (mesmo grupo + cruzamento) | Ambos persistiram corretamente (`PointerEvent` sintético, precisou `isPrimary:true` explícito) |
| Persistência | Confirmada no `localStorage` em todos os casos acima |
| `removeChild` | **Nunca disparou** em nenhum teste — `window.__trace` permaneceu vazio |
| Build/testes automatizados | `npm run build` limpo; **234/234 testes** (235 anteriores − 1 teste de cancelamento removido, estruturalmente impossível no `@dnd-kit/core`: `onDragCancel` é um callback separado de `onDragEnd`, nunca mais existe um `DragEndEvent` "cancelado" para testar) |

**`epic-4-retro-item-11` está `done`.** Causa raiz eliminada
estruturalmente, não contornada — não há mais nenhuma mutação imperativa
de DOM do `@dnd-kit` durante um gesto de arraste ativo neste app.

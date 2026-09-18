import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { TaskActionResult } from '../../state/useTaskActions';
import type { Priority, Task } from '../../types';

// Chave estável de grupo `@dnd-kit` para o par `(date, priority)` — usada
// tanto pelo `index`/`group` de `useSortable` (DayColumn) quanto por
// `resolveWeekDragChange` abaixo para decidir se um `DragEndEvent` cruzou de
// grupo. Ausência de prioridade usa a chave literal `'none'` (nunca string
// vazia, mesma convenção de `priority: null` no resto do app).
//
// Story 5.1: `date` (ISO real) substitui `day` (`DayOfWeek`) — mesma
// semântica de agrupamento, só muda o tipo do identificador.
const NONE_PRIORITY_KEY = 'none';

export function groupKey(date: string, priority: Priority | null): string {
  return `${date}::${priority ?? NONE_PRIORITY_KEY}`;
}

export function parseGroupKey(key: string): { date: string; priority: Priority | null } {
  const separatorIndex = key.indexOf('::');
  const date = key.slice(0, separatorIndex);
  const priorityPart = key.slice(separatorIndex + 2);
  return { date, priority: priorityPart === NONE_PRIORITY_KEY ? null : (priorityPart as Priority) };
}

export type WeekDragChange =
  | { kind: 'reorder'; id: string; toIndex: number }
  | { kind: 'move'; id: string; date: string; priority: Priority | null };

// Formato mínimo lido de `event.active`/`event.over` — o real, em produção,
// vem do `useSortable`/`useDroppable` (`@dnd-kit/core`+`@dnd-kit/sortable`,
// migração Epic 4 retro item 11), cujo `data.current.group` é o `groupKey`
// (`(date,priority)`) passado a cada `useSortable`/`useDroppable` no momento
// do render — NUNCA atualizado ao vivo durante o gesto (decisão consciente:
// cruzar de grupo só é decidido no soltar, não mostrado como "salto" visual
// antecipado durante o arraste — ver investigação do item 11: a versão
// anterior, `@dnd-kit/react`+`@dnd-kit/dom`, atualizava isso ao vivo via
// mutação imperativa de DOM, e essa mutação colidindo com a fiber tree do
// React era a causa raiz do crash `removeChild`). Por isso o par relevante
// agora é `active.data.current.group` (grupo ONDE a tarefa está renderizada,
// sempre o grupo de origem, já que não há mais salto ao vivo) vs.
// `over.data.current.group` (grupo do alvo em que soltou) — não mais
// `source.group` vs. `source.initialGroup`. Lido estruturalmente (não via
// tipos concretos do `@dnd-kit/core`) pelo mesmo motivo de sempre: um
// `DragEndEvent` sintético em teste não precisa de instâncias reais de
// `Draggable`/`Droppable` — simular um gesto físico de arraste não é viável
// sob jsdom (limitação conhecida, mesmo comentário de `DayColumn.test.tsx`).
interface DragEndPointLike {
  id: unknown;
  data?: { current?: { group?: unknown } };
}

// Story 4.2 (Epic 4): único `<DndContext>` para a semana inteira
// (`WeekView`) — cada `TaskCard` arrastável carrega um `group` (`groupKey`
// acima, `(date,priority)`) via `data` do `useSortable`/`useDroppable`.
// `active.data.current.group` (grupo de onde a tarefa saiu) e
// `over.data.current.group` (grupo em que foi solta) são o par que decide
// tudo aqui: iguais -> mesmo grupo, nunca mudou de Prioridade/Data (delega à
// MESMA lógica pura da Story 4.1, escopada só às tarefas desse grupo, agora
// via `arrayMove` de `@dnd-kit/sortable` em vez de `@dnd-kit/helpers.move`);
// diferentes -> cruzou grupo, a chamadora (`WeekView`) trata como
// `updateTask` (Data e/ou Prioridade, sempre numa única chamada, nunca duas).
export function resolveWeekDragChange(tasks: Task[], event: DragEndEvent): WeekDragChange | null {
  const active = event.active as DragEndPointLike | null;
  if (!active) {
    return null;
  }

  // Soltar fora de qualquer alvo válido (fora de toda a grade da semana)
  // precisa ser um no-op — `event.over` é `null` nesse caso (contrato do
  // `@dnd-kit/core`, substitui a checagem antiga de `event.operation.target`).
  const over = event.over as DragEndPointLike | null;
  if (!over) {
    return null;
  }

  const sourceId = active.id;
  if (typeof sourceId !== 'string') {
    return null;
  }

  const sourceGroup = active.data?.current?.group;
  const targetGroup = over.data?.current?.group;
  if (typeof sourceGroup !== 'string' || typeof targetGroup !== 'string') {
    return null;
  }

  if (targetGroup !== sourceGroup) {
    const { date, priority } = parseGroupKey(targetGroup);
    return { kind: 'move', id: sourceId, date, priority };
  }

  // Mesmo grupo: MESMA computação pura da Story 4.1 (`resolveDragReorder`),
  // só que escopada ao array de tarefas do grupo em vez de receber essas
  // tarefas já isoladas por um provider próprio (a 4.1 tinha um provider por
  // grupo; a 4.2 tem um único provider para a semana inteira — ver
  // comentário de `WeekView.tsx`). `arrayMove` (`@dnd-kit/sortable`) é pura,
  // só move um item de um índice pro outro num array — a decisão de QUAIS
  // índices já foi tomada acima, lendo `active`/`over`.
  const { date, priority } = parseGroupKey(sourceGroup);
  const ids = tasks
    .filter((t) => t.date === date && t.priority === priority)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.id);

  const sourceIndex = ids.indexOf(sourceId);
  const targetId = over.id;
  const targetIndex = typeof targetId === 'string' ? ids.indexOf(targetId) : -1;
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return null;
  }

  const reordered = arrayMove(ids, sourceIndex, targetIndex);
  const toIndex = reordered.indexOf(sourceId);
  if (toIndex === -1) {
    return null;
  }

  return { kind: 'reorder', id: sourceId, toIndex };
}

export interface WeekDragActions {
  reorderTask: (id: string, toIndex: number) => TaskActionResult;
  updateTask: (input: {
    id: string;
    title: string;
    date: string;
    priority: Priority | null;
    state: Task['state'];
  }) => TaskActionResult;
}

// Revisão da Story 4.2 (blind-hunter/verification-gap, achado mais
// importante — confirmado por 2 lentes): antes desta função, a decisão
// "mesmo grupo -> reorderTask, cruzou grupo -> updateTask com título/Estado
// preservados" vivia inteira dentro do `handleDragEnd` de `WeekView.tsx`, não
// exportada, sem nenhum teste direto — só verificável por leitura de código.
// Extraída aqui exatamente pelo mesmo motivo de `resolveWeekDragChange`
// acima: testável com `reorderTask`/`updateTask` mockados, sem precisar de
// nenhum gesto físico de arraste. Retorna o `TaskActionResult` da ação
// chamada (ou `null` se a tarefa do `change` não existir mais em `tasks`) —
// quem chama (`WeekView`) usa esse retorno para só agendar a restauração de
// foco quando a ação de fato confirmou sucesso (`result.ok`), nunca antes:
// isso elimina uma referência de foco obsoleta em caso de falha de escrita
// (achado do blind-hunter/edge-case-hunter) na raiz, em vez de precisar
// limpá-la reativamente depois.
export function applyWeekDragChange(
  change: WeekDragChange,
  tasks: Task[],
  actions: WeekDragActions,
): TaskActionResult | null {
  if (change.kind === 'reorder') {
    return actions.reorderTask(change.id, change.toIndex);
  }

  const task = tasks.find((t) => t.id === change.id);
  if (!task) {
    return null;
  }

  // Cruzamento de grupo (Data e/ou Prioridade mudaram): SEMPRE uma única
  // chamada a `updateTask` — nunca dois passos, mesmo quando os dois mudam
  // juntos. Título/Estado atuais preservados (mudar Data/Prioridade por
  // arraste nunca muda o Estado); `updateTask`+`reorderWithinGroup` (AD-7) já
  // reindexam os dois grupos afetados e colocam a tarefa no fim do grupo
  // novo — nenhuma posição exata via arraste (exclusivo do mesmo grupo,
  // Story 4.1).
  return actions.updateTask({
    id: task.id,
    title: task.title,
    date: change.date,
    priority: change.priority,
    state: task.state,
  });
}

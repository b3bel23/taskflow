import { move } from '@dnd-kit/helpers';
import type { DragEndEvent } from '@dnd-kit/react';
import type { TaskActionResult } from '../../state/useTaskActions';
import type { DayOfWeek, Priority, Task } from '../../types';

// Chave estável de grupo `@dnd-kit` para o par `(day, priority)` — usada
// tanto pelo `index`/`group` de `useSortable` (DayColumn) quanto por
// `resolveWeekDragChange` abaixo para decidir se um `DragEndEvent` cruzou de
// grupo. Ausência de prioridade usa a chave literal `'none'` (nunca string
// vazia, mesma convenção de `priority: null` no resto do app).
const NONE_PRIORITY_KEY = 'none';

export function groupKey(day: DayOfWeek, priority: Priority | null): string {
  return `${day}::${priority ?? NONE_PRIORITY_KEY}`;
}

export function parseGroupKey(key: string): { day: DayOfWeek; priority: Priority | null } {
  const separatorIndex = key.indexOf('::');
  const day = key.slice(0, separatorIndex) as DayOfWeek;
  const priorityPart = key.slice(separatorIndex + 2);
  return { day, priority: priorityPart === NONE_PRIORITY_KEY ? null : (priorityPart as Priority) };
}

export type WeekDragChange =
  | { kind: 'reorder'; id: string; toIndex: number }
  | { kind: 'move'; id: string; day: DayOfWeek; priority: Priority | null };

// Formato mínimo lido de `event.operation.source` — o real, em produção, é
// sempre um `SortableDraggable` (`node_modules/@dnd-kit/dom/sortable.d.ts`,
// classe que estende `Draggable` com os getters `group`/`initialGroup` livre-
// dinâmicos, ver `.js` compilado: refletem o `group` passado a `useSortable`
// em cada `TaskCard`, atualizado ao vivo pelo `OptimisticSortingPlugin`
// conforme o Card cruza zonas/colunas durante o arraste). Lido
// estruturalmente (não via `instanceof SortableDraggable`) pelo mesmo motivo
// da Story 4.1 (`resolveDragReorder`): um `DragEndEvent` sintético em teste
// não é uma instância real de `SortableDraggable` — simular um gesto físico
// de arraste não é viável sob jsdom (limitação conhecida, mesmo comentário de
// `DayColumn.test.tsx`).
interface SortableSourceLike {
  id: unknown;
  group?: unknown;
  initialGroup?: unknown;
}

// Story 4.2 (Epic 4): único `DragDropProvider` para a semana inteira
// (`WeekView`) — cada `TaskCard` arrastável carrega um `group` (`groupKey`
// acima, `(day,priority)`) via `useSortable`. `source.initialGroup` (grupo em
// que o arraste começou) e `source.group` (grupo atual) são o par que decide
// tudo aqui: iguais -> mesmo grupo, nunca mudou de Prioridade/Dia (delega à
// MESMA lógica pura da Story 4.1, escopada só às tarefas desse grupo);
// diferentes -> cruzou grupo, a chamadora (`WeekView`) trata como
// `updateTask` (Dia e/ou Prioridade, sempre numa única chamada, nunca duas).
export function resolveWeekDragChange(tasks: Task[], event: DragEndEvent): WeekDragChange | null {
  if (event.canceled) {
    return null;
  }

  const source = event.operation.source as SortableSourceLike | null;
  if (!source) {
    return null;
  }

  // Revisão da Story 4.2 (blind-hunter): soltar fora de qualquer alvo válido
  // (fora de toda a grade da semana) precisa ser um no-op, mesmo que
  // `source.group` ainda reflita o último grupo sobrevoado durante o
  // arraste — sem checar `target` aqui (só o branch de mesmo grupo, via
  // `move()`, checava isso antes), um drop sem destino real correria o
  // risco de ser tratado como um cruzamento de grupo válido.
  if (!event.operation.target) {
    return null;
  }

  const sourceId = source.id;
  if (typeof sourceId !== 'string') {
    return null;
  }

  const initialGroup = source.initialGroup;
  const currentGroup = source.group;
  if (typeof currentGroup !== 'string' || typeof initialGroup !== 'string') {
    return null;
  }

  if (currentGroup !== initialGroup) {
    const { day, priority } = parseGroupKey(currentGroup);
    return { kind: 'move', id: sourceId, day, priority };
  }

  // Mesmo grupo: MESMA computação pura da Story 4.1 (`resolveDragReorder`),
  // só que escopada ao array de tarefas do grupo em vez de receber essas
  // tarefas já isoladas por um `DragDropProvider` próprio (a 4.1 tinha um
  // provider por grupo; a 4.2 tem um único provider para a semana inteira —
  // ver comentário de `WeekView.tsx`). `move()` de `@dnd-kit/helpers` é pura,
  // só lê `event.operation.{source,target,canceled}`.
  const { day, priority } = parseGroupKey(currentGroup);
  const ids = tasks
    .filter((t) => t.day === day && t.priority === priority)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.id);

  const reordered = move(ids, event);
  // Comparação por conteúdo, não por identidade de referência — `move()`
  // devolve a mesma referência quando não há nada a mover, mas isso é
  // detalhe de implementação de `@dnd-kit/helpers`, não contrato documentado
  // (mesma nota da Story 4.1).
  if (reordered.length === ids.length && reordered.every((id, i) => id === ids[i])) {
    return null;
  }

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
    day: DayOfWeek;
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

  // Cruzamento de grupo (Dia e/ou Prioridade mudaram): SEMPRE uma única
  // chamada a `updateTask` — nunca dois passos, mesmo quando os dois mudam
  // juntos. Título/Estado atuais preservados (mudar Dia/Prioridade por
  // arraste nunca muda o Estado); `updateTask`+`reorderWithinGroup` (AD-7) já
  // reindexam os dois grupos afetados e colocam a tarefa no fim do grupo
  // novo — nenhuma posição exata via arraste (exclusivo do mesmo grupo,
  // Story 4.1).
  return actions.updateTask({
    id: task.id,
    title: task.title,
    day: change.day,
    priority: change.priority,
    state: task.state,
  });
}

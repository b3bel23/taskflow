import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Priority, Task } from '../../types';
import { formatDayHeading } from '../../constants/week';
import { useTaskActions } from '../../state/useTaskActions';
import { groupKey } from '../WeekView/dragChange';
import { registerDragHandle } from '../WeekView/dragHandleRegistry';
import { TaskCard } from '../TaskCard/TaskCard';
import { TaskModal } from '../TaskModal/TaskModal';
import styles from './DayColumn.module.css';

export interface DayColumnProps {
  date: string;
  isToday: boolean;
  tasks: Task[];
}

// Story 4.2 (Epic 4): ordem fixa das 4 zonas de Prioridade por Dia
// (Alta->Média->Baixa->sem prioridade, mesma ordem de `PRIORITY_RANK` em
// `selectors.ts`) — SEMPRE as 4, mesmo vazias (Boundaries: "as 4 zonas de
// Prioridade por dia existem sempre"), nunca derivadas dos segmentos
// contíguos que `groupTasksByPriority` calculava na Story 4.1 (removida
// nesta história: com um único `DragDropProvider` para a semana, inteira,
// cada zona precisa existir mesmo sem nenhuma tarefa hoje, para continuar
// sendo um alvo de arraste válido).
const PRIORITY_ZONES: (Priority | null)[] = ['high', 'medium', 'low', null];

const ZONE_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  none: 'Sem prioridade',
};

function zoneLabelKey(priority: Priority | null): string {
  return priority ?? 'none';
}

interface SortableTaskItemProps {
  task: Task;
  group: string;
  onOpenEdit: (event: MouseEvent<HTMLButtonElement>) => void;
  onCycleState: () => void;
}

// Um item arrastável+soltável (`useSortable`, `@dnd-kit/sortable` —
// migração Epic 4 retro item 11: pacote clássico/estável do `@dnd-kit`, em
// vez do par `@dnd-kit/react`+`@dnd-kit/dom` pre-1.0 usado até então) por
// Card. `setNodeRef` vai no `<li>` (o elemento inteiro é o item soltável da
// lista); `transform`/`transition` viram estilo inline — diferente da versão
// anterior, aqui a lib NUNCA move o nó real no DOM durante o gesto, só
// aplica um `translate3d`/`transition` CSS (reordenação visual "ao vivo"
// dentro do mesmo grupo, sem nenhuma mutação imperativa de DOM colidindo com
// o React — a causa raiz do crash `removeChild` investigado no item 11).
// `setActivatorNodeRef`+`attributes`+`listeners` vão só na alça dedicada
// dentro do `TaskCard` (via `dragHandleProps`) — é isso que faz o sensor de
// ponteiro/teclado ligar só nela, nunca no Card/StateIndicator (ver
// comentário do `TaskCard`). Story 4.2: `group` (chave `(date,priority)` de
// `dragChange.groupKey`) vai no `data` do `useSortable` — é o que permite
// `resolveWeekDragChange` (WeekView) distinguir reordenar (mesmo grupo,
// Story 4.1) de cruzar grupo (Dia e/ou Prioridade mudaram), lido de
// `active.data.current.group`/`over.data.current.group` no `onDragEnd`
// (decisão só no soltar, nunca ao vivo — ver comentário de `dragChange.ts`).
// `registerDragHandle` alimenta o registro module-scope que `WeekView` usa
// para restaurar o foco na alça remontada depois de um cruzamento de grupo
// (Boundaries "Foco") — nunca apagado no desmonte (ver comentário de
// `dragHandleRegistry.ts`), então não precisa de cleanup aqui.
function SortableTaskItem({ task, group, onOpenEdit, onCycleState }: SortableTaskItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { group },
  });

  const combinedHandleRef = useCallback(
    (element: Element | null) => {
      // `setActivatorNodeRef` (`@dnd-kit/sortable`) pede `HTMLElement` —
      // na prática este `ref` sempre planta no `<span>` da alça dedicada
      // (`TaskCard`), nunca em outro tipo de `Element`.
      setActivatorNodeRef(element as HTMLElement | null);
      registerDragHandle(task.id, element);
    },
    [setActivatorNodeRef, task.id],
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onClick={onOpenEdit}
        onCycleState={onCycleState}
        dragHandleRef={combinedHandleRef}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </li>
  );
}

interface EmptyZoneDropTargetProps {
  group: string;
}

// Zona de Prioridade sem nenhuma tarefa hoje (Boundaries + I/O "Zona de
// Prioridade vazia", Story 4.2): mesmo vazia, a zona precisa continuar sendo
// um alvo de arraste válido — sem nenhuma tarefa real para carregar
// `useSortable`, este placeholder (`useDroppable` puro, `@dnd-kit/core` —
// nunca arrastável, só soltável) é quem registra o grupo `(date,priority)`
// como alvo de verdade no `DndContext` único da semana (sem isto,
// `over.data.current.group` nunca existiria ao soltar sobre uma zona vazia —
// ver comentário de `dragChange.ts`). `aria-hidden`: nunca aparece para
// leitor de tela nem para `getAllByRole('listitem')` dos testes (Testing
// Library exclui por padrão elementos fora da árvore de acessibilidade),
// então não interfere com a leitura de "Nenhuma tarefa" nem com a contagem
// de tarefas reais por zona/dia.
function EmptyZoneDropTarget({ group }: EmptyZoneDropTargetProps) {
  const { setNodeRef } = useDroppable({ id: `empty:${group}`, data: { group } });

  return <li ref={setNodeRef} aria-hidden="true" className={styles.emptyZonePlaceholder} />;
}

interface PriorityZoneProps {
  date: string;
  priority: Priority | null;
  tasks: Task[];
  isDragActive: boolean;
  onOpenEdit: (task: Task) => (event: MouseEvent<HTMLButtonElement>) => void;
  onCycleState: (id: string) => void;
}

// Uma das 4 zonas de Prioridade do Dia (Boundaries, Story 4.2): sempre
// renderizada, mesmo sem nenhuma tarefa — é isso que torna qualquer faixa de
// qualquer dia um alvo de arraste válido, não só as que já têm tarefa hoje.
// Discreta fora de um arraste ativo (`isDragActive`, de `useDragOperation` —
// `WeekView` é quem tem o único `DragDropProvider` da semana, este
// componente só lê o estado dele), mais evidente (rótulo visível, área de
// soltar maior na zona vazia) só durante o arraste — decisão de UX
// confirmada com Isabel, adição desta story, fora de `DESIGN.md`.
function PriorityZone({ date, priority, tasks, isDragActive, onOpenEdit, onCycleState }: PriorityZoneProps) {
  const key = groupKey(date, priority);
  const labelKey = zoneLabelKey(priority);
  const zoneClassName = isDragActive ? `${styles.zone} ${styles.zoneActive}` : styles.zone;
  // `SortableContext` (`@dnd-kit/sortable`) só é quem dá a reordenação
  // visual "ao vivo" (CSS transform) dentro do MESMO grupo — precisa da
  // lista de ids na ordem atual. A zona vazia nunca entra aqui: não tem
  // nenhum item sortable, só o `EmptyZoneDropTarget` (droppable puro).
  const ids = tasks.map((task) => task.id);

  return (
    <div className={zoneClassName} data-priority-zone={labelKey}>
      {isDragActive && <span className={styles.zoneLabel}>{ZONE_LABELS[labelKey]}</span>}
      <ul className={styles.zoneList}>
        {tasks.length === 0 ? (
          <EmptyZoneDropTarget group={key} />
        ) : (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                group={key}
                onOpenEdit={onOpenEdit(task)}
                onCycleState={() => onCycleState(task.id)}
              />
            ))}
          </SortableContext>
        )}
      </ul>
    </div>
  );
}

// Coluna do Dia: renderiza as tarefas reais (já filtradas+ordenadas por
// `WeekView` via `sortTasksInDay`) ou "Nenhuma tarefa" quando vazia.
// "+ Adicionar tarefa" abre o `TaskModal` em criação; clicar num `TaskCard`
// (Story 2.2) abre o mesmo `TaskModal` em edição, pré-preenchido. Em ambos
// os casos, `Esc`/sucesso fecham o modal e devolvem o foco ao controle que
// abriu (o botão "+ Adicionar tarefa" ou o próprio Card clicado).
//
// Story 4.2 (Epic 4): deixou de criar seu próprio `DragDropProvider`/
// segmentos contíguos por prioridade (Story 4.1) — isso agora vive uma vez
// só em `WeekView`, dono do único `DndContext` da semana (migração Epic 4
// retro item 11: `@dnd-kit/core`+`@dnd-kit/sortable`). `DayColumn` só
// renderiza as 4 `PriorityZone` fixas (`PRIORITY_ZONES` acima) com as
// tarefas que já recebeu, filtradas por Prioridade — cada zona decide por
// conta própria se tem tarefa (`SortableTaskItem`, reordenável dentro do
// grupo, Story 4.1 intocada) ou não (`EmptyZoneDropTarget`, só um alvo de
// soltar). `useDndContext` (`@dnd-kit/core`) é só leitura do estado do
// `DndContext` de `WeekView` — tolera não ter nenhum provider ancestral
// (retorna `active: null`, mesmo default que os testes deste componente já
// dependiam) — não cria nenhum estado novo aqui, só decide quando mostrar as
// zonas "mais evidentes".
export function DayColumn({ date, isToday, tasks }: DayColumnProps) {
  const columnClassName = isToday ? `${styles.column} ${styles.today}` : styles.column;
  const labelId = `day-label-${date}`;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedCardRef = useRef<HTMLButtonElement | null>(null);
  const { cycleState } = useTaskActions();
  const { active } = useDndContext();
  const isDragActive = active != null;

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    addButtonRef.current?.focus();
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingTask(null);
  }, []);

  const handleOpenEdit = useCallback(
    (task: Task) => (event: MouseEvent<HTMLButtonElement>) => {
      lastFocusedCardRef.current = event.currentTarget;
      setEditingTask(task);
    },
    [],
  );

  // Retrospectiva Epic 2 (achado 1): a checagem `.isConnected` não pode
  // rodar dentro do próprio `closeEditModal` — nesse instante `onClose()`
  // ainda está no meio do mesmo handler que disparou `setEditingTask(null)`,
  // então o React ainda não comitou o re-render (o `<button>` do Card antigo
  // ainda está conectado mesmo quando a edição mudou o Dia da tarefa ou a
  // excluiu, casos em que ele está prestes a ser desmontado). Este efeito só
  // decide o foco depois que o React já aplicou esse re-render — reage à
  // transição `editingTask` de "aberto" para `null`, quando o DOM já reflete
  // a lista de tarefas atualizada desta coluna.
  const wasEditingRef = useRef(false);
  useEffect(() => {
    if (editingTask) {
      wasEditingRef.current = true;
      return;
    }
    if (!wasEditingRef.current) {
      return;
    }
    wasEditingRef.current = false;
    if (lastFocusedCardRef.current?.isConnected) {
      lastFocusedCardRef.current.focus();
    } else {
      addButtonRef.current?.focus();
    }
  }, [editingTask]);

  return (
    <section
      className={columnClassName}
      data-today={isToday}
      aria-current={isToday ? 'date' : undefined}
      aria-labelledby={labelId}
    >
      <h2 id={labelId} className={styles.dayLabel}>
        {formatDayHeading(date)}
      </h2>
      {tasks.length === 0 && <p className={styles.emptyState}>Nenhuma tarefa</p>}
      <div className={styles.taskZones}>
        {PRIORITY_ZONES.map((priority) => (
          <PriorityZone
            key={zoneLabelKey(priority)}
            date={date}
            priority={priority}
            tasks={tasks.filter((task) => task.priority === priority)}
            isDragActive={isDragActive}
            onOpenEdit={handleOpenEdit}
            onCycleState={cycleState}
          />
        ))}
      </div>
      <button
        type="button"
        ref={addButtonRef}
        className={styles.addTaskButton}
        onClick={() => setIsAddModalOpen(true)}
      >
        + Adicionar tarefa
      </button>
      {isAddModalOpen && <TaskModal date={date} onClose={closeAddModal} />}
      {editingTask && <TaskModal key={editingTask.id} date={date} task={editingTask} onClose={closeEditModal} />}
    </section>
  );
}

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useDragOperation } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import type { DayOfWeek, Priority, Task } from '../../types';
import { DAY_LABELS } from '../../constants/days';
import { useTaskActions } from '../../state/useTaskActions';
import { groupKey } from '../WeekView/dragChange';
import { registerDragHandle } from '../WeekView/dragHandleRegistry';
import { TaskCard } from '../TaskCard/TaskCard';
import { TaskModal } from '../TaskModal/TaskModal';
import styles from './DayColumn.module.css';

export interface DayColumnProps {
  day: DayOfWeek;
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
  index: number;
  group: string;
  onOpenEdit: (event: MouseEvent<HTMLButtonElement>) => void;
  onCycleState: () => void;
}

// Um item arrastável+soltável (`useSortable`, `@dnd-kit/react/sortable`) por
// Card. `ref` vai no `<li>` (o elemento inteiro vira o alvo de
// arrastar/soltar do @dnd-kit — sombra/rotação e o placeholder tracejado no
// destino são estilizados em `DayColumn.module.css` via os atributos que a
// própria lib põe nesse elemento durante o arraste); `handleRef` só na alça
// dedicada dentro do `TaskCard` — é isso que faz o sensor de ponteiro/
// teclado ligar só nela, nunca no Card/StateIndicator (ver comentário do
// `TaskCard`). Story 4.2: `group` (chave `(day,priority)` de
// `dragChange.groupKey`) é o que permite `resolveWeekDragChange` (WeekView)
// distinguir reordenar (mesmo grupo, Story 4.1) de cruzar grupo (Dia e/ou
// Prioridade mudaram). `registerDragHandle` alimenta o registro
// module-scope que `WeekView` usa para restaurar o foco na alça remontada
// depois de um cruzamento de grupo (Boundaries "Foco") — nunca apagado no
// desmonte (ver comentário de `dragHandleRegistry.ts`), então não precisa de
// cleanup aqui.
function SortableTaskItem({ task, index, group, onOpenEdit, onCycleState }: SortableTaskItemProps) {
  const { ref, handleRef, isDragging } = useSortable({ id: task.id, index, group });

  const combinedHandleRef = useCallback(
    (element: Element | null) => {
      handleRef(element);
      registerDragHandle(task.id, element);
    },
    [handleRef, task.id],
  );

  return (
    <li ref={ref}>
      <TaskCard
        task={task}
        onClick={onOpenEdit}
        onCycleState={onCycleState}
        dragHandleRef={combinedHandleRef}
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
// `useSortable`/`group`, este placeholder (nunca arrastável,
// `disabled: { draggable: true }`) é quem registra o grupo `(day,priority)`
// como `Droppable` de verdade no `DragDropManager` único da semana (sem
// isto, `source.group` nunca seria atualizado ao soltar sobre uma zona
// vazia — ver comentário de `dragChange.ts`). `aria-hidden`: nunca aparece
// para leitor de tela nem para `getAllByRole('listitem')` dos testes
// (Testing Library exclui por padrão elementos fora da árvore de
// acessibilidade), então não interfere com a leitura de "Nenhuma tarefa"
// nem com a contagem de tarefas reais por zona/dia.
function EmptyZoneDropTarget({ group }: EmptyZoneDropTargetProps) {
  const { ref } = useSortable({ id: `empty:${group}`, index: 0, group, disabled: { draggable: true } });

  return <li ref={ref} aria-hidden="true" className={styles.emptyZonePlaceholder} />;
}

interface PriorityZoneProps {
  day: DayOfWeek;
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
function PriorityZone({ day, priority, tasks, isDragActive, onOpenEdit, onCycleState }: PriorityZoneProps) {
  const key = groupKey(day, priority);
  const labelKey = zoneLabelKey(priority);
  const zoneClassName = isDragActive ? `${styles.zone} ${styles.zoneActive}` : styles.zone;

  return (
    <div className={zoneClassName} data-priority-zone={labelKey}>
      {isDragActive && <span className={styles.zoneLabel}>{ZONE_LABELS[labelKey]}</span>}
      <ul className={styles.zoneList}>
        {tasks.length === 0 ? (
          <EmptyZoneDropTarget group={key} />
        ) : (
          tasks.map((task, index) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              index={index}
              group={key}
              onOpenEdit={onOpenEdit(task)}
              onCycleState={() => onCycleState(task.id)}
            />
          ))
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
// só em `WeekView`, dono do único `DragDropManager` da semana. `DayColumn`
// só renderiza as 4 `PriorityZone` fixas (`PRIORITY_ZONES` acima) com as
// tarefas que já recebeu, filtradas por Prioridade — cada zona decide por
// conta própria se tem tarefa (`SortableTaskItem`, reordenável dentro do
// grupo, Story 4.1 intocada) ou não (`EmptyZoneDropTarget`, só um alvo de
// soltar). `useDragOperation` (também `@dnd-kit/react`) é só leitura do
// estado do `DragDropProvider` de `WeekView` — não cria nenhum estado novo
// aqui, só decide quando mostrar as zonas "mais evidentes".
export function DayColumn({ day, isToday, tasks }: DayColumnProps) {
  const columnClassName = isToday ? `${styles.column} ${styles.today}` : styles.column;
  const labelId = `day-label-${day}`;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedCardRef = useRef<HTMLButtonElement | null>(null);
  const { cycleState } = useTaskActions();
  const { source } = useDragOperation();
  const isDragActive = source != null;

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
        {DAY_LABELS[day]}
      </h2>
      {tasks.length === 0 && <p className={styles.emptyState}>Nenhuma tarefa</p>}
      <div className={styles.taskZones}>
        {PRIORITY_ZONES.map((priority) => (
          <PriorityZone
            key={zoneLabelKey(priority)}
            day={day}
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
      {isAddModalOpen && <TaskModal day={day} onClose={closeAddModal} />}
      {editingTask && <TaskModal key={editingTask.id} day={day} task={editingTask} onClose={closeEditModal} />}
    </section>
  );
}

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { move } from '@dnd-kit/helpers';
import type { DayOfWeek, Task } from '../../types';
import { DAY_LABELS } from '../../constants/days';
import { useTaskActions } from '../../state/useTaskActions';
import { TaskCard } from '../TaskCard/TaskCard';
import { TaskModal } from '../TaskModal/TaskModal';
import styles from './DayColumn.module.css';

export interface DayColumnProps {
  day: DayOfWeek;
  isToday: boolean;
  tasks: Task[];
}

// Story 4.1 (Epic 4): `tasks` chega de `WeekView` já ordenada por
// `sortTasksInDay` (prioridade, depois `order`) — cada nível de prioridade é
// por isso uma sequência *contígua* no array recebido. Agrupa essa sequência
// em segmentos por `priority` (chave estável entre renders: não pode haver
// dois segmentos com a mesma prioridade num array já ordenado assim) — cada
// segmento vira seu próprio contexto `@dnd-kit` (`TaskPriorityGroup`
// abaixo), isolando fisicamente os grupos: nunca existe um `Droppable` de
// outro grupo para colidir, então cruzar prioridade por arraste é
// estruturalmente impossível nesta história (Story 4.2 cuida disso depois).
export interface PriorityGroup {
  key: string;
  tasks: Task[];
}

// Exportada (revisão da Story 4.1, verification-gap): decide quais tarefas
// compartilham um `TaskPriorityGroup`/`DragDropProvider` — ou seja, quais
// podem ser reordenadas entre si. `TaskPriorityGroup` não renderiza nenhum
// nó DOM próprio, então um agrupamento incorreto (ex. cada tarefa isolada no
// próprio grupo) seria invisível olhando só a ordem no DOM renderizado —
// testada diretamente aqui em vez de só indiretamente.
export function groupTasksByPriority(tasks: Task[]): PriorityGroup[] {
  const groups: PriorityGroup[] = [];
  for (const task of tasks) {
    const key = task.priority ?? 'none';
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.key === key) {
      currentGroup.tasks.push(task);
    } else {
      groups.push({ key, tasks: [task] });
    }
  }
  return groups;
}

interface SortableTaskItemProps {
  task: Task;
  index: number;
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
// `TaskCard`).
function SortableTaskItem({ task, index, onOpenEdit, onCycleState }: SortableTaskItemProps) {
  const { ref, handleRef, isDragging } = useSortable({ id: task.id, index });

  return (
    <li ref={ref}>
      <TaskCard
        task={task}
        onClick={onOpenEdit}
        onCycleState={onCycleState}
        dragHandleRef={handleRef}
        isDragging={isDragging}
      />
    </li>
  );
}

interface TaskPriorityGroupProps {
  tasks: Task[];
  onOpenEdit: (task: Task) => (event: MouseEvent<HTMLButtonElement>) => void;
  onCycleState: (id: string) => void;
  reorderTask: (id: string, toIndex: number) => void;
}

// Extraído de `handleDragEnd` (abaixo) para ser testável sem simular um
// gesto físico de arraste: `move()` de `@dnd-kit/helpers` é pura — só lê
// `event.operation.{source,target,canceled}` (nenhuma medição real de DOM
// para o caso de array plano de ids que usamos aqui) — então um teste pode
// construir um `DragEndEvent` sintético e chamar esta função diretamente,
// cobrindo a MESMA lógica que o mouse e o sensor de teclado do @dnd-kit
// disparam (ambos produzem o mesmo formato de evento). O que fica de fora
// (e seria só verificável manualmente): se o @dnd-kit em si dispara esse
// evento corretamente a partir de um gesto físico real — limitação conhecida
// de testar consumidores de @dnd-kit sob jsdom.
export function resolveDragReorder(tasks: Task[], event: DragEndEvent): { id: string; toIndex: number } | null {
  if (event.canceled) {
    return null;
  }

  const ids = tasks.map((t) => t.id);
  const reordered = move(ids, event);
  // Revisão da Story 4.1 (blind-hunter): compara por conteúdo, não por
  // identidade de referência — `move()` devolve a mesma referência quando
  // não há nada a mover (ex. sem `target` válido), mas esse é um detalhe de
  // implementação de `@dnd-kit/helpers`, não um contrato documentado; uma
  // comparação por conteúdo continua correta mesmo que isso mude no futuro.
  if (reordered.length === ids.length && reordered.every((id, i) => id === ids[i])) {
    return null;
  }

  const sourceId = event.operation.source?.id;
  if (typeof sourceId !== 'string') {
    return null;
  }

  const toIndex = reordered.indexOf(sourceId);
  if (toIndex === -1) {
    return null;
  }

  return { id: sourceId, toIndex };
}

// Um `<DragDropProvider>` por grupo `(day, priority)` — instância própria de
// `DragDropManager` (isolamento estrutural entre grupos, ver comentário de
// `groupTasksByPriority`). Não renderiza nenhum elemento DOM próprio (só
// Context.Provider + os `<li>` filhos), então continua produzindo `<ul><li>`
// válido dentro de `DayColumn`.
function TaskPriorityGroup({ tasks, onOpenEdit, onCycleState, reorderTask }: TaskPriorityGroupProps) {
  // `resolveDragReorder` (acima) faz a leitura pura do evento — funciona
  // igual para arraste por mouse e pelo sensor de teclado (Enter/Espaço+
  // setas+Enter), já que ambos produzem o mesmo formato de evento. Esc
  // cancela (`event.canceled`) sem chamar `reorderTask` — o próprio
  // @dnd-kit devolve o Card à posição original visualmente, nada é
  // persistido (I/O "Cancelar via teclado"). Grupo com 1 tarefa: não há
  // para onde mover, `resolveDragReorder` devolve `null` — `reorderTask`
  // nunca chega a ser chamado (I/O "Grupo com 1 tarefa"). Única chamadora:
  // nenhum dispatch cru a partir do handler de arraste (guard AD-4 vive
  // inteiro dentro de `useTaskActions.reorderTask`, inclusive o "sem retry
  // automático" em caso de falha de escrita — se `saveTasks` falhar, o
  // estado em memória não muda, `tasks` desta coluna continua na ordem
  // antiga no próximo render, e o Card volta sozinho à posição original
  // pela própria animação de drop do @dnd-kit).
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const result = resolveDragReorder(tasks, event);
      if (result) {
        reorderTask(result.id, result.toIndex);
      }
    },
    [tasks, reorderTask],
  );

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      {tasks.map((task, index) => (
        <SortableTaskItem
          key={task.id}
          task={task}
          index={index}
          onOpenEdit={onOpenEdit(task)}
          onCycleState={() => onCycleState(task.id)}
        />
      ))}
    </DragDropProvider>
  );
}

// Coluna do Dia: renderiza as tarefas reais (já filtradas+ordenadas por
// `WeekView` via `sortTasksInDay`) ou "Nenhuma tarefa" quando vazia.
// "+ Adicionar tarefa" abre o `TaskModal` em criação; clicar num `TaskCard`
// (Story 2.2) abre o mesmo `TaskModal` em edição, pré-preenchido. Em ambos
// os casos, `Esc`/sucesso fecham o modal e devolvem o foco ao controle que
// abriu (o botão "+ Adicionar tarefa" ou o próprio Card clicado). Story 4.1:
// dentro de cada nível de prioridade, os Cards também podem ser reordenados
// por arraste (`TaskPriorityGroup`/`SortableTaskItem` acima).
export function DayColumn({ day, isToday, tasks }: DayColumnProps) {
  const columnClassName = isToday ? `${styles.column} ${styles.today}` : styles.column;
  const labelId = `day-label-${day}`;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedCardRef = useRef<HTMLButtonElement | null>(null);
  const { cycleState, reorderTask } = useTaskActions();

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
      {tasks.length === 0 ? (
        <p className={styles.emptyState}>Nenhuma tarefa</p>
      ) : (
        <ul className={styles.taskList}>
          {groupTasksByPriority(tasks).map((group) => (
            <TaskPriorityGroup
              key={group.key}
              tasks={group.tasks}
              onOpenEdit={handleOpenEdit}
              onCycleState={cycleState}
              reorderTask={reorderTask}
            />
          ))}
        </ul>
      )}
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

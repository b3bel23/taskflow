import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getTodayISO, getWeekWindow } from '../../constants/week';
import { sortTasksInDay } from '../../state/selectors';
import { useTaskContext } from '../../state/TaskContext';
import { useTaskActions } from '../../state/useTaskActions';
import { DayColumn } from '../DayColumn/DayColumn';
import { applyWeekDragChange, resolveWeekDragChange } from './dragChange';
import { getDragHandle, isDragHandleFocused } from './dragHandleRegistry';
import styles from './WeekView.module.css';

// Story 5.3 (AD-10): "checagem a cada ~60s é suficiente — não precisa de
// precisão de segundo".
const WINDOW_RECHECK_INTERVAL_MS = 60_000;

// Grade das 7 Colunas do Dia, hoje..hoje+6 (Story 5.2, AD-10), todas
// simultâneas, sem navegação. Lê `TaskContext` e entrega a cada `DayColumn`
// só as tarefas da sua própria Data, já ordenadas por Horário
// (`sortTasksInDay`, Story 6.2) — `DayColumn` só renderiza o que recebe,
// nunca filtra/ordena por conta própria.
//
// Story 4.2 revisada (Epic 4): único `<DndContext>` para a semana inteira —
// cada `DayColumn` é agora o único alvo soltável (coluna inteira, não mais
// zonas de Prioridade por dia — AD-7 obsoleto). Arrastar um Card para
// qualquer lugar de outra coluna muda só a Data (`moveTaskToDate`), nunca
// Horário/Prioridade/Estado. `sortableKeyboardCoordinates`
// (`@dnd-kit/sortable`) continua sendo o `coordinateGetter` do sensor de
// teclado mesmo sem `useSortable`/`SortableContext`: ele já opera de forma
// genérica sobre TODOS os alvos soltáveis registrados no `DndContext`
// (`droppableContainers`), filtrados por direção — não é exclusivo de listas
// sortable, é o que permite a seta do teclado alcançar a coluna vizinha.
export function WeekView() {
  const { state } = useTaskContext();
  const { moveTaskToDate, applyRollover } = useTaskActions();

  // Story 5.3: a janela vira estado React (inicializada uma vez por
  // montagem via inicializador preguiçoso) para poder ser recalculada pelo
  // timer abaixo sem depender de nada externo forçando um re-render.
  const [week, setWeek] = useState<string[]>(() => getWeekWindow());
  const today = week[0];

  // Foco pós-mudança de Data (Boundaries "Foco", Story 4.2): a tarefa
  // movida sai da lista de uma coluna e entra em outra — o React desmonta o
  // nó DOM antigo da alça e monta um novo. Se essa alça tinha o foco no
  // instante do drop (arraste por teclado), o desmonte derruba o foco para
  // `<body>` antes do próximo render aplicar o nó novo. Este ref só guarda o
  // id quando a alça movida de fato tinha o foco, e o efeito abaixo, disparado
  // pela mudança de `state.tasks`, decide o foco só depois que o React já
  // commitou o próximo render.
  const focusRestoreTaskIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const change = resolveWeekDragChange(event);
      if (!change) {
        return;
      }

      const wasHandleFocused = isDragHandleFocused(change.id);
      const result = applyWeekDragChange(change, { moveTaskToDate });

      if (wasHandleFocused && result.ok) {
        focusRestoreTaskIdRef.current = change.id;
      }
    },
    [moveTaskToDate],
  );

  useEffect(() => {
    const taskId = focusRestoreTaskIdRef.current;
    if (!taskId) {
      return;
    }
    focusRestoreTaskIdRef.current = null;
    getDragHandle(taskId)?.focus();
  }, [state.tasks]);

  // Story 5.4 (AD-11): toda vez que a janela é (re)calculada — ao montar e
  // sempre que o timer abaixo detecta virada de dia (`today` muda) — roda
  // uma passada de rollover. Depende só de `today`, nunca de `applyRollover`
  // em si: a identidade desse callback muda a cada `state.tasks` novo
  // (inclusive o que o próprio rollover acabou de produzir), e a função já é
  // um no-op quando não há nada a rolar (compara referência, não escreve à
  // toa) — incluí-la nas deps só causaria reexecuções redundantes sem mudar
  // o resultado.
  //
  // Se a escrita falhar (`saveTasks` → `{ ok: false }`, ex. cota cheia), as
  // tarefas atrasadas continuam com a `date` antiga — fora da janela, ou seja,
  // invisíveis em qualquer coluna. Por isso o resultado não é ignorado:
  // `rolloverFailed` mostra um aviso e o timer abaixo repete a tentativa a
  // cada tick até dar certo. `applyRolloverRef` evita que o `setInterval`
  // enxergue um `state.tasks` velho (a identidade do callback muda a cada
  // atualização de tarefas, mas o intervalo só é recriado quando `today` ou
  // `rolloverFailed` mudam).
  const [rolloverFailed, setRolloverFailed] = useState(false);
  const applyRolloverRef = useRef(applyRollover);
  useEffect(() => {
    applyRolloverRef.current = applyRollover;
  }, [applyRollover]);

  useEffect(() => {
    setRolloverFailed(!applyRolloverRef.current(today).ok);
  }, [today]);

  // Story 5.3 (AD-10): timer periódico (~60s) comparando a data corrente com
  // a usada para calcular `week` — só recomputa (e portanto só re-renderiza)
  // quando a data efetivamente mudou, nunca a cada tick. Sem virada de dia,
  // só repete o rollover quando a tentativa anterior falhou.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (getTodayISO() !== today) {
        setWeek(getWeekWindow());
      } else if (rolloverFailed) {
        setRolloverFailed(!applyRolloverRef.current(today).ok);
      }
    }, WINDOW_RECHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [today, rolloverFailed]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {rolloverFailed && (
        <p className={styles.rolloverError} role="alert">
          Não foi possível mover as tarefas atrasadas para hoje. Vamos tentar de novo em instantes.
        </p>
      )}
      <main className={styles.grid}>
        {week.map((date) => (
          <DayColumn key={date} date={date} isToday={date === today} tasks={sortTasksInDay(state.tasks, date)} />
        ))}
      </main>
    </DndContext>
  );
}

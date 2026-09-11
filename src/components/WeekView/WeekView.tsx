import { DAYS_OF_WEEK, getTodayDayOfWeek } from '../../constants/days';
import { sortTasksInDay } from '../../state/selectors';
import { useTaskContext } from '../../state/TaskContext';
import { DayColumn } from '../DayColumn/DayColumn';
import styles from './WeekView.module.css';

// Grade das 7 Colunas do Dia, Segunda->Domingo, todas simultâneas, sem
// navegação. Lê `TaskContext` e entrega a cada `DayColumn` só as tarefas do
// seu próprio dia, já ordenadas por prioridade (`sortTasksInDay`, AD-7) —
// `DayColumn` só renderiza o que recebe, nunca filtra/ordena por conta
// própria.
export function WeekView() {
  const { state } = useTaskContext();
  const today = getTodayDayOfWeek();

  return (
    <main className={styles.grid}>
      {DAYS_OF_WEEK.map((day) => (
        <DayColumn key={day} day={day} isToday={day === today} tasks={sortTasksInDay(state.tasks, day)} />
      ))}
    </main>
  );
}

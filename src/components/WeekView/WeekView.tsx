import { DAYS_OF_WEEK, getTodayDayOfWeek } from '../../constants/days';
import { DayColumn } from '../DayColumn/DayColumn';
import styles from './WeekView.module.css';

// Grade das 7 Colunas do Dia, Segunda->Domingo, todas simultâneas,
// sem navegação. Sem persistência/dado real de tarefa ainda (Stories
// 1.2 e Epic 2) — cada coluna renderiza vazia.
export function WeekView() {
  const today = getTodayDayOfWeek();

  return (
    <main className={styles.grid}>
      {DAYS_OF_WEEK.map((day) => (
        <DayColumn key={day} day={day} isToday={day === today} />
      ))}
    </main>
  );
}

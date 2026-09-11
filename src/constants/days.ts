import type { DayOfWeek } from '../types';

// Ordem fixa Segunda -> Domingo. Fonte única de verdade para qualquer
// componente que precise iterar os 7 dias da semana.
export const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Segunda-feira',
  tue: 'Terça-feira',
  wed: 'Quarta-feira',
  thu: 'Quinta-feira',
  fri: 'Sexta-feira',
  sat: 'Sábado',
  sun: 'Domingo',
};

// `Date#getDay()` é 0-indexado a partir de domingo (0=domingo..6=sábado).
// Este mapeamento traduz esse índice para a ordem Segunda->Domingo usada
// em toda a aplicação, incluindo o caso de borda em que "hoje" é domingo
// (índice 0 do JS, mas último dia da nossa ordem).
const JS_DAY_TO_DAY_OF_WEEK: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const getTodayDayOfWeek = (): DayOfWeek => JS_DAY_TO_DAY_OF_WEEK[new Date().getDay()];

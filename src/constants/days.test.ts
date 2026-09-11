import { afterEach, describe, expect, it, vi } from 'vitest';
import { DAYS_OF_WEEK, getTodayDayOfWeek } from './days';

describe('getTodayDayOfWeek', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const cases: Array<[string, string, (typeof DAYS_OF_WEEK)[number]]> = [
    ['2026-09-07', 'segunda', 'mon'],
    ['2026-09-08', 'terça', 'tue'],
    ['2026-09-09', 'quarta', 'wed'],
    ['2026-09-10', 'quinta', 'thu'],
    ['2026-09-11', 'sexta', 'fri'],
    ['2026-09-12', 'sábado', 'sat'],
    ['2026-09-13', 'domingo', 'sun'],
  ];

  it.each(cases)('mapeia %s (%s) para "%s"', (isoDate, _label, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${isoDate}T12:00:00`));
    expect(getTodayDayOfWeek()).toBe(expected);
  });

  it('mapeia domingo (getDay() === 0) para o último dia da ordem Segunda->Domingo, não o primeiro', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T12:00:00'));
    expect(new Date().getDay()).toBe(0);
    expect(getTodayDayOfWeek()).toBe(DAYS_OF_WEEK[DAYS_OF_WEEK.length - 1]);
  });
});

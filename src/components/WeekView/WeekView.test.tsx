import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeekView } from './WeekView';
import { DAY_LABELS } from '../../constants/days';
import dayColumnStyles from '../DayColumn/DayColumn.module.css';

describe('WeekView', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza os 7 dias, Segunda->Domingo, todos simultâneos, sem navegação', () => {
    render(<WeekView />);

    const labels = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);
    expect(labels).toEqual([
      DAY_LABELS.mon,
      DAY_LABELS.tue,
      DAY_LABELS.wed,
      DAY_LABELS.thu,
      DAY_LABELS.fri,
      DAY_LABELS.sat,
      DAY_LABELS.sun,
    ]);
    expect(screen.queryAllByRole('button', { name: /próxima|anterior|next|previous/i })).toHaveLength(0);
  });

  it('destaca só a coluna do dia atual quando hoje é um dia de meio de semana', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T12:00:00')); // quarta-feira

    const { container } = render(<WeekView />);
    const highlighted = container.querySelectorAll('[data-today="true"]');

    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].textContent).toContain(DAY_LABELS.wed);
    expect(highlighted[0].classList.contains(dayColumnStyles.today)).toBe(true);
  });

  it('destaca a coluna Domingo (última) quando hoje é domingo (getDay() === 0)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T12:00:00')); // domingo

    const { container } = render(<WeekView />);
    const highlighted = container.querySelectorAll('[data-today="true"]');
    const allColumns = container.querySelectorAll('[data-today]');

    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].textContent).toContain(DAY_LABELS.sun);
    expect(allColumns[allColumns.length - 1]).toBe(highlighted[0]);
    expect(highlighted[0].classList.contains(dayColumnStyles.today)).toBe(true);
  });
});

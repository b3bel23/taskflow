import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDayHeading, getTodayISO, getWeekWindow, getWeekdayIndex, getWeekdayLabel } from './week';

// Mesmo espírito do antigo `days.test.ts` (Story 5.1 deletou-o): todo
// "esperado" aqui é um literal fixo, escrito à mão, NUNCA construído
// chamando as próprias funções deste módulo — senão uma regressão na lógica
// de mapeamento dia-da-semana/formatação passaria despercebida (esperado e
// obtido derivando juntos do mesmo bug).
describe('getWeekdayLabel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const cases: Array<[string, string, string]> = [
    ['2026-09-14', 'segunda', 'Segunda-feira'],
    ['2026-09-15', 'terça', 'Terça-feira'],
    ['2026-09-16', 'quarta', 'Quarta-feira'],
    ['2026-09-17', 'quinta', 'Quinta-feira'],
    ['2026-09-18', 'sexta', 'Sexta-feira'],
    ['2026-09-19', 'sábado', 'Sábado'],
    ['2026-09-20', 'domingo', 'Domingo'],
  ];

  it.each(cases)('mapeia %s (%s) para "%s"', (isoDate, _label, expected) => {
    expect(getWeekdayLabel(isoDate)).toBe(expected);
  });

  it('domingo (getDay() === 0) mapeia para "Domingo", não para o primeiro rótulo da lista por engano', () => {
    expect(new Date('2026-09-20T12:00:00').getDay()).toBe(0);
    expect(getWeekdayLabel('2026-09-20')).toBe('Domingo');
  });
});

describe('getWeekdayIndex', () => {
  it('domingo (2026-09-20) é o índice 0 de Date#getDay()', () => {
    expect(getWeekdayIndex('2026-09-20')).toBe(0);
  });

  it('sábado (2026-09-19) é o índice 6 de Date#getDay()', () => {
    expect(getWeekdayIndex('2026-09-19')).toBe(6);
  });

  it('sexta-feira (2026-09-18) é o índice 5 de Date#getDay()', () => {
    expect(getWeekdayIndex('2026-09-18')).toBe(5);
  });
});

describe('formatDayHeading', () => {
  it('combina nome do dia + DD/MM (ex. "Sexta-feira, 18/09")', () => {
    expect(formatDayHeading('2026-09-18')).toBe('Sexta-feira, 18/09');
  });

  it('domingo: "Domingo, 20/09"', () => {
    expect(formatDayHeading('2026-09-20')).toBe('Domingo, 20/09');
  });

  it('dia e mês de um único dígito ganham zero à esquerda (05/01, nunca 5/1)', () => {
    // 2026-01-05 é uma segunda-feira.
    expect(formatDayHeading('2026-01-05')).toBe('Segunda-feira, 05/01');
  });
});

describe('getWeekWindow', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('7 datas ISO consecutivas, âncora..âncora+6', () => {
    expect(getWeekWindow(new Date(2026, 8, 18))).toEqual([
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
    ]);
  });

  it('cruza fronteira de mês/ano: âncora 2026-12-29 -> janela entra em janeiro de 2027', () => {
    expect(getWeekWindow(new Date(2026, 11, 29))).toEqual([
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
      '2027-01-04',
    ]);
  });

  it('sem âncora explícita, usa "hoje" (sistema de horário mockado)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T12:00:00'));

    expect(getWeekWindow()).toEqual([
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
    ]);
  });
});

describe('getTodayISO', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna a data de hoje em ISO local (YYYY-MM-DD)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T23:59:00'));

    expect(getTodayISO()).toBe('2026-09-18');
  });

  it('início do dia (00:00) ainda cai no mesmo dia local, nunca desloca para o dia anterior (UTC)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T00:00:01'));

    expect(getTodayISO()).toBe('2026-01-05');
  });
});

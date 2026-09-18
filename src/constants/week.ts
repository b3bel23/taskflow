// Substitui `src/constants/days.ts` (Story 5.1): a semana deixa de ser 7
// dias-da-semana abstratos (`DayOfWeek`, fixos Segunda->Domingo) e passa a
// ser uma janela dinâmica de 7 datas reais, `hoje..hoje+6`. Nenhum timer de
// recálculo automático ainda (Story 5.3, próxima spec) — `getWeekWindow()` é
// chamada direto no corpo de render de `WeekView`, recalculada a cada
// render/montagem, sem `useEffect`/estado próprio.
//
// Datas são sempre strings ISO (`'YYYY-MM-DD'`) em horário LOCAL — nunca
// `date.toISOString()` (UTC) nem `new Date(iso)` para reconstruir uma data a
// partir de uma dessas strings (`new Date('YYYY-MM-DD')` do JS nativo
// interpreta a string como meia-noite UTC, o que desloca um dia para trás em
// fusos horários negativos). `toISODate`/`parseISODateLocal` abaixo são a
// única via de conversão entre `Date` e essas strings neste módulo — todo o
// resto do arquivo (e `migrateFromV1` em `tasksStorage.ts`, que reaproveita
// `getWeekdayIndex`) passa só por elas.
const WEEKDAY_LABELS: readonly string[] = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

// Exportadas (além de uso interno) para `tasksStorage.ts` reaproveitar no
// round-trip de validação de calendário (`isValidTask`/`isValidTaskV1`): uma
// string como `'2026-02-30'` bate `ISO_DATE_PATTERN` (lexicamente válida),
// mas `parseISODateLocal` + `toISODate` não voltam à mesma string (`Date`
// normaliza o overflow para o dia seguinte), o que expõe a
// inconsistência sem precisar de outra lib de datas.
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseISODateLocal(dateISO: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Data de hoje em ISO local (`'YYYY-MM-DD'`) — âncora padrão de
// `getWeekWindow()` e base do destaque "hoje" em `WeekView`.
export function getTodayISO(): string {
  return toISODate(new Date());
}

// 7 datas ISO consecutivas, `anchor..anchor+6` (âncora padrão: hoje). Nunca
// `DAYS_OF_WEEK` estático — a ordem de exibição das 7 colunas é sempre esta
// janela, recalculada a cada chamada (sem cache/memoização própria).
export function getWeekWindow(anchor: Date = new Date()): string[] {
  const window: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + offset);
    window.push(toISODate(day));
  }
  return window;
}

// Índice de `Date#getDay()` (0=domingo..6=sábado) de uma data ISO — extraído
// para ser a única via de "qual dia-da-semana é esta data ISO", reaproveitado
// tanto por `getWeekdayLabel`/`formatDayHeading` abaixo quanto por
// `migrateFromV1` (`tasksStorage.ts`, mapeia `DayOfWeek` salvo em v1 para a
// data real correspondente dentro da janela).
export function getWeekdayIndex(dateISO: string): number {
  return parseISODateLocal(dateISO).getDay();
}

// Nome do dia-da-semana por extenso (ex. "Sexta-feira") de uma data ISO —
// mesmos rótulos em português que `DAY_LABELS` tinha em `days.ts` (deletado
// nesta história), agora derivados da data real em vez de uma chave
// `DayOfWeek` fixa.
export function getWeekdayLabel(dateISO: string): string {
  return WEEKDAY_LABELS[getWeekdayIndex(dateISO)];
}

// Cabeçalho de coluna/Dia no Modal (ex. "Sexta-feira, 18/09") — nome do
// dia-da-semana + `DD/MM` da data real, usado por `DayColumn`/`TaskModal`
// (Boundaries: "DayColumn/TaskCard exibem a data real formatada junto ao
// nome do dia da semana").
export function formatDayHeading(dateISO: string): string {
  const date = parseISODateLocal(dateISO);
  return `${getWeekdayLabel(dateISO)}, ${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
}

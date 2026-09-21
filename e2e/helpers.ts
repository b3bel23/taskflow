import { expect, type Locator, type Page } from '@playwright/test';

// Relógio e fuso fixos: "hoje" é sempre a sexta-feira 18/09/2026, em qualquer
// máquina (o fuso vem de `playwright.config.ts`, o relógio de `page.clock`).
export const NOW = '2026-09-18T12:00:00-03:00';
export const TODAY = '2026-09-18';

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// `YYYY-MM-DD` + n dias, em aritmética de calendário puro (sem `Date` local,
// que dependeria do fuso da máquina que roda o teste).
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

// Rótulo de coluna exatamente como o app mostra: "Sexta-feira, 18/09".
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

export interface StoredTask {
  id: string;
  title: string;
  date: string;
  time: string | null;
  state: 'pending' | 'in_progress' | 'done';
  priority: 'high' | 'medium' | 'low' | null;
  order: number;
}

export function makeTask(overrides: Partial<StoredTask> & Pick<StoredTask, 'id' | 'title'>): StoredTask {
  return { date: TODAY, time: null, state: 'pending', priority: null, order: 0, ...overrides };
}

export const envelope = (tasks: StoredTask[]) => JSON.stringify({ schemaVersion: 2, tasks });

interface OpenOptions {
  now?: string;
  // Valor CRU de `taskflow:tasks` gravado antes do app carregar.
  rawTasks?: string;
  theme?: 'light' | 'dark';
}

// Abre o app com o relógio fixo. Para pré-carregar dados, grava no
// localStorage e recarrega (um `addInitScript` regravaria a cada reload e
// apagaria o que o próprio teste salvou).
export async function openApp(page: Page, options: OpenOptions = {}): Promise<void> {
  await page.clock.install({ time: new Date(options.now ?? NOW) });
  await page.goto('./');
  if (options.rawTasks !== undefined || options.theme) {
    await page.evaluate(
      ({ rawTasks, theme }) => {
        if (rawTasks !== undefined) window.localStorage.setItem('taskflow:tasks', rawTasks);
        if (theme) window.localStorage.setItem('taskflow:theme', theme);
      },
      { rawTasks: options.rawTasks, theme: options.theme },
    );
    await page.reload();
  }
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
}

export const column = (page: Page, iso: string): Locator => page.getByRole('region', { name: dayLabel(iso) });

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// O cartão é um botão com nome "Editar tarefa: <título>" (mais ", às HH:mm"
// quando há horário).
export const card = (scope: Page | Locator, title: string): Locator =>
  scope.getByRole('button', { name: new RegExp(`^Editar tarefa: ${escapeRegExp(title)}(,|$)`) });

// Abre o modal de edição clicando no TÍTULO do cartão. O centro geométrico do
// cartão pode cair em cima da tag de prioridade ou do indicador de estado
// (controles próprios, que não abrem o modal) — um usuário clica no texto.
export const openCard = (scope: Page | Locator, title: string): Promise<void> =>
  card(scope, title).getByText(title, { exact: true }).click();

export const dragHandle = (scope: Page | Locator, title: string): Locator =>
  scope.getByRole('button', { name: `Arrastar tarefa: ${title}` });

// Títulos das tarefas de uma coluna, na ordem exibida.
export const titlesIn = (scope: Locator): Locator => scope.locator('li p');

export async function readTasks(page: Page): Promise<StoredTask[] | null> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('taskflow:tasks');
    return raw ? (JSON.parse(raw).tasks as StoredTask[]) : null;
  });
}

export async function readEnvelope(page: Page): Promise<{ schemaVersion: number; tasks: StoredTask[] } | null> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('taskflow:tasks');
    return raw ? JSON.parse(raw) : null;
  });
}

interface CreateOptions {
  time?: string;
  priority?: 'Alta' | 'Média' | 'Baixa';
}

export async function createTask(page: Page, iso: string, title: string, options: CreateOptions = {}): Promise<void> {
  await column(page, iso).getByRole('button', { name: '+ Adicionar tarefa' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome').fill(title);
  if (options.time) await dialog.getByLabel('Horário').fill(options.time);
  if (options.priority) await dialog.getByLabel('Prioridade').selectOption({ label: options.priority });
  await dialog.getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();
  await expect(dialog).toBeHidden();
}

// Faz `setItem` do localStorage lançar (cota cheia) até `restoreStorage`.
export async function breakStorageWrites(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __setItem?: typeof Storage.prototype.setItem };
    w.__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    };
  });
}

export async function restoreStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __setItem?: typeof Storage.prototype.setItem };
    if (w.__setItem) Storage.prototype.setItem = w.__setItem;
  });
}

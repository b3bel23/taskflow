import { expect, test } from '@playwright/test';
import {
  TODAY,
  addDays,
  card,
  column,
  createTask,
  dayLabel,
  envelope,
  makeTask,
  openApp,
  readEnvelope,
  readTasks,
  titlesIn,
} from './helpers';

test.describe('janela de 7 dias', () => {
  test('mostra hoje + 6 dias, com data real, hoje destacado e dias vazios sinalizados', async ({ page }) => {
    await openApp(page);

    const expected = Array.from({ length: 7 }, (_, i) => dayLabel(addDays(TODAY, i)));
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(expected);
    await expect(column(page, TODAY)).toHaveAttribute('aria-current', 'date');
    await expect(page.locator('section[aria-current="date"]')).toHaveCount(1);
    await expect(page.getByText('Nenhuma tarefa')).toHaveCount(7);
  });

  test('com o app aberto, a janela avança sozinha na virada do dia (sem recarregar)', async ({ page }) => {
    await openApp(page, { now: '2026-09-18T23:59:30-03:00' });
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(dayLabel('2026-09-18'));

    await page.clock.fastForward('01:00');

    const expected = Array.from({ length: 7 }, (_, i) => dayLabel(addDays('2026-09-19', i)));
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(expected);
    await expect(column(page, '2026-09-19')).toHaveAttribute('aria-current', 'date');
  });
});

test.describe('rollover', () => {
  test('ao abrir: pendente e em andamento atrasadas vão para hoje; concluída fica onde estava e some da tela', async ({
    page,
  }) => {
    await openApp(page, {
      rawTasks: envelope([
        makeTask({ id: 'a', title: 'Atrasada pendente', date: '2026-09-10', time: '08:00' }),
        makeTask({ id: 'b', title: 'Atrasada andamento', date: '2026-09-15', state: 'in_progress' }),
        makeTask({ id: 'c', title: 'Atrasada concluída', date: '2026-09-10', state: 'done' }),
      ]),
    });

    const today = column(page, TODAY);
    await expect(card(today, 'Atrasada pendente')).toBeVisible();
    await expect(card(today, 'Atrasada andamento')).toBeVisible();
    await expect(page.getByText('Atrasada concluída')).toHaveCount(0);

    const stored = await readTasks(page);
    const byId = Object.fromEntries((stored ?? []).map((t) => [t.id, t]));
    expect(byId.a).toMatchObject({ date: TODAY, time: '08:00', state: 'pending' });
    expect(byId.b).toMatchObject({ date: TODAY, state: 'in_progress' });
    expect(byId.c).toMatchObject({ date: '2026-09-10', state: 'done' });
    // Nenhuma tarefa perdida ou duplicada.
    expect(stored).toHaveLength(3);
    // order de hoje sequencial e sem repetição.
    const todayOrders = (stored ?? []).filter((t) => t.date === TODAY).map((t) => t.order).sort();
    expect(todayOrders).toEqual([0, 1]);
  });

  test('entra depois das tarefas que já estavam em hoje', async ({ page }) => {
    await openApp(page, {
      rawTasks: envelope([
        makeTask({ id: 'h0', title: 'Já de hoje 1', order: 0 }),
        makeTask({ id: 'h1', title: 'Já de hoje 2', order: 1 }),
        makeTask({ id: 'o', title: 'Atrasada', date: '2026-09-10', order: 0 }),
      ]),
    });

    await expect(titlesIn(column(page, TODAY))).toHaveText(['Já de hoje 1', 'Já de hoje 2', 'Atrasada']);
  });

  test('com o app aberto: tarefa pendente de hoje vira "hoje" na virada do dia e é regravada', async ({ page }) => {
    await openApp(page, {
      now: '2026-09-18T23:59:30-03:00',
      rawTasks: envelope([makeTask({ id: 'v', title: 'Vira o dia' })]),
    });
    await expect(card(column(page, '2026-09-18'), 'Vira o dia')).toBeVisible();

    await page.clock.fastForward('01:00');

    await expect(card(column(page, '2026-09-19'), 'Vira o dia')).toBeVisible();
    expect((await readTasks(page))?.[0]).toMatchObject({ id: 'v', date: '2026-09-19' });
  });

  test('tarefa concluída de hoje sai da tela quando o dia vira, mas continua salva', async ({ page }) => {
    await openApp(page, {
      now: '2026-09-18T23:59:30-03:00',
      rawTasks: envelope([makeTask({ id: 'd', title: 'Feita hoje', state: 'done' })]),
    });
    await expect(page.getByText('Feita hoje')).toBeVisible();

    await page.clock.fastForward('01:00');

    await expect(page.getByText('Feita hoje')).toHaveCount(0);
    expect((await readTasks(page))?.[0]).toMatchObject({ id: 'd', date: '2026-09-18', state: 'done' });
  });
});

test.describe('migração de dados (v1 → v2) e dados ilegíveis', () => {
  test('formato antigo por dia da semana migra para datas reais dentro da janela, sem perda', async ({ page }) => {
    await openApp(page, {
      rawTasks: JSON.stringify({
        schemaVersion: 1,
        tasks: [
          { id: 'a', title: 'V1 segunda A', day: 'mon', state: 'pending', priority: 'high', order: 3 },
          { id: 'b', title: 'V1 segunda B', day: 'mon', state: 'pending', priority: 'low', order: 7 },
          { id: 'c', title: 'V1 sexta', day: 'fri', state: 'done', priority: null, order: 0 },
        ],
      }),
    });

    // Hoje é sexta 18/09: "mon" cai na próxima segunda (21/09), "fri" cai em hoje.
    await expect(titlesIn(column(page, '2026-09-21'))).toHaveText(['V1 segunda A', 'V1 segunda B']);
    await expect(titlesIn(column(page, '2026-09-18'))).toHaveText(['V1 sexta']);
    await expect(page.getByText('Não foi possível carregar')).toHaveCount(0);

    const stored = await readEnvelope(page);
    expect(stored?.schemaVersion).toBe(2);
    expect(stored?.tasks).toHaveLength(3);
    // order renumerado sequencialmente por data
    expect(stored?.tasks.filter((t) => t.date === '2026-09-21').map((t) => t.order).sort()).toEqual([0, 1]);
  });

  test('JSON corrompido: aviso único, app começa vazio e continua utilizável (e passa a salvar direito)', async ({
    page,
  }) => {
    await openApp(page, { rawTasks: '{isto nao e json' });

    await expect(page.getByText('Não foi possível carregar as tarefas salvas — começando do zero.')).toBeVisible();
    await expect(page.getByText('Nenhuma tarefa')).toHaveCount(7);

    await createTask(page, TODAY, 'Recomeço');
    await expect(card(column(page, TODAY), 'Recomeço')).toBeVisible();
    expect((await readEnvelope(page))?.tasks).toHaveLength(1);
  });

  test('schemaVersion desconhecido e item malformado (horário inválido) também caem no aviso, sem quebrar', async ({
    page,
  }) => {
    await openApp(page, { rawTasks: JSON.stringify({ schemaVersion: 999, tasks: [] }) });
    await expect(page.getByText('Não foi possível carregar')).toBeVisible();

    await page.evaluate(() =>
      window.localStorage.setItem(
        'taskflow:tasks',
        JSON.stringify({
          schemaVersion: 2,
          tasks: [{ id: 'x', title: 'T', date: '2026-09-18', time: '9h30', state: 'pending', priority: null, order: 0 }],
        }),
      ),
    );
    await page.reload();
    await expect(page.getByText('Não foi possível carregar')).toBeVisible();
    await expect(page.getByText('Nenhuma tarefa')).toHaveCount(7);
  });
});

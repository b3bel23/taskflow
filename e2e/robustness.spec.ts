import { expect, test } from '@playwright/test';
import {
  addDays,
  card,
  column,
  createTask,
  dayLabel,
  envelope,
  makeTask,
  openApp,
  openCard,
  readTasks,
} from './helpers';

// Datas são texto local (`YYYY-MM-DD`), nunca UTC. Estes testes rodam o app em
// fusos e datas onde o erro clássico de "um dia a menos" (ou a janela com dia
// repetido/faltando) apareceria.
async function expectWindow(page: Parameters<typeof openApp>[0], firstIso: string): Promise<void> {
  const expected = Array.from({ length: 7 }, (_, i) => dayLabel(addDays(firstIso, i)));
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(expected);
  await expect(column(page, firstIso)).toHaveAttribute('aria-current', 'date');
}

test.describe('fusos horários', () => {
  test.describe('oeste de UTC, à noite (Los Angeles)', () => {
    test.use({ timezoneId: 'America/Los_Angeles' });

    test('23:30 do dia 18 lá ainda é dia 18 (em UTC já seria 19)', async ({ page }) => {
      await openApp(page, { now: '2026-09-18T23:30:00-07:00' });
      await expectWindow(page, '2026-09-18');
    });
  });

  test.describe('leste de UTC, de madrugada (Auckland)', () => {
    test.use({ timezoneId: 'Pacific/Auckland' });

    test('00:30 do dia 27 lá ainda é dia 27 (em UTC seria 26); a janela cruza o início do horário de verão local', async ({
      page,
    }) => {
      await openApp(page, { now: '2026-09-27T00:30:00+12:00' });
      await expectWindow(page, '2026-09-27');
    });
  });

  test.describe('horário de verão (Nova York)', () => {
    test.use({ timezoneId: 'America/New_York' });

    test('janela que atravessa o fim do horário de verão (dia de 25h) tem 7 dias distintos e seguidos', async ({
      page,
    }) => {
      await openApp(page, { now: '2026-10-30T12:00:00-04:00' }); // 1º/11 tem 25h
      await expectWindow(page, '2026-10-30');
    });

    test('janela que atravessa o início do horário de verão (dia de 23h) também', async ({ page }) => {
      await openApp(page, { now: '2026-03-06T12:00:00-05:00' }); // 8/03 tem 23h
      await expectWindow(page, '2026-03-06');
    });

    test('a virada do dia com o app aberto funciona na noite do início do horário de verão', async ({ page }) => {
      await openApp(page, {
        now: '2026-03-07T23:59:30-05:00',
        rawTasks: envelope([makeTask({ id: 'v', title: 'Vira o dia', date: '2026-03-07' })]),
      });

      await page.clock.fastForward('01:00');

      await expectWindow(page, '2026-03-08');
      await expect(card(column(page, '2026-03-08'), 'Vira o dia')).toBeVisible();
    });
  });
});

test.describe('calendário', () => {
  test('a janela atravessa a virada de ano', async ({ page }) => {
    await openApp(page, { now: '2026-12-29T12:00:00-03:00' });
    await expectWindow(page, '2026-12-29');
    await expect(page.getByRole('heading', { level: 2 }).last()).toHaveText(dayLabel('2027-01-04'));
  });

  test('a janela inclui 29 de fevereiro em ano bissexto', async ({ page }) => {
    await openApp(page, { now: '2028-02-26T12:00:00-03:00' });
    await expectWindow(page, '2028-02-26');
    await expect(page.getByRole('heading', { level: 2, name: dayLabel('2028-02-29') })).toBeVisible();
  });

  test('a janela pula de 28/02 para 01/03 em ano não bissexto', async ({ page }) => {
    await openApp(page, { now: '2027-02-26T12:00:00-03:00' });
    await expectWindow(page, '2027-02-26');
    await expect(page.getByRole('heading', { level: 2, name: dayLabel('2027-02-29') })).toHaveCount(0);
  });

  test('uma tarefa criada em um dia de fim de mês continua nesse dia depois de recarregar', async ({ page }) => {
    await openApp(page, { now: '2026-12-29T12:00:00-03:00' });

    await createTask(page, '2027-01-01', 'Ano novo');
    await page.reload();

    await expect(card(column(page, '2027-01-01'), 'Ano novo')).toBeVisible();
  });
});

test.describe('modal aberto enquanto os dados mudam em outra aba', () => {
  test('salvar uma tarefa que já foi excluída em outra aba mostra o erro claro e não a recria', async ({ context }) => {
    const first = await context.newPage();
    const second = await context.newPage();
    await openApp(first, { rawTasks: envelope([makeTask({ id: 'a', title: 'Alvo' })]) });
    await openApp(second);
    await expect(card(column(second, '2026-09-18'), 'Alvo')).toBeVisible();

    await openCard(column(first, '2026-09-18'), 'Alvo');
    const dialog = first.getByRole('dialog');
    await dialog.getByLabel('Nome').fill('Alvo editado');

    // A outra aba exclui a tarefa enquanto este modal está aberto.
    await openCard(column(second, '2026-09-18'), 'Alvo');
    await second.getByRole('dialog').getByRole('button', { name: 'Excluir tarefa' }).click();
    await second.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(card(column(first, '2026-09-18'), 'Alvo')).toHaveCount(0);

    await dialog.getByRole('button', { name: 'Salvar' }).click();

    await expect(dialog.getByRole('alert')).toContainText('Esta tarefa não existe mais');
    await expect(card(column(first, '2026-09-18'), 'Alvo editado')).toHaveCount(0);
    expect(await readTasks(first)).toEqual([]);
  });
});

// Item adiado desde as Stories 2.1/2.2: "sem proteção contra duplo clique".
// Duas chamadas antes do re-render leriam o mesmo `state.tasks` e duplicariam
// (ou reindexariam com dado velho). Aqui o duplo clique é real, no navegador.
test.describe('duplo clique', () => {
  test('duplo clique em "Adicionar tarefa" cria UMA tarefa', async ({ page }) => {
    await openApp(page);
    await column(page, '2026-09-18').getByRole('button', { name: '+ Adicionar tarefa' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome').fill('Só uma');

    await dialog.getByRole('button', { name: 'Adicionar tarefa', exact: true }).dblclick();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Só uma', { exact: true })).toHaveCount(1);
    expect(await readTasks(page)).toHaveLength(1);
  });

  test('duplo clique em "Salvar" na edição não duplica nem reordena com dado velho', async ({ page }) => {
    await openApp(page, {
      rawTasks: envelope([
        makeTask({ id: 'a', title: 'A', order: 0 }),
        makeTask({ id: 'b', title: 'B', order: 1 }),
      ]),
    });
    await openCard(column(page, '2026-09-18'), 'B');
    await page.getByRole('dialog').getByLabel('Nome').fill('B editada');

    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).dblclick();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    const stored = await readTasks(page);
    expect(stored?.map((t) => t.title)).toEqual(['A', 'B editada']);
    expect(stored?.map((t) => t.order)).toEqual([0, 1]);
  });

  test('duplo clique em "Excluir" (confirmação) exclui só essa tarefa', async ({ page }) => {
    await openApp(page, {
      rawTasks: envelope([
        makeTask({ id: 'a', title: 'A', order: 0 }),
        makeTask({ id: 'b', title: 'B', order: 1 }),
        makeTask({ id: 'c', title: 'C', order: 2 }),
      ]),
    });
    await openCard(column(page, '2026-09-18'), 'B');
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir tarefa' }).click();

    await page.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).dblclick();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    const stored = await readTasks(page);
    expect(stored?.map((t) => t.title)).toEqual(['A', 'C']);
    expect(stored?.map((t) => t.order)).toEqual([0, 1]);
  });
});

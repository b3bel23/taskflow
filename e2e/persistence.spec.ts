import { expect, test } from '@playwright/test';
import { TODAY, card, column, createTask, openApp, openCard, readEnvelope } from './helpers';

test.describe('persistência', () => {
  test('tarefas criadas sobrevivem a recarregar a página, com horário, prioridade e estado', async ({ page }) => {
    await openApp(page);
    await createTask(page, TODAY, 'Persistente', { time: '14:00', priority: 'Média' });
    await column(page, TODAY).getByRole('button', { name: 'Pendente' }).click();

    await page.reload();

    const today = column(page, TODAY);
    await expect(card(today, 'Persistente')).toBeVisible();
    await expect(today.getByText('14:00')).toBeVisible();
    await expect(today.getByRole('button', { name: 'Média' })).toBeVisible();
    await expect(today.getByRole('button', { name: 'Em andamento' })).toBeVisible();
    expect((await readEnvelope(page))?.schemaVersion).toBe(2);
  });

  test('o tema escolhido persiste e é aplicado antes de qualquer interação (sem tema padrão piscando)', async ({
    page,
  }) => {
    await openApp(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.getByRole('button', { name: /tema escuro/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => window.localStorage.getItem('taskflow:theme'))).toBe('dark');
  });
});

test.describe('duas abas abertas ao mesmo tempo', () => {
  test('uma tarefa criada numa aba aparece na outra sem recarregar', async ({ context }) => {
    const first = await context.newPage();
    const second = await context.newPage();
    await openApp(first);
    await openApp(second);

    await createTask(first, TODAY, 'Veio da outra aba');

    await expect(card(column(second, TODAY), 'Veio da outra aba')).toBeVisible();
  });

  test('a aba desatualizada não sobrescreve o que a outra salvou: ao gravar, ela já tem os dados novos', async ({
    context,
  }) => {
    const first = await context.newPage();
    const second = await context.newPage();
    await openApp(first);
    await openApp(second);

    await createTask(first, TODAY, 'Criada na primeira');
    await expect(card(column(second, TODAY), 'Criada na primeira')).toBeVisible();
    await createTask(second, TODAY, 'Criada na segunda');

    const stored = (await readEnvelope(second))?.tasks.map((t) => t.title).sort();
    expect(stored).toEqual(['Criada na primeira', 'Criada na segunda']);
    await expect(card(column(first, TODAY), 'Criada na segunda')).toBeVisible();
  });

  test('a exclusão numa aba some na outra', async ({ context }) => {
    const first = await context.newPage();
    const second = await context.newPage();
    await openApp(first);
    await createTask(first, TODAY, 'Efêmera');
    await openApp(second);
    await expect(card(column(second, TODAY), 'Efêmera')).toBeVisible();

    await openCard(column(first, TODAY), 'Efêmera');
    await first.getByRole('dialog').getByRole('button', { name: 'Excluir tarefa' }).click();
    await first.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click();

    await expect(second.getByText('Efêmera')).toHaveCount(0);
  });

  test('o tema trocado numa aba é acompanhado pela outra', async ({ context }) => {
    const first = await context.newPage();
    const second = await context.newPage();
    await openApp(first);
    await openApp(second);

    await first.getByRole('button', { name: /tema escuro/i }).click();

    await expect(second.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

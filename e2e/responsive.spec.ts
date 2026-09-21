import { expect, test, type Page } from '@playwright/test';
import { TODAY, addDays, card, column, envelope, makeTask, openApp } from './helpers';

const gridColumns = (page: Page) =>
  page.locator('main').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

const hasHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

test.describe('layout responsivo', () => {
  test.describe('desktop (1280px)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('7 colunas, sem rolagem horizontal', async ({ page }) => {
      await openApp(page);
      expect(await gridColumns(page)).toBe(7);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  });

  test.describe('tablet (768px)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('4 colunas, sem rolagem horizontal', async ({ page }) => {
      await openApp(page);
      expect(await gridColumns(page)).toBe(4);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  });

  test.describe('celular (390px)', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('1 coluna com os dias empilhados (hoje primeiro), sem rolagem horizontal', async ({ page }) => {
      await openApp(page, {
        rawTasks: envelope([
          makeTask({ id: 'a', title: 'Reunião de alinhamento com a equipe de produto e design sobre o próximo trimestre' }),
        ]),
      });

      expect(await gridColumns(page)).toBe(1);
      expect(await hasHorizontalOverflow(page)).toBe(false);
      const boxes = await page.getByRole('region').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
      expect([...boxes].sort((x, y) => x - y)).toEqual(boxes);
      await expect(page.getByRole('heading', { level: 2 }).first()).toContainText('18/09');
      await expect(page.getByRole('heading', { level: 2 }).last()).toContainText(
        addDays(TODAY, 6).slice(8) + '/' + addDays(TODAY, 6).slice(5, 7),
      );
    });

    test('controles com alvo de toque de pelo menos 44px de altura', async ({ page }) => {
      await openApp(page);

      const toggle = await page.getByRole('button', { name: /tema/i }).first().boundingBox();
      const add = await column(page, TODAY).getByRole('button', { name: '+ Adicionar tarefa' }).boundingBox();
      expect(toggle?.height).toBeGreaterThanOrEqual(44);
      expect(add?.height).toBeGreaterThanOrEqual(44);
    });

    test('o modal cabe na tela e os campos evitam o zoom automático do iOS (fonte >= 16px)', async ({ page }) => {
      await openApp(page, { rawTasks: envelope([makeTask({ id: 'a', title: 'Cabe na tela' })]) });

      await card(column(page, TODAY), 'Cabe na tela').click();
      const dialog = page.getByRole('dialog');
      const box = await dialog.boundingBox();
      const viewport = page.viewportSize()!;
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      await expect(dialog.getByLabel('Nome')).toHaveCSS('font-size', '16px');
      await expect(dialog.getByRole('button', { name: 'Excluir tarefa' })).toBeVisible();
    });
  });
});

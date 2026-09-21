import { expect, test, type Locator, type Page } from '@playwright/test';
import { TODAY, addDays, card, column, dragHandle, envelope, makeTask, openApp, readTasks, titlesIn } from './helpers';

const TOMORROW = addDays(TODAY, 1);
const IN_THREE_DAYS = addDays(TODAY, 3);

// Arraste com mouse "de verdade": pointerdown na alça, vários pointermove
// intermediários (o sensor de ponteiro do @dnd-kit precisa deles para ativar)
// e pointerup sobre a coluna de destino. Devolve o centro do destino para os
// testes que interrompem o gesto antes de soltar.
async function pickUpAndMoveOver(page: Page, handle: Locator, target: Locator): Promise<void> {
  const from = (await handle.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 8, from.y + from.height / 2 + 8, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + Math.min(to.height / 2, 120), { steps: 20 });
}

async function dragByMouse(page: Page, handle: Locator, target: Locator): Promise<void> {
  await pickUpAndMoveOver(page, handle, target);
  await page.mouse.up();
}

// Arraste por teclado sincronizado com a região `aria-live` do @dnd-kit: cada
// passo espera o anúncio do passo anterior em vez de dormir por tempo fixo
// (o sensor precisa medir as colunas depois de "pegar" e depois de cada seta —
// uma pessoa nunca aperta as teclas com 1ms de intervalo, o Playwright sim).
async function dragByKeyboard(
  page: Page,
  handle: Locator,
  fromIso: string,
  moves: { key: string; overIso: string }[],
): Promise<void> {
  const live = page.locator('[aria-live]');
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(live).toContainText(`droppable area ${fromIso}`);
  for (const { key, overIso } of moves) {
    await page.keyboard.press(key);
    await expect(live).toContainText(`droppable area ${overIso}`);
  }
  await page.keyboard.press('Space');
  await expect(live).toContainText('dropped');
}

const seededTask = makeTask({ id: 'a', title: 'Arrastável', time: '09:30', priority: 'high', state: 'in_progress' });

test.describe('arrastar cartão para outro dia', () => {
  test('mouse: solta na coluna de outro dia e só a data muda (horário, prioridade e estado intactos); persiste após recarregar', async ({
    page,
  }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await dragByMouse(page, dragHandle(column(page, TODAY), 'Arrastável'), column(page, IN_THREE_DAYS));

    await expect(card(column(page, IN_THREE_DAYS), 'Arrastável')).toBeVisible();
    await expect(page.getByText('Arrastável')).toHaveCount(1);
    expect(await readTasks(page)).toMatchObject([
      { id: 'a', date: IN_THREE_DAYS, time: '09:30', priority: 'high', state: 'in_progress' },
    ]);

    await page.reload();
    await expect(card(column(page, IN_THREE_DAYS), 'Arrastável')).toBeVisible();
  });

  test('o cartão que chega entra já ordenado pelo horário (não vai simplesmente para o fim)', async ({ page }) => {
    await openApp(page, {
      rawTasks: envelope([
        seededTask,
        makeTask({ id: 'x', title: 'Já lá 08:00', date: TOMORROW, time: '08:00', order: 0 }),
        makeTask({ id: 'y', title: 'Já lá 18:00', date: TOMORROW, time: '18:00', order: 1 }),
      ]),
    });

    await dragByMouse(page, dragHandle(column(page, TODAY), 'Arrastável'), column(page, TOMORROW));

    await expect(titlesIn(column(page, TOMORROW))).toHaveText(['Já lá 08:00', 'Arrastável', 'Já lá 18:00']);
  });

  test('soltar na própria coluna não muda nada', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await dragByMouse(page, dragHandle(column(page, TODAY), 'Arrastável'), column(page, TODAY));

    await expect(card(column(page, TODAY), 'Arrastável')).toBeVisible();
    expect((await readTasks(page))?.[0]).toMatchObject({ date: TODAY });
  });

  test('clicar na alça (sem arrastar) não abre o modal nem muda nada', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await dragHandle(column(page, TODAY), 'Arrastável').click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await readTasks(page))?.[0]).toMatchObject({ date: TODAY, state: 'in_progress' });
  });

  test('falha ao gravar no drop: o cartão volta ao dia original e nada é gravado', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      };
    });

    await dragByMouse(page, dragHandle(column(page, TODAY), 'Arrastável'), column(page, IN_THREE_DAYS));

    await expect(card(column(page, TODAY), 'Arrastável')).toBeVisible();
    await expect(column(page, IN_THREE_DAYS).getByText('Arrastável')).toHaveCount(0);
  });
});

// Retro Epic 4, item 16: um arraste interrompido não pode deixar o cartão
// "preso" em modo de arraste. O @dnd-kit cancela em Escape, pointercancel,
// visibilitychange e resize — aqui cada uma dessas interrupções é exercitada
// no navegador, e depois se confere que a interface voltou ao normal.
test.describe('arraste interrompido', () => {
  const stuckDragging = (page: Page) => page.locator('[class*="dragging"]');

  async function expectBackToNormal(page: Page): Promise<void> {
    // O botão do mouse ainda está pressionado nas interrupções simuladas
    // (pointercancel, visibilitychange, resize): solta antes de seguir, como o
    // usuário faria.
    await page.mouse.up();
    await expect(stuckDragging(page)).toHaveCount(0);
    await expect(card(column(page, TODAY), 'Arrastável')).toBeVisible();
    expect((await readTasks(page))?.[0]).toMatchObject({ date: TODAY });
    // A interface segue utilizável: um clique normal abre o modal. Repete o
    // clique até funcionar porque, por projeto, o @dnd-kit engole cliques por
    // ~50 ms depois que um arraste termina ou é cancelado (evita o clique que
    // acompanha o mouseup do arraste). Uma pessoa nunca clica dentro dessa
    // janela; um teste rápido (e o runner do CI) clica. Descoberto no primeiro
    // run do CI: 3 destes testes falharam por isso, sem defeito no app.
    await expect(async () => {
      await card(column(page, TODAY), 'Arrastável').getByText('Arrastável', { exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1_500 });
    }).toPass({ timeout: 15_000 });
  }

  test('durante o arraste o cartão fica em modo "levantado" (o teste sabe enxergar o estado)', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await pickUpAndMoveOver(page, dragHandle(column(page, TODAY), 'Arrastável'), column(page, TOMORROW));

    await expect(stuckDragging(page)).not.toHaveCount(0);
    await page.mouse.up();
  });

  test('Esc no meio do arraste cancela: o cartão volta e nada muda', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await pickUpAndMoveOver(page, dragHandle(column(page, TODAY), 'Arrastável'), column(page, TOMORROW));
    await page.keyboard.press('Escape');

    await expectBackToNormal(page);
  });

  test('pointercancel (o sistema tomou o ponteiro) cancela o arraste', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await pickUpAndMoveOver(page, dragHandle(column(page, TODAY), 'Arrastável'), column(page, TOMORROW));
    await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true })));

    await expectBackToNormal(page);
  });

  test('a aba ficar oculta (visibilitychange) no meio do arraste cancela', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await pickUpAndMoveOver(page, dragHandle(column(page, TODAY), 'Arrastável'), column(page, TOMORROW));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange', { bubbles: true })));

    await expectBackToNormal(page);
  });

  test('redimensionar a janela no meio do arraste cancela', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await pickUpAndMoveOver(page, dragHandle(column(page, TODAY), 'Arrastável'), column(page, TOMORROW));
    await page.setViewportSize({ width: 1200, height: 800 });

    await expectBackToNormal(page);
  });
});

test.describe('arraste pelo teclado', () => {
  // Alça focada + Espaço pega, setas movem entre as colunas, Espaço solta
  // (sensor de teclado do @dnd-kit).
  test('Espaço + seta para a direita + Espaço move o cartão para o dia seguinte; o foco volta para a alça', async ({
    page,
  }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await dragByKeyboard(page, dragHandle(column(page, TODAY), 'Arrastável'), TODAY, [
      { key: 'ArrowRight', overIso: TOMORROW },
    ]);

    await expect(card(column(page, TOMORROW), 'Arrastável')).toBeVisible();
    expect(await readTasks(page)).toMatchObject([
      { id: 'a', date: TOMORROW, time: '09:30', priority: 'high', state: 'in_progress' },
    ]);
    await expect(dragHandle(column(page, TOMORROW), 'Arrastável')).toBeFocused();
  });

  test('Esc cancela o arraste por teclado e o cartão fica onde estava', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await dragHandle(column(page, TODAY), 'Arrastável').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');

    await expect(card(column(page, TODAY), 'Arrastável')).toBeVisible();
    expect((await readTasks(page))?.[0]).toMatchObject({ date: TODAY });
  });
});

// O mesmo gesto nos outros layouts: no celular os dias estão empilhados, então
// a seta para BAIXO leva ao dia seguinte (a de direita não tem coluna ao lado).
test.describe('arraste pelo teclado no celular (dias empilhados)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Espaço + seta para baixo + Espaço leva o cartão ao dia seguinte', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([seededTask]) });

    await dragByKeyboard(page, dragHandle(column(page, TODAY), 'Arrastável'), TODAY, [
      { key: 'ArrowDown', overIso: TOMORROW },
    ]);

    await expect(card(column(page, TOMORROW), 'Arrastável')).toBeVisible();
    expect((await readTasks(page))?.[0]).toMatchObject({ date: TOMORROW });
  });
});

import { expect, test } from '@playwright/test';
import {
  TODAY,
  addDays,
  breakStorageWrites,
  card,
  openCard,
  column,
  createTask,
  envelope,
  makeTask,
  openApp,
  readTasks,
  restoreStorage,
  titlesIn,
} from './helpers';

const TOMORROW = addDays(TODAY, 1);

test.describe('criar tarefa', () => {
  test('aparece na hora, na coluna certa, pendente, e persiste com horário e prioridade', async ({ page }) => {
    await openApp(page);

    await createTask(page, TODAY, 'Escrever relatório', { time: '09:30', priority: 'Alta' });

    const today = column(page, TODAY);
    await expect(card(today, 'Escrever relatório')).toBeVisible();
    await expect(today.getByRole('button', { name: 'Pendente' })).toBeVisible();
    await expect(today.getByRole('button', { name: 'Alta' })).toBeVisible();
    await expect(today.getByText('09:30')).toBeVisible();
    expect(await readTasks(page)).toMatchObject([
      { title: 'Escrever relatório', date: TODAY, time: '09:30', priority: 'high', state: 'pending' },
    ]);
  });

  test('ordena por horário: sem horário primeiro (na ordem de criação), depois os com horário do mais cedo ao mais tarde', async ({
    page,
  }) => {
    await openApp(page);

    await createTask(page, TODAY, 'Tarde', { time: '15:00' });
    await createTask(page, TODAY, 'Sem hora A');
    await createTask(page, TODAY, 'Cedo', { time: '08:15' });
    await createTask(page, TODAY, 'Sem hora B', { priority: 'Alta' });

    await expect(titlesIn(column(page, TODAY))).toHaveText(['Sem hora A', 'Sem hora B', 'Cedo', 'Tarde']);
  });

  test('sem nome não salva: o modal continua aberto e nada é criado', async ({ page }) => {
    await openApp(page);

    await column(page, TODAY).getByRole('button', { name: '+ Adicionar tarefa' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Nome')).toHaveAttribute('aria-invalid', 'true');
    expect(await readTasks(page)).toBeNull();
  });
});

test.describe('editar e excluir', () => {
  test('editar nome, horário e dia: a tarefa muda de coluna e se reposiciona', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([makeTask({ id: 'a', title: 'Original' })]) });

    await openCard(column(page, TODAY), 'Original');
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome').fill('Editada');
    await dialog.getByLabel('Horário').fill('10:00');
    await dialog.getByLabel('Dia').selectOption(TOMORROW);
    await dialog.getByRole('button', { name: 'Salvar' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Original')).toHaveCount(0);
    await expect(card(column(page, TOMORROW), 'Editada')).toBeVisible();
    expect(await readTasks(page)).toMatchObject([{ id: 'a', title: 'Editada', date: TOMORROW, time: '10:00' }]);
  });

  test('editar não altera o estado da tarefa', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([makeTask({ id: 'a', title: 'Em curso', state: 'in_progress' })]) });

    await openCard(column(page, TODAY), 'Em curso');
    await page.getByRole('dialog').getByLabel('Nome').fill('Em curso (editada)');
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click();

    await expect(column(page, TODAY).getByRole('button', { name: 'Em andamento' })).toBeVisible();
  });

  test('excluir pede confirmação: cancelar mantém a tarefa, confirmar remove de vez', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([makeTask({ id: 'a', title: 'Descartável' })]) });

    await openCard(column(page, TODAY), 'Descartável');
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Excluir tarefa' }).click();
    await expect(dialog.getByText('Excluir esta tarefa? Essa ação não pode ser desfeita.')).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog.getByLabel('Nome')).toHaveValue('Descartável');
    expect(await readTasks(page)).toHaveLength(1);

    await dialog.getByRole('button', { name: 'Excluir tarefa' }).click();
    await dialog.getByRole('button', { name: 'Excluir', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Descartável')).toHaveCount(0);
    expect(await readTasks(page)).toEqual([]);
  });
});

test.describe('estado e prioridade pelos controles do cartão', () => {
  test('o indicador cicla Pendente → Em andamento → Concluída → Pendente, sem abrir o modal, e a concluída fica riscada', async ({
    page,
  }) => {
    await openApp(page, { rawTasks: envelope([makeTask({ id: 'a', title: 'Ciclo' })]) });
    const today = column(page, TODAY);
    const title = today.getByText('Ciclo', { exact: true });

    await today.getByRole('button', { name: 'Pendente' }).click();
    await expect(today.getByRole('button', { name: 'Em andamento' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(title).toHaveCSS('text-decoration-line', 'none');

    await today.getByRole('button', { name: 'Em andamento' }).click();
    await expect(today.getByRole('button', { name: 'Concluída' })).toBeVisible();
    await expect(title).toHaveCSS('text-decoration-line', 'line-through');
    expect((await readTasks(page))?.[0].state).toBe('done');

    await today.getByRole('button', { name: 'Concluída' }).click();
    await expect(today.getByRole('button', { name: 'Pendente' })).toBeVisible();
    await expect(title).toHaveCSS('text-decoration-line', 'none');
  });

  test('a tag de prioridade cicla Sem prioridade → Baixa → Média → Alta → Sem prioridade, sem abrir o modal nem mexer no estado nem na ordem', async ({
    page,
  }) => {
    await openApp(page, {
      rawTasks: envelope([
        makeTask({ id: 'a', title: 'Primeira', order: 0 }),
        makeTask({ id: 'b', title: 'Segunda', order: 1, state: 'in_progress' }),
      ]),
    });
    const second = column(page, TODAY).getByRole('listitem').filter({ hasText: 'Segunda' });

    for (const [from, to] of [
      ['Sem prioridade', 'Baixa'],
      ['Baixa', 'Média'],
      ['Média', 'Alta'],
      ['Alta', 'Sem prioridade'],
    ]) {
      await second.getByRole('button', { name: from, exact: true }).click();
      await expect(second.getByRole('button', { name: to, exact: true })).toBeVisible();
    }

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(second.getByRole('button', { name: 'Em andamento' })).toBeVisible();
    await expect(titlesIn(column(page, TODAY))).toHaveText(['Primeira', 'Segunda']);
  });

  test('pelo teclado: Enter/Espaço no indicador cicla o estado', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([makeTask({ id: 'a', title: 'Teclado' })]) });
    const today = column(page, TODAY);

    await today.getByRole('button', { name: 'Pendente' }).focus();
    await page.keyboard.press('Enter');
    await expect(today.getByRole('button', { name: 'Em andamento' })).toBeVisible();
    await page.keyboard.press('Space');
    await expect(today.getByRole('button', { name: 'Concluída' })).toBeVisible();
  });
});

test.describe('foco depois do modal', () => {
  test('Esc no modal de criação devolve o foco ao "+ Adicionar tarefa" que o abriu', async ({ page }) => {
    await openApp(page);
    const addButton = column(page, TOMORROW).getByRole('button', { name: '+ Adicionar tarefa' });

    await addButton.click();
    await expect(page.getByRole('dialog').getByLabel('Nome')).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(addButton).toBeFocused();
  });

  test('fechar a edição devolve o foco ao cartão; salvar mudando de dia leva o foco ao "+ Adicionar tarefa" da coluna de origem', async ({
    page,
  }) => {
    await openApp(page, { rawTasks: envelope([makeTask({ id: 'a', title: 'Foco' })]) });
    const today = column(page, TODAY);

    await openCard(today, 'Foco');
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();
    await expect(card(today, 'Foco')).toBeFocused();

    await openCard(today, 'Foco');
    await page.getByRole('dialog').getByLabel('Dia').selectOption(TOMORROW);
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click();
    await expect(today.getByRole('button', { name: '+ Adicionar tarefa' })).toBeFocused();
  });

  test('o foco fica preso dentro do modal enquanto ele está aberto (Tab não escapa)', async ({ page }) => {
    await openApp(page);
    await column(page, TODAY).getByRole('button', { name: '+ Adicionar tarefa' }).click();
    const dialog = page.getByRole('dialog');

    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
  });
});

test.describe('falha ao gravar no localStorage', () => {
  test('criar: o modal continua aberto com erro e com o que foi digitado; nada é criado; ao voltar a gravar, funciona', async ({
    page,
  }) => {
    await openApp(page);
    await column(page, TODAY).getByRole('button', { name: '+ Adicionar tarefa' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome').fill('Não pode se perder');
    await breakStorageWrites(page);

    await dialog.getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();

    await expect(dialog.getByRole('alert')).toHaveText('Não foi possível salvar a tarefa. Tente novamente.');
    await expect(dialog.getByLabel('Nome')).toHaveValue('Não pode se perder');
    await expect(column(page, TODAY).getByText('Não pode se perder')).toHaveCount(0);

    await restoreStorage(page);
    await dialog.getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(card(column(page, TODAY), 'Não pode se perder')).toBeVisible();
    expect(await readTasks(page)).toHaveLength(1);
  });

  test('mudar o estado: o indicador NÃO muda quando a escrita falha', async ({ page }) => {
    await openApp(page, { rawTasks: envelope([makeTask({ id: 'a', title: 'Estável' })]) });
    const today = column(page, TODAY);
    await breakStorageWrites(page);

    await today.getByRole('button', { name: 'Pendente' }).click();

    await expect(today.getByRole('button', { name: 'Pendente' })).toBeVisible();
    await expect(today.getByRole('button', { name: 'Em andamento' })).toHaveCount(0);
  });
});

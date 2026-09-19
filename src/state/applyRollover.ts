import type { Task } from '../types';
import { closeOrderGap } from './selectors';

// Função pura de rollover (Story 5.4, AD-11): toda Tarefa com `state !==
// 'done'` e `date` anterior a `todayISO` tem sua `date` reatribuída
// diretamente para `todayISO` — nunca incrementada um dia por vez.
// Comparação lexicográfica (`<`) é suficiente porque `date`/`todayISO` são
// sempre ISO `'YYYY-MM-DD'` (mesma convenção do resto do app, ver
// `constants/week.ts`), que ordena lexicograficamente igual a
// cronologicamente. Tarefas `done` NUNCA sofrem rollover, mesmo com `date`
// no passado (FR-7, decisão D3: sem tela de Histórico, a tarefa só sai da
// janela visível — dado preservado, nunca perdido/duplicado). Título,
// Horário e Prioridade são preservados (só `date` e `order` mudam).
//
// `order` (AD-7 revisado: escopo `(date)`, sequencial 0..n-1, sem repetição):
// as tarefas que rolam entram no FIM do grupo de hoje, depois das que já
// estavam lá, preservando a ordem relativa entre elas (data original, depois
// `order` original) — e `closeOrderGap` renumera o grupo de hoje inteiro,
// então nunca há `order` duplicado (que faria tarefas sem Horário se
// intercalarem pela posição no array em `sortTasksInDay`, nem colidiria com
// o próximo `getNextOrderInGroup`).
//
// Retorna a MESMA referência de `tasks` quando nada precisa mudar — permite
// ao chamador (`useTaskActions.applyRollover`) pular a escrita em disco
// inteiramente (comparação de referência barata, AD-8: só `src/storage/`
// toca a API de persistência), em vez de persistir a cada tick do timer de
// 60s (Story 5.3) mesmo sem nada a rolar.
export function applyRollover(tasks: Task[], todayISO: string): Task[] {
  const overdue = tasks
    .filter((task) => task.state !== 'done' && task.date < todayISO)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order));
  if (overdue.length === 0) {
    return tasks;
  }

  const firstFreeOrder = Math.max(-1, ...tasks.filter((t) => t.date === todayISO).map((t) => t.order)) + 1;
  const rolledOrder = new Map(overdue.map((task, index) => [task.id, firstFreeOrder + index]));

  const moved = tasks.map((task) => {
    const order = rolledOrder.get(task.id);
    return order === undefined ? task : { ...task, date: todayISO, order };
  });

  return closeOrderGap(moved, todayISO);
}

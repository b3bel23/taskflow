import type { Task } from '../types';

// Story 6.2 (FR-6 revisado, Epic 6): ordena por Horário — Prioridade nunca
// mais influencia a posição (Epic 7, AD-7 obsoleto). Tarefas sem Horário
// (`time === null`) sempre primeiro, em ordem de criação entre si; depois as
// com Horário definido, em ordem crescente (`'HH:mm'` compara
// lexicograficamente igual a cronologicamente). `order` só desempata quando
// as duas tarefas comparadas têm exatamente o mesmo Horário (ou nenhuma das
// duas tem) — nunca perde para a Prioridade, que não participa desta
// ordenação em nenhum caso.
export function sortTasksInDay(tasks: Task[], date: string): Task[] {
  return tasks
    .filter((task) => task.date === date)
    .sort((a, b) => {
      const aHasTime = a.time !== null;
      const bHasTime = b.time !== null;
      if (aHasTime !== bHasTime) {
        return aHasTime ? 1 : -1;
      }
      if (aHasTime && bHasTime && a.time !== b.time) {
        return (a.time as string) < (b.time as string) ? -1 : 1;
      }
      return a.order - b.order;
    });
}

// Só contagem: quantas tarefas já existem na Data — a tarefa nova recebe
// esse valor como `order`, servindo de desempate de criação (AD-7 revisado
// 2026-09-18: escopo passa de `(day, priority)` para `(date)` — Prioridade
// deixou de agrupar/ordenar qualquer coisa, virou puro atributo visual,
// Epic 7).
export function getNextOrderInGroup(tasks: Task[], date: string): number {
  return tasks.filter((t) => t.date === date).length;
}

// Substitui `reorderWithinGroup` (removida — AD-7 obsoleto, Story 4.1
// "[REMOVIDA 2026-09-18]"): única dimensão de grupo agora é `date`
// (Prioridade nunca mais afeta posição/agrupamento). `tasks` deve trazer
// `id` ainda com a `date` *antiga* (título/Horário/Prioridade/Estado já
// podem estar atualizados nele, isso não importa aqui); `date` é o valor
// *novo* desejado.
//
// Data igual à de antes: no-op, retorna `tasks` sem tocar em nada. Data
// diferente: fecha o buraco na Data antiga (reindexa sequencialmente por
// `order` crescente) e entra no fim do grupo da Data nova (mesmo cálculo de
// `getNextOrderInGroup`) — usada tanto por `updateTask` (Modal, Story
// 2.2/6.1) quanto por `moveTaskToDate` (arraste, Story 4.2 revisada); nesta
// última, é a ÚNICA mutação que o arraste aplica (nunca título/Horário/
// Prioridade/Estado).
export function reassignDate(tasks: Task[], id: string, date: string): Task[] {
  const target = tasks.find((t) => t.id === id);
  if (!target || target.date === date) {
    return tasks;
  }

  const newOrder = tasks.filter((t) => t.id !== id && t.date === date).length;
  const moved = tasks.map((t) => (t.id === id ? { ...t, date, order: newOrder } : t));

  // A tarefa já mudou de Data em `moved`, então reindexar a Data antiga só
  // enxerga as que ficaram — o buraco fecha sem lógica própria aqui.
  return closeOrderGap(moved, target.date);
}

// ÚNICA implementação da regra de numeração de `order` (AD-7 revisado:
// sequencial 0..n-1 dentro de cada `date`, por `order` crescente; empate de
// `order` mantém a posição relativa no array). Todo lugar que precisa
// renumerar um grupo passa por aqui — `deleteTask` (fecha o buraco da tarefa
// removida, Story 2.3), `reassignDate` (fecha o buraco da Data de origem),
// `applyRollover` (integra as tarefas que rolaram ao fim de hoje) e
// `migrateFromV1` (rede de segurança na migração) — em vez de cada um
// reimplementar o mesmo laço (retro Epics 5-7, F2/A1: a 4ª cópia esqueceu a
// invariante e duplicou `order`). Só toca as tarefas da `date` informada;
// tarefa que já está com o `order` certo mantém a mesma referência de objeto.
export function closeOrderGap(tasks: Task[], date: string): Task[] {
  const group = tasks.filter((t) => t.date === date).sort((a, b) => a.order - b.order);
  const newOrder = new Map(group.map((t, i) => [t.id, i]));
  return tasks.map((t) => {
    const order = newOrder.get(t.id);
    return order === undefined || order === t.order ? t : { ...t, order };
  });
}

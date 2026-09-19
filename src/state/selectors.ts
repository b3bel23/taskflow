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

  const oldOrder = new Map(
    tasks
      .filter((t) => t.id !== id && t.date === target.date)
      .sort((a, b) => a.order - b.order)
      .map((t, i) => [t.id, i]),
  );
  const newOrder = tasks.filter((t) => t.id !== id && t.date === date).length;

  return tasks.map((t) =>
    t.id === id ? { ...t, date, order: newOrder } : oldOrder.has(t.id) ? { ...t, order: oldOrder.get(t.id)! } : t,
  );
}

// Função pura de reindexação para exclusão (Story 2.3, AD-7 revisado): fecha
// o risco latente de um buraco no `order` da Data colidir com uma tarefa
// nova. `tasks` já chega SEM a tarefa removida (a remoção acontece antes, em
// `useTaskActions.deleteTask`); esta função só reindexa sequencialmente
// (0..n-1, por `order` crescente) as tarefas remanescentes da MESMA `date`
// da tarefa removida — escopo `(date)`, sem mais a dimensão de Prioridade.
export function closeOrderGap(tasks: Task[], date: string): Task[] {
  const group = tasks.filter((t) => t.date === date).sort((a, b) => a.order - b.order);
  const newOrder = new Map(group.map((t, i) => [t.id, i]));
  return tasks.map((t) => (newOrder.has(t.id) ? { ...t, order: newOrder.get(t.id)! } : t));
}

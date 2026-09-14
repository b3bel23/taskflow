import type { DayOfWeek, Priority, Task } from '../types';

// Ordem de exibição por nível de prioridade (FR-6: Alta->Média->Baixa->sem
// prioridade). Ausência de prioridade (`null`) sempre ordena por último.
const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function priorityRank(priority: Priority | null): number {
  return priority === null ? 3 : PRIORITY_RANK[priority];
}

// Filtra as tarefas de um único dia e ordena por nível de prioridade
// (Alta->Média->Baixa->sem prioridade); dentro do mesmo grupo
// `(day, priority)`, ordena por `order` crescente (AD-7). Reordenação manual
// dentro do mesmo nível (`reorderWithinGroup`) é Story 2.2/Epic 4 — esta
// função só lê o `order` já armazenado, nunca o recalcula.
export function sortTasksInDay(tasks: Task[], day: DayOfWeek): Task[] {
  return tasks
    .filter((task) => task.day === day)
    .sort((a, b) => {
      const priorityDiff = priorityRank(a.priority) - priorityRank(b.priority);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return a.order - b.order;
    });
}

// Só contagem: quantas tarefas já existem no grupo `(day, priority)` — a
// tarefa nova recebe esse valor como `order`, ficando no fim da fila (AD-7).
// Reindexação completa (`reorderWithinGroup`) só entra na Story 2.2/Epic 4;
// esta função não reindexa nada existente.
export function getNextOrderInGroup(tasks: Task[], day: DayOfWeek, priority: Priority | null): number {
  return tasks.filter((t) => t.day === day && t.priority === priority).length;
}

// Função pura única de reindexação (AD-7): usada tanto pela edição via Modal
// (Story 2.2) quanto pelo drag (Epic 4) — nenhum caminho reimplementa esta
// lógica separadamente. `tasks` deve trazer `id` ainda com o `day`/`priority`
// *antigos* (título/Estado já podem estar atualizados nele, isso não importa
// aqui); `day`/`priority` são os valores *novos* desejados.
//
// Grupo igual (mesmo `day` e `priority` de antes): no-op, retorna `tasks`
// sem tocar em nada — quem chamou já aplicou título/Estado direto no array
// recebido. Grupo diferente: fecha o buraco no grupo antigo (reindexa
// sequencialmente por `order` crescente) e entra no fim do grupo novo (mesmo
// cálculo de `getNextOrderInGroup`).
export function reorderWithinGroup(
  tasks: Task[],
  id: string,
  day: DayOfWeek,
  priority: Priority | null,
): Task[] {
  const target = tasks.find((t) => t.id === id);
  if (!target || (target.day === day && target.priority === priority)) {
    return tasks;
  }

  const oldOrder = new Map(
    tasks
      .filter((t) => t.id !== id && t.day === target.day && t.priority === target.priority)
      .sort((a, b) => a.order - b.order)
      .map((t, i) => [t.id, i]),
  );
  const newOrder = tasks.filter((t) => t.id !== id && t.day === day && t.priority === priority).length;

  return tasks.map((t) =>
    t.id === id ? { ...t, day, priority, order: newOrder } : oldOrder.has(t.id) ? { ...t, order: oldOrder.get(t.id)! } : t,
  );
}

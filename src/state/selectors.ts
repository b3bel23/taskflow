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

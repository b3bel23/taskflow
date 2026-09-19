// Tipo compartilhado por todos os épicos do TaskFlow. A partir da Story 5.1,
// `Task.date` (ISO real) substitui `Task.day` como identificador de coluna —
// `DayOfWeek` continua existindo só para uso interno da migração
// `migrateFromV1` (`src/storage/tasksStorage.ts`), que mapeia cada `day`
// salvo no formato antigo (`schemaVersion: 1`) para a data real
// correspondente dentro da primeira janela `hoje..hoje+6`.
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// Domínio de persistência independente de Task/`taskflow:tasks` (AD-2,
// Story 1.3): `taskflow:theme` guarda este valor como string crua, nunca
// `JSON.stringify`. Qualquer chave ausente ou valor não reconhecido cai em
// `'light'` — nunca deriva de `prefers-color-scheme`.
export type Theme = 'light' | 'dark';

// Estado de uma Tarefa (FR-4, Epic 3). Independente do estado de carregamento
// do app — não confundir com o `loadError` da persistência (Story 1.2).
export type TaskState = 'pending' | 'in_progress' | 'done';

// Ausência de prioridade é sempre `null`, nunca string vazia
// (ARCHITECTURE-SPINE.md Consistency Conventions).
export type Priority = 'high' | 'medium' | 'low';

// Formato completo de uma Tarefa (Epic 2 introduz as ações que as criam/
// mutam; Story 1.2 só precisava do tipo para o envelope de persistência).
//
// Story 5.1: `date` (ISO real, ex. '2026-09-18') substitui `day`
// (`DayOfWeek`) como identificador de coluna. Story 6.1/6.2: `time`
// (`'HH:mm'` ou `null`) passa a ser editável no Modal e a única base de
// ordenação dentro do dia (`sortTasksInDay`) — `order` sobrevive só como
// desempate de criação entre tarefas com o mesmo Horário (ou ambas sem).
// Epic 7 (Stories 7.1/7.2): `priority` vira puro atributo visual, sem efeito
// posicional nenhum — nunca mais participa de agrupamento/ordenação (AD-7
// obsoleto, `PriorityZone`/`groupKey` por prioridade removidos no Epic 4
// revisado).
export interface Task {
  id: string;
  title: string;
  date: string;
  time: string | null;
  state: TaskState;
  priority: Priority | null;
  order: number;
}

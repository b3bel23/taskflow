// Tipo compartilhado por todos os épicos do TaskFlow.
// Semana começa na segunda-feira (PRD §3).
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
// mutam; esta história só precisa do tipo para o envelope de persistência).
export interface Task {
  id: string;
  title: string;
  day: DayOfWeek;
  state: TaskState;
  priority: Priority | null;
  order: number;
}

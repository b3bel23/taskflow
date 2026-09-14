import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { DAY_LABELS, DAYS_OF_WEEK } from '../../constants/days';
import { useTaskActions } from '../../state/useTaskActions';
import type { DayOfWeek, Priority, Task, TaskState } from '../../types';
import styles from './TaskModal.module.css';

export interface TaskModalProps {
  day: DayOfWeek;
  task?: Task;
  onClose: () => void;
}

type PrioritySelectValue = '' | Priority;

const PRIORITY_OPTIONS: { value: PrioritySelectValue; label: string }[] = [
  { value: '', label: 'Sem prioridade' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

// Estado (Story 2.2, só no modo edição): rótulos iguais aos de
// `StateIndicator`, para o Modal e o Card nunca divergirem no vocabulário.
const STATE_OPTIONS: { value: TaskState; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'done', label: 'Concluída' },
];

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled'));
}

// Modal de Tarefa: modo criação (Story 2.1, sem `task`) e modo edição (Story
// 2.2, `task` presente). Em edição, Nome/Dia/Prioridade/Estado nascem
// preenchidos com os valores atuais da tarefa; Dia deixa de ser fixo (7
// opções) e ganha o campo Estado (3 opções) — Prioridade e Nome reaproveitam
// os mesmos campos da criação. "Excluir tarefa" é Story 2.3, não antecipado
// aqui. Retém o foco (focus trap simples via Tab/Shift+Tab) e Esc fecha
// descartando o que não foi salvo — `onClose` (chamado pelo `DayColumn`) é
// quem devolve o foco ao controle que abriu o modal.
export function TaskModal({ day, task, onClose }: TaskModalProps) {
  const { createTask, updateTask } = useTaskActions();
  const isEditMode = task !== undefined;

  const [title, setTitle] = useState(task?.title ?? '');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(task?.day ?? day);
  const [priority, setPriority] = useState<PrioritySelectValue>(task?.priority ?? '');
  const [state, setState] = useState<TaskState>(task?.state ?? 'pending');
  const [titleError, setTitleError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const dayId = useId();
  const priorityId = useId();
  const stateId = useId();

  // Nome em foco na abertura (AC1), vazio na criação/preenchido na edição —
  // sem `useEffect` de "loading", só o foco inicial do próprio modal.
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Focus trap: Esc fecha/descarta; Tab/Shift+Tab nunca deixa o foco escapar
  // do modal enquanto ele está aberto ("modal retém o foco").
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = getFocusable(dialogRef.current);
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedTitle = title.trim();

      // Nome vazio: modal continua aberto sinalizando o campo, nada
      // criado/salvo — nunca chega a tentar persistir (AC, I/O "Nome vazio").
      if (trimmedTitle === '') {
        setTitleError(true);
        titleInputRef.current?.focus();
        return;
      }

      setTitleError(false);
      setSaveError(null);

      const resolvedPriority = priority === '' ? null : priority;

      const result =
        isEditMode && task
          ? updateTask({ id: task.id, title: trimmedTitle, day: selectedDay, priority: resolvedPriority, state })
          : createTask({ title: trimmedTitle, day, priority: resolvedPriority });

      // Escrita falha: modal aberto, erro inline, campos preservados (o
      // estado local não é limpo), nunca retry automático — só um novo
      // clique explícito tenta de novo (AC, I/O "Escrita falha"). Mensagem
      // fixa em português — `result.error.message` vem do `Error.message`
      // cru do navegador (ex. "quota exceeded" em inglês), inconsistente com
      // o resto da microcopy do app.
      if (!result.ok) {
        setSaveError('Não foi possível salvar a tarefa. Tente novamente.');
        return;
      }

      onClose();
    },
    [title, priority, day, selectedDay, state, isEditMode, task, createTask, updateTask, onClose],
  );

  const headingId = `${titleId}-heading`;

  return (
    <div className={styles.overlay}>
      <div ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <h2 id={headingId} className={styles.heading}>
          {isEditMode ? 'Editar tarefa' : 'Adicionar tarefa'}
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor={titleId} className={styles.label}>
              Nome
            </label>
            <input
              id={titleId}
              ref={titleInputRef}
              type="text"
              className={styles.input}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (titleError) {
                  setTitleError(false);
                }
              }}
              aria-invalid={titleError}
              aria-describedby={titleError ? `${titleId}-error` : undefined}
            />
            {titleError && (
              <p id={`${titleId}-error`} className={styles.fieldError} role="alert">
                Nome é obrigatório.
              </p>
            )}
          </div>

          {isEditMode ? (
            <div className={styles.field}>
              <label htmlFor={dayId} className={styles.label}>
                Dia
              </label>
              <select
                id={dayId}
                className={styles.select}
                value={selectedDay}
                onChange={(event) => setSelectedDay(event.target.value as DayOfWeek)}
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className={styles.fixedField}>
              <span className={styles.label}>Dia</span>
              <span>{DAY_LABELS[day]}</span>
            </p>
          )}

          <div className={styles.field}>
            <label htmlFor={priorityId} className={styles.label}>
              Prioridade
            </label>
            <select
              id={priorityId}
              className={styles.select}
              value={priority}
              onChange={(event) => setPriority(event.target.value as PrioritySelectValue)}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {isEditMode && (
            <div className={styles.field}>
              <label htmlFor={stateId} className={styles.label}>
                Estado
              </label>
              <select
                id={stateId}
                className={styles.select}
                value={state}
                onChange={(event) => setState(event.target.value as TaskState)}
              >
                {STATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {saveError && (
            <p className={styles.saveError} role="alert">
              {saveError}
            </p>
          )}

          <button type="submit" className={styles.submitButton}>
            {isEditMode ? 'Salvar' : 'Adicionar tarefa'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { DAY_LABELS } from '../../constants/days';
import { useTaskActions } from '../../state/useTaskActions';
import type { DayOfWeek, Priority } from '../../types';
import styles from './TaskModal.module.css';

export interface TaskModalProps {
  day: DayOfWeek;
  onClose: () => void;
}

type PrioritySelectValue = '' | Priority;

const PRIORITY_OPTIONS: { value: PrioritySelectValue; label: string }[] = [
  { value: '', label: 'Sem prioridade' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled'));
}

// Modal de Tarefa — só modo criação nesta história (Story 2.2 adiciona
// edição/Estado/"Excluir tarefa", nunca antecipados aqui). Nome obrigatório,
// Dia fixo = coluna de origem (não editável), Prioridade opcional sem
// seleção padrão. Retém o foco (focus trap simples via Tab/Shift+Tab) e Esc
// fecha descartando o que não foi salvo — `onClose` (chamado pelo
// `DayColumn`) é quem devolve o foco ao "+ Adicionar tarefa" que abriu.
export function TaskModal({ day, onClose }: TaskModalProps) {
  const { createTask } = useTaskActions();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PrioritySelectValue>('');
  const [titleError, setTitleError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const priorityId = useId();

  // Nome vazio e em foco na abertura (AC1) — sem `useEffect` de "loading",
  // só o foco inicial do próprio modal.
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

      // Nome vazio: modal continua aberto sinalizando o campo, nada criado
      // — nunca chega a tentar persistir (AC3, I/O "Nome vazio").
      if (trimmedTitle === '') {
        setTitleError(true);
        titleInputRef.current?.focus();
        return;
      }

      setTitleError(false);
      setSaveError(null);

      const result = createTask({
        title: trimmedTitle,
        day,
        priority: priority === '' ? null : priority,
      });

      // Escrita falha: modal aberto, erro inline, campos preservados (o
      // estado local `title`/`priority` não é limpo), nunca retry
      // automático — só um novo clique explícito tenta de novo (AC4).
      // Mensagem fixa em português — `result.error.message` vem do
      // `Error.message` cru do navegador (ex. "quota exceeded" em inglês),
      // inconsistente com o resto da microcopy do app.
      if (!result.ok) {
        setSaveError('Não foi possível salvar a tarefa. Tente novamente.');
        return;
      }

      onClose();
    },
    [title, priority, day, createTask, onClose],
  );

  const headingId = `${titleId}-heading`;

  return (
    <div className={styles.overlay}>
      <div ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <h2 id={headingId} className={styles.heading}>
          Adicionar tarefa
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

          <p className={styles.fixedField}>
            <span className={styles.label}>Dia</span>
            <span>{DAY_LABELS[day]}</span>
          </p>

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

          {saveError && (
            <p className={styles.saveError} role="alert">
              {saveError}
            </p>
          )}

          <button type="submit" className={styles.submitButton}>
            Adicionar tarefa
          </button>
        </form>
      </div>
    </div>
  );
}

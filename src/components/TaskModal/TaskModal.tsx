import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { formatDayHeading, getWeekWindow } from '../../constants/week';
import { useTaskActions } from '../../state/useTaskActions';
import type { Priority, Task, TaskState } from '../../types';
import styles from './TaskModal.module.css';

export interface TaskModalProps {
  date: string;
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
// os mesmos campos da criação. Em edição, ganha também o ponto de entrada
// "Excluir tarefa" (Story 2.3): clicar substitui o conteúdo do modal pela
// Confirmação de Exclusão (`isConfirmingDelete`) — nunca um segundo modal
// empilhado, nunca uma rota/estado fora deste componente. Retém o foco
// (focus trap simples via Tab/Shift+Tab) e Esc fecha descartando o que não
// foi salvo — exceto durante a Confirmação, onde Esc só volta ao modo
// edição (mesmo efeito de "Cancelar"), pela mesma razão de consistência.
// `onClose` (chamado pelo `DayColumn`) é quem devolve o foco ao controle que
// abriu o modal.
export function TaskModal({ date, task, onClose }: TaskModalProps) {
  const { createTask, updateTask, deleteTask } = useTaskActions();
  const isEditMode = task !== undefined;

  const [title, setTitle] = useState(task?.title ?? '');
  const [selectedDate, setSelectedDate] = useState<string>(task?.date ?? date);
  // Story 6.1: Horário opcional (`'HH:mm'` via `<input type="time">` nativo,
  // ou string vazia = sem Horário definido — mesma convenção de campo
  // opcional que Prioridade, UX-DR9: nunca bloqueia o salvamento).
  const [time, setTime] = useState<string>(task?.time ?? '');
  const [priority, setPriority] = useState<PrioritySelectValue>(task?.priority ?? '');
  const [state, setState] = useState<TaskState>(task?.state ?? 'pending');
  const [titleError, setTitleError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Story 5.1: as 7 opções do `<select>` de Dia (modo edição) são as 7 datas
  // da janela atual — sem timer de recálculo (Story 5.3). Inicializador
  // preguiçoso do `useState` (nunca chamada direta no corpo do componente):
  // calcula a janela uma única vez, na montagem, em vez de recalcular (7
  // construções de `Date`) a cada re-render — inclusive a cada tecla digitada
  // no campo Nome.
  const [weekWindow] = useState(() => getWeekWindow());

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cancelDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const deleteLinkRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const dayId = useId();
  const timeId = useId();
  const priorityId = useId();
  const stateId = useId();

  // Nome em foco na abertura (AC1), vazio na criação/preenchido na edição —
  // sem `useEffect` de "loading", só o foco inicial do próprio modal.
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Focus trap: Esc fecha/descarta; Tab/Shift+Tab nunca deixa o foco escapar
  // do modal enquanto ele está aberto ("modal retém o foco"). Durante a
  // Confirmação de Exclusão, Esc não fecha o modal inteiro — volta ao modo
  // edição (mesmo efeito de "Cancelar"), decisão de UX menor sinalizada na
  // spec (Ask First) por consistência com "Cancelar".
  // Extraído do handler de Esc abaixo para ser reaproveitado pelo botão "X"
  // (alça visível de fechar/cancelar) — os dois precisam do mesmo
  // comportamento: na Confirmação, só volta à edição (nunca fecha o modal
  // inteiro nem descarta a edição em andamento); fora dela, fecha de fato.
  const handleCloseRequest = useCallback(() => {
    if (isConfirmingDelete) {
      // Foco de volta ao link "Excluir tarefa" é tratado pelo efeito logo
      // abaixo, disparado por esta mesma transição de estado. Retrospectiva
      // Epic 2 (achado 2): também limpa erro de Nome/Salvar de uma tentativa
      // anterior — "Cancelar"/Esc/X na Confirmação volta a uma edição limpa,
      // não a um erro obsoleto que nada disparou agora.
      setIsConfirmingDelete(false);
      setDeleteError(null);
      setTitleError(false);
      setSaveError(null);
      return;
    }
    onClose();
  }, [isConfirmingDelete, onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseRequest();
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
  }, [handleCloseRequest]);

  // Ao entrar na Confirmação, foco vai para "Cancelar" (ação não-destrutiva,
  // padrão seguro). Ao voltar à edição (via "Cancelar" ou Esc), o link
  // "Excluir tarefa" que abriu a Confirmação foi desmontado nesse meio
  // tempo — o navegador não tem mais para onde devolver o foco sozinho —
  // então este mesmo efeito, dirigido pela transição `true -> false` de
  // `isConfirmingDelete` que tanto `handleCancelDelete` quanto o branch de
  // Esc em `handleKeyDown` disparam, devolve o foco a ele explicitamente
  // via `deleteLinkRef` assim que o link volta a existir no DOM (uma
  // chamada direta a `.focus()` dentro desses handlers seria tarde demais:
  // a Confirmação ainda está montada nesse instante).
  const wasConfirmingDeleteRef = useRef(false);
  useEffect(() => {
    if (isConfirmingDelete) {
      cancelDeleteButtonRef.current?.focus();
      wasConfirmingDeleteRef.current = true;
    } else if (wasConfirmingDeleteRef.current) {
      wasConfirmingDeleteRef.current = false;
      deleteLinkRef.current?.focus();
    }
  }, [isConfirmingDelete]);

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
      const resolvedTime = time === '' ? null : time;

      const result =
        isEditMode && task
          ? updateTask({
              id: task.id,
              title: trimmedTitle,
              date: selectedDate,
              time: resolvedTime,
              priority: resolvedPriority,
              state,
            })
          : createTask({ title: trimmedTitle, date, time: resolvedTime, priority: resolvedPriority });

      // Escrita falha: modal aberto, erro inline, campos preservados (o
      // estado local não é limpo), nunca retry automático — só um novo
      // clique explícito tenta de novo (AC, I/O "Escrita falha"). Mensagem
      // fixa em português — `result.error.message` cru normalmente vem do
      // `Error.message` do navegador (ex. "quota exceeded" em inglês),
      // inconsistente com o resto da microcopy do app, por isso a mensagem
      // fixa abaixo. Exceção (retrospectiva Epic 2, achado 3): "Tarefa não
      // encontrada." já é uma mensagem própria em português de
      // `useTaskActions` (a tarefa foi removida em outra sessão/aba
      // enquanto este modal estava aberto) — nesse caso um retry nunca vai
      // funcionar, então mostra essa mensagem em vez de convidar a tentar
      // de novo.
      if (!result.ok) {
        setSaveError(
          result.error.message === 'Tarefa não encontrada.'
            ? 'Esta tarefa não existe mais — ela pode ter sido removida em outra sessão. Feche o modal.'
            : 'Não foi possível salvar a tarefa. Tente novamente.',
        );
        return;
      }

      onClose();
    },
    [title, priority, time, date, selectedDate, state, isEditMode, task, createTask, updateTask, onClose],
  );

  // "Cancelar" na Confirmação (e Esc, tratado no handler de teclado acima):
  // volta ao modo edição preservando os valores exibidos (nenhum estado de
  // campo é tocado aqui), tarefa intacta — nada foi persistido. Foco de
  // volta ao link "Excluir tarefa" é tratado pelo efeito de
  // `isConfirmingDelete` acima, disparado por esta mesma transição.
  const handleCancelDelete = useCallback(() => {
    setIsConfirmingDelete(false);
    setDeleteError(null);
    // Retrospectiva Epic 2 (achado 2): idem ao branch de Esc acima — sem
    // isto, um erro de Nome/Salvar de antes de abrir a Confirmação
    // reaparecia na volta à edição mesmo sem nenhuma nova tentativa falha.
    setTitleError(false);
    setSaveError(null);
  }, []);

  // "Excluir" na Confirmação: guard AD-4 já vive em `useTaskActions.deleteTask`
  // (filtra + `closeOrderGap` + salva, só então despacha). Sucesso fecha o
  // modal (a tarefa já sumiu da coluna e dos dados); falha mantém a
  // Confirmação visível com erro inline fixo em português, nunca retry
  // automático — a tarefa não some até sucesso (AC, I/O "Escrita falha").
  const handleDelete = useCallback(() => {
    if (!task) {
      return;
    }

    setDeleteError(null);
    const result = deleteTask(task.id);

    // Mesma distinção do `handleSubmit` acima (retrospectiva Epic 2, achado
    // 3): "Tarefa não encontrada." é irrecuperável (já foi excluída em
    // outra sessão/aba) — não convida a um retry que nunca vai funcionar.
    if (!result.ok) {
      setDeleteError(
        result.error.message === 'Tarefa não encontrada.'
          ? 'Esta tarefa já foi excluída em outra sessão.'
          : 'Não foi possível excluir a tarefa. Tente novamente.',
      );
      return;
    }

    onClose();
  }, [task, deleteTask, onClose]);

  const headingId = `${titleId}-heading`;

  return (
    <div className={styles.overlay}>
      <div ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={headingId}>
        {/* Alça visível de fechar (achado de uso real: só Esc, sem nenhum
            controle na tela, não é descobrível) — mesmo `handleCloseRequest`
            do Esc, então o comportamento na Confirmação (só volta à edição,
            nunca descarta/fecha de fato) fica idêntico nos dois casos.
            Fica ANTES do conteúdo condicional (sempre presente, nos dois
            modos) — por isso é o primeiro elemento focável do modal; os
            testes de focus trap abaixo já contam com isso. */}
        <button type="button" className={styles.closeButton} aria-label="Fechar" onClick={handleCloseRequest}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
            <path
              d="M3 3 L13 13 M13 3 L3 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {isConfirmingDelete ? (
          // Confirmação de Exclusão: substitui o conteúdo do modal (nunca um
          // segundo modal/dialog empilhado) — mesmo `role="dialog"` externo,
          // mesmo `dialogRef` para o focus trap continuar funcionando sobre
          // o que quer que esteja renderizado dentro dele.
          <div className={styles.confirmView}>
            <p id={headingId} className={styles.confirmText}>
              Excluir esta tarefa? Essa ação não pode ser desfeita.
            </p>
            {deleteError && (
              <p className={styles.saveError} role="alert">
                {deleteError}
              </p>
            )}
            <div className={styles.confirmActions}>
              <button
                type="button"
                ref={cancelDeleteButtonRef}
                className={styles.cancelButton}
                onClick={handleCancelDelete}
              >
                Cancelar
              </button>
              <button type="button" className={styles.destructiveButton} onClick={handleDelete}>
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <>
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
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  >
                    {weekWindow.map((d) => (
                      <option key={d} value={d}>
                        {formatDayHeading(d)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className={styles.fixedField}>
                  <span className={styles.label}>Dia</span>
                  <span>{formatDayHeading(date)}</span>
                </p>
              )}

              <div className={styles.field}>
                <label htmlFor={timeId} className={styles.label}>
                  Horário
                </label>
                <input
                  id={timeId}
                  type="time"
                  className={styles.input}
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </div>

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

              {isEditMode && (
                <button
                  type="button"
                  ref={deleteLinkRef}
                  className={styles.deleteLink}
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  Excluir tarefa
                </button>
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
          </>
        )}
      </div>
    </div>
  );
}

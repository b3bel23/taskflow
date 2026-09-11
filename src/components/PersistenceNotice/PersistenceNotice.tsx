import styles from './PersistenceNotice.module.css';

export interface PersistenceNoticeProps {
  loadError: boolean;
}

// Dois avisos distintos que a persistência exige (AD-3, CAP-8):
// - Estático, permanente, sempre visível: risco de perda de dados (só este
//   navegador, sem backup no MVP) — nunca condicional a nenhum estado.
// - Condicional, mostrado enquanto `loadError` estiver sinalizado por
//   `loadTasks` (dado ausente na primeira instalação não conta como erro).
export function PersistenceNotice({ loadError }: PersistenceNoticeProps) {
  return (
    <div className={styles.notice}>
      <p className={styles.staticNotice}>
        Os dados ficam salvos apenas neste navegador/computador.
      </p>
      {loadError && (
        <p className={styles.errorNotice} role="status">
          Não foi possível carregar as tarefas salvas — começando do zero.
        </p>
      )}
    </div>
  );
}

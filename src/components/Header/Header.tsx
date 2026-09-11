import styles from './Header.module.css';

// Faixa fina no topo, fora da grade de dias. Só o título por enquanto —
// o Alternador de Tema entra na Story 1.3.
export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>TaskFlow</h1>
    </header>
  );
}

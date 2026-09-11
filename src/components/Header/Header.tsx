import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import styles from './Header.module.css';

// Faixa fina no topo, fora da grade de dias. Título à esquerda, Alternador
// de Tema à direita (UX-DR2) — único elemento do Cabeçalho além do título.
export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>TaskFlow</h1>
      <ThemeToggle />
    </header>
  );
}

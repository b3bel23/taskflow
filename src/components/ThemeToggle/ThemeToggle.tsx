import { useThemeContext } from '../../state/ThemeContext';
import { useThemeActions } from '../../state/useThemeActions';
import styles from './ThemeToggle.module.css';

// Alternador de Tema (UX-DR11): sol e lua ficam sempre visíveis lado a
// lado, e `icon-color-active` (accent) marca qual dos dois é o tema
// atualmente ativo — o ícone "reflete o tema atual" pela cor, não por
// sumir/aparecer. Rótulo explícito (`aria-label`) em vez de só o ícone
// (UX-DR13), e o foco visível vem do `:focus-visible` em
// `ThemeToggle.module.css`.
export function ThemeToggle() {
  const { theme } = useThemeContext();
  const { toggleTheme } = useThemeActions();

  const isDark = theme === 'dark';
  const label = isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro';

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => toggleTheme()}
      aria-label={label}
      title={label}
      data-theme-active={theme}
    >
      <svg
        className={isDark ? styles.iconInactive : styles.iconActive}
        data-testid="theme-toggle-sun"
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
        <g strokeWidth="1.8" strokeLinecap="round">
          <line x1="12" y1="1.5" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22.5" />
          <line x1="4.22" y1="4.22" x2="5.94" y2="5.94" />
          <line x1="18.06" y1="18.06" x2="19.78" y2="19.78" />
          <line x1="1.5" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22.5" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.94" y2="18.06" />
          <line x1="18.06" y1="5.94" x2="19.78" y2="4.22" />
        </g>
      </svg>
      <svg
        className={isDark ? styles.iconActive : styles.iconInactive}
        data-testid="theme-toggle-moon"
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
      >
        <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
      </svg>
    </button>
  );
}

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../state/ThemeContext';
import { Header } from './Header';

function renderHeader() {
  return render(
    <ThemeProvider>
      <Header />
    </ThemeProvider>,
  );
}

function cleanRootTheme() {
  delete document.documentElement.dataset.theme;
}

describe('Header', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanRootTheme();
  });

  afterEach(() => {
    cleanRootTheme();
  });

  it('exibe o título "TaskFlow"', () => {
    renderHeader();
    expect(screen.getByText('TaskFlow')).toBeTruthy();
  });

  it('é um landmark de cabeçalho independente da grade de dias', () => {
    renderHeader();
    const header = screen.getByRole('banner');
    // O botão do ThemeToggle não tem texto visível (só `aria-label`), então
    // o texto do landmark continua sendo só o título.
    expect(header.textContent).toBe('TaskFlow');
  });

  it('inclui o Alternador de Tema à direita do título', () => {
    renderHeader();
    const header = screen.getByRole('banner');
    const title = screen.getByText('TaskFlow');
    const toggle = screen.getByRole('button', { name: 'Mudar para tema escuro' });

    // `header.contains(toggle)` sozinho é indiferente à ordem no DOM — o
    // teste passaria mesmo com o Alternador ANTES do título, invertendo o
    // layout que `justify-content: space-between` produz. Verificar a ordem
    // real dos filhos do Cabeçalho.
    expect(header.children[0]).toBe(title);
    expect(header.children[1]).toBe(toggle);
  });
});

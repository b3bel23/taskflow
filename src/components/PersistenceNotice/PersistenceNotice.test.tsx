import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PersistenceNotice } from './PersistenceNotice';

describe('PersistenceNotice', () => {
  it('sempre mostra o aviso estático de dados locais, mesmo sem erro de carregamento', () => {
    render(<PersistenceNotice loadError={false} />);

    expect(
      screen.getByText('Os dados ficam salvos apenas neste navegador/computador.'),
    ).toBeTruthy();
  });

  it('não mostra o aviso de erro de carregamento quando loadError é false', () => {
    render(<PersistenceNotice loadError={false} />);

    expect(
      screen.queryByText('Não foi possível carregar as tarefas salvas — começando do zero.'),
    ).toBeNull();
  });

  it('mostra o aviso de erro de carregamento quando loadError é true, além do estático', () => {
    render(<PersistenceNotice loadError />);

    expect(
      screen.getByText('Os dados ficam salvos apenas neste navegador/computador.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Não foi possível carregar as tarefas salvas — começando do zero.'),
    ).toBeTruthy();
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('compõe Header e WeekView com o Cabeçalho fora da grade de dias', () => {
    render(<App />);

    const header = screen.getByRole('banner');
    const main = screen.getByRole('main');

    expect(main.contains(header)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('exibe o título "TaskFlow"', () => {
    render(<Header />);
    expect(screen.getByText('TaskFlow')).toBeTruthy();
  });

  it('é um landmark de cabeçalho independente da grade de dias', () => {
    render(<Header />);
    const header = screen.getByRole('banner');
    expect(header.textContent).toBe('TaskFlow');
  });
});

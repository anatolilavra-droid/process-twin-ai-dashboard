import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('high contrast toggle', () => {
  beforeEach(() => {
    // Dashboard fetches on mount; the component catches any failure into an
    // error message, so an unmocked fetch (undefined in jsdom) is enough —
    // we're testing the toggle, not the data it fetches.
    global.fetch = vi.fn().mockRejectedValue(new Error('no network in tests'));
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.className = '';
  });

  it('starts off, with no "hc" class on <html>', () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: /turn on high contrast mode/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.classList.contains('hc')).toBe(false);
  });

  it('adds the "hc" class, flips aria-pressed, and persists the choice on click', () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: /turn on high contrast mode/i });

    fireEvent.click(toggle);

    expect(document.documentElement.classList.contains('hc')).toBe(true);
    expect(localStorage.getItem('highContrast')).toBe('true');
    expect(screen.getByRole('button', { name: /turn off high contrast mode/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('reads the stored preference back on the next render', () => {
    localStorage.setItem('highContrast', 'true');
    render(<App />);
    expect(document.documentElement.classList.contains('hc')).toBe(true);
    expect(screen.getByRole('button', { name: /turn off high contrast mode/i })).toBeInTheDocument();
  });
});

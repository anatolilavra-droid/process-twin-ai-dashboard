import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['queued', 'Queued'],
    ['scheduled', 'Scheduled'],
    ['in_progress', 'In progress'],
    ['done', 'Done'],
    ['overdue', 'Overdue'],
  ])('renders the label for status "%s"', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('falls back to the raw value for an unknown status instead of crashing', () => {
    render(<StatusBadge status="mystery" />);
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });
});

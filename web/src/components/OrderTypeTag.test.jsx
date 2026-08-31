import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OrderTypeTag from './OrderTypeTag';

describe('OrderTypeTag', () => {
  it.each([
    ['standard', 'Standard'],
    ['urgent', 'Urgent'],
    ['premium', 'Premium'],
    ['warranty', 'Warranty'],
  ])('renders the label for order type "%s"', (orderType, label) => {
    render(<OrderTypeTag orderType={orderType} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('falls back to the raw value for an unknown order type instead of crashing', () => {
    render(<OrderTypeTag orderType="mystery" />);
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { formatBoardTime, formatClockTime, formatRelativeToNow, toDatetimeLocalValue } from './format';

describe('formatClockTime', () => {
  it('formats an ISO timestamp as a locale-aware HH:MM string', () => {
    const result = formatClockTime('2026-08-31T14:05:00.000Z');
    expect(result).toMatch(/^\d{1,2}:\d{2}/);
  });
});

describe('formatBoardTime', () => {
  it('prefixes the clock time with the short weekday', () => {
    const result = formatBoardTime('2026-08-31T14:05:00.000Z');
    const [weekday, ...rest] = result.split(' ');
    expect(weekday).toMatch(/^[A-Za-z]{2,3}$/);
    expect(rest.join(' ')).toBe(formatClockTime('2026-08-31T14:05:00.000Z'));
  });
});

describe('formatRelativeToNow', () => {
  const now = new Date('2026-08-31T12:00:00.000Z').getTime();

  it('renders a future timestamp under an hour away in minutes', () => {
    expect(formatRelativeToNow('2026-08-31T12:25:00.000Z', now)).toBe('in 25m');
  });

  it('renders a future timestamp an hour or more away in hours, one decimal under 10h', () => {
    expect(formatRelativeToNow('2026-08-31T16:30:00.000Z', now)).toBe('in 4.5h');
  });

  it('renders a future timestamp 10h or more away in whole hours', () => {
    expect(formatRelativeToNow('2026-09-01T00:00:00.000Z', now)).toBe('in 12h');
  });

  it('renders a past timestamp as "overdue", with the same one-decimal formatting under 10h', () => {
    expect(formatRelativeToNow('2026-08-31T09:00:00.000Z', now)).toBe('3.0h overdue');
  });

  it('treats exactly-now as not yet overdue', () => {
    expect(formatRelativeToNow('2026-08-31T12:00:00.000Z', now)).toBe('in 0m');
  });
});

describe('toDatetimeLocalValue', () => {
  it('formats a Date into the YYYY-MM-DDTHH:MM shape <input type="datetime-local"> expects', () => {
    const iso = new Date(2026, 7, 31, 9, 5).toISOString();
    expect(toDatetimeLocalValue(iso)).toBe('2026-08-31T09:05');
  });

  it('zero-pads single-digit month, day, hour, and minute', () => {
    const iso = new Date(2026, 0, 5, 3, 7).toISOString();
    expect(toDatetimeLocalValue(iso)).toBe('2026-01-05T03:07');
  });
});

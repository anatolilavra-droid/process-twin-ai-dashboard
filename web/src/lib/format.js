function formatClockTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// "Sun 18:16" — a weekday prefix so a plan spanning multiple days (order
// deadlines run up to 5 days out) doesn't read as same-day by omission.
function formatBoardTime(iso) {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString([], { weekday: 'short' });
  return `${weekday} ${formatClockTime(iso)}`;
}

// "in 4h" / "in 25m" / "3h overdue" relative to now (or an injected reference for tests).
function formatRelativeToNow(iso, nowMs = Date.now()) {
  const diffMs = new Date(iso).getTime() - nowMs;
  const diffHours = diffMs / 3600000;
  const absHours = Math.abs(diffHours);
  const label = absHours < 1 ? `${Math.round(absHours * 60)}m` : `${absHours.toFixed(absHours < 10 ? 1 : 0)}h`;
  return diffMs >= 0 ? `in ${label}` : `${label} overdue`;
}

// Value for <input type="datetime-local">, in the viewer's local time zone
// (the browser then round-trips it back to a correct UTC ISO string on submit).
function toDatetimeLocalValue(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export { formatClockTime, formatBoardTime, formatRelativeToNow, toDatetimeLocalValue };

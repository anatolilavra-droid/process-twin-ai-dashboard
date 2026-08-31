import OrderTypeTag from './OrderTypeTag';
import StatusBadge from './StatusBadge';
import { formatBoardTime, formatClockTime } from '../lib/format';

function ProcessBoard({ specialists, scheduleEntries, loading, onSelectAssignment }) {
  const bySpecialist = new Map(specialists.map(s => [s.id, []]));
  for (const entry of scheduleEntries) {
    if (!bySpecialist.has(entry.specialistId)) bySpecialist.set(entry.specialistId, []);
    bySpecialist.get(entry.specialistId).push(entry);
  }

  return (
    <section className="rounded-lg border border-border bg-surface" aria-labelledby="board-heading">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id="board-heading" className="text-sm font-semibold text-ink">
          Process board
        </h2>
        <span className="font-mono text-xs tabular-nums text-ink-faint">{scheduleEntries.length} assignment(s)</span>
      </header>

      {loading && (
        <p role="status" aria-busy="true" className="px-4 py-6 text-sm text-ink-faint">
          Loading board…
        </p>
      )}

      {!loading && specialists.length === 0 && (
        <p className="px-4 py-6 text-sm text-ink-faint">No specialists seeded yet.</p>
      )}

      {!loading && specialists.length > 0 && (
        <div className="grid grid-cols-1 gap-px overflow-x-auto bg-border sm:grid-cols-2 xl:grid-cols-3">
          {specialists.map(specialist => {
            const entries = [...(bySpecialist.get(specialist.id) || [])].sort(
              (a, b) => new Date(a.plannedStart) - new Date(b.plannedStart)
            );
            return (
              <div key={specialist.id} className="min-w-[220px] bg-surface p-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-ink">{specialist.name}</p>
                  <p className="whitespace-nowrap text-xs text-ink-faint">{specialist.specialistType}</p>
                </div>
                {entries.length === 0 ? (
                  <p className="text-xs text-ink-faint">Free.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {entries.map(entry => (
                      <li key={entry.assignmentId}>
                        <button
                          type="button"
                          onClick={() => onSelectAssignment(entry)}
                          aria-label={`View plan for this ${entry.orderType} order (${entry.orderStatus}), assigned to ${specialist.name}, ${formatBoardTime(entry.plannedStart)} to ${formatClockTime(entry.plannedEnd)}`}
                          className="w-full cursor-pointer rounded border border-border bg-surface-2 p-2 text-left transition hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <OrderTypeTag orderType={entry.orderType} />
                            <StatusBadge status={entry.orderStatus} />
                          </div>
                          <p className="font-mono text-xs tabular-nums text-ink-muted">
                            {formatBoardTime(entry.plannedStart)}–{formatClockTime(entry.plannedEnd)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ProcessBoard;

import { formatBoardTime } from '../lib/format';

const ACTION_META = {
  ai_proposed: { label: 'AI proposed', dot: 'bg-status-scheduled', text: 'text-status-scheduled' },
  human_accepted: { label: 'Accepted', dot: 'bg-status-done', text: 'text-status-done' },
  human_overridden: { label: 'Overridden', dot: 'bg-status-queued', text: 'text-status-queued' },
};

function HistoryTimeline({ decisions, loading }) {
  return (
    <section className="rounded-lg border border-border bg-surface" aria-labelledby="history-heading">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id="history-heading" className="text-sm font-semibold text-ink">
          Decision history
        </h2>
        <span className="font-mono text-xs tabular-nums text-ink-faint">{decisions.length}</span>
      </header>

      {loading && (
        <p role="status" aria-busy="true" className="px-4 py-6 text-sm text-ink-faint">
          Loading history…
        </p>
      )}

      {!loading && decisions.length === 0 && (
        <p className="px-4 py-6 text-sm text-ink-faint">
          No decisions yet. Run the scheduler, then accept or override a plan.
        </p>
      )}

      {!loading && decisions.length > 0 && (
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {decisions.map(decision => {
            const meta = ACTION_META[decision.action] || { label: decision.action, dot: 'bg-ink-faint', text: 'text-ink-muted' };
            return (
              <li key={decision.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className={`font-medium ${meta.text}`}>{meta.label}</span>
                    <span className="font-mono text-xs tabular-nums text-ink-faint">{formatBoardTime(decision.createdAt)}</span>
                  </div>
                  <p className="truncate font-mono text-xs text-ink-faint">order {decision.orderId.slice(0, 8)}</p>
                  {decision.reasonText && <p className="mt-0.5 text-xs text-ink-muted">"{decision.reasonText}"</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default HistoryTimeline;

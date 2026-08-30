function formatPercent(value) {
  return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
}

function formatHours(value) {
  return value === null || value === undefined ? '—' : `${value.toFixed(1)}h`;
}

function MetricsPanel({ metrics, loading }) {
  if (loading || !metrics) {
    return (
      <div role="status" aria-busy="true" className="rounded-lg border border-border bg-surface px-4 py-6 text-sm text-ink-faint">
        Loading metrics…
      </div>
    );
  }

  const { plannedOnTimeRate, avgProcessingHours, overrideRate, sampleSize } = metrics;

  const tiles = [
    {
      label: 'Planned on-time rate',
      value: formatPercent(plannedOnTimeRate),
      caveat: `${sampleSize.currentAssignments} current assignment(s) — planned end vs. deadline, not actual completion`,
    },
    {
      label: 'Avg. processing time',
      value: formatHours(avgProcessingHours),
      caveat: `mean estimated hours across ${sampleSize.currentAssignments} current assignment(s)`,
    },
    {
      label: 'Override rate',
      value: formatPercent(overrideRate),
      caveat: `${sampleSize.humanOverriddenDecisions} of ${sampleSize.aiProposedDecisions} AI proposal(s) overridden`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
      {tiles.map(tile => (
        <div key={tile.label} className="bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{tile.label}</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">{tile.value}</p>
          <p className="mt-1 text-xs text-ink-faint">{tile.caveat}</p>
        </div>
      ))}
    </div>
  );
}

export default MetricsPanel;

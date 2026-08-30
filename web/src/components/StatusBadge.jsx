const STATUS_META = {
  queued: { label: 'Queued', dot: 'bg-status-queued', text: 'text-status-queued' },
  scheduled: { label: 'Scheduled', dot: 'bg-status-scheduled', text: 'text-status-scheduled' },
  in_progress: { label: 'In progress', dot: 'bg-status-inprogress', text: 'text-status-inprogress' },
  done: { label: 'Done', dot: 'bg-status-done', text: 'text-status-done' },
  overdue: { label: 'Overdue', dot: 'bg-status-overdue', text: 'text-status-overdue' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, dot: 'bg-ink-faint', text: 'text-ink-muted' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export default StatusBadge;

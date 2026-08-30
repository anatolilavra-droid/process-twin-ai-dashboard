import { useEffect, useRef, useState } from 'react';
import ExplanationPanel from './ExplanationPanel';
import OrderTypeTag from './OrderTypeTag';
import StatusBadge from './StatusBadge';
import { formatBoardTime, formatClockTime, toDatetimeLocalValue } from '../lib/format';

function OverridePlanModal({ entry, specialists, onClose, onAccept, onOverride }) {
  const closeButtonRef = useRef(null);
  const [specialistId, setSpecialistId] = useState(entry.specialistId);
  const [plannedStart, setPlannedStart] = useState(toDatetimeLocalValue(entry.plannedStart));
  const [plannedEnd, setPlannedEnd] = useState(toDatetimeLocalValue(entry.plannedEnd));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(null); // 'accept' | 'override' | null
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const selectedSpecialist = specialists.find(s => s.id === specialistId);
  const typeMismatch = selectedSpecialist && selectedSpecialist.specialistType !== entry.requiredSpecialistType;

  async function handleAccept() {
    setSubmitting('accept');
    setErrorMessage(null);
    try {
      await onAccept(entry.assignmentId);
    } catch (err) {
      setErrorMessage(err.message);
      setSubmitting(null);
    }
  }

  async function handleOverrideSubmit(e) {
    e.preventDefault();
    setSubmitting('override');
    setErrorMessage(null);
    try {
      await onOverride(entry.assignmentId, {
        specialistId,
        plannedStart: new Date(plannedStart).toISOString(),
        plannedEnd: new Date(plannedEnd).toISOString(),
        reason: reason.trim() || undefined,
      });
    } catch (err) {
      setErrorMessage(err.message);
      setSubmitting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="override-modal-heading"
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-surface p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="override-modal-heading" className="text-base font-semibold text-ink">
              {formatBoardTime(entry.plannedStart)}–{formatClockTime(entry.plannedEnd)}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <OrderTypeTag orderType={entry.orderType} />
              <StatusBadge status={entry.orderStatus} />
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-ink-faint hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-ink-muted">
          Currently assigned to <span className="font-medium text-ink">{entry.specialistName}</span> (
          {entry.specialistType}).
        </p>

        <ExplanationPanel orderId={entry.orderId} />

        {errorMessage && <p className="text-sm text-status-overdue">{errorMessage}</p>}

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={handleAccept}
            disabled={submitting !== null}
            className="min-h-11 cursor-pointer rounded-md bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting === 'accept' ? 'Accepting…' : 'Accept this plan'}
          </button>

          <form onSubmit={handleOverrideSubmit} className="flex flex-col gap-2 rounded-md border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Override</p>

            <label className="flex flex-col gap-1 text-sm text-ink-muted">
              Specialist
              <select
                value={specialistId}
                onChange={e => setSpecialistId(e.target.value)}
                className="min-h-11 rounded border border-border bg-bg px-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {specialists.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.specialistType})
                  </option>
                ))}
              </select>
            </label>

            {typeMismatch && (
              <p className="text-xs text-status-queued">
                Heads up: this order needs "{entry.requiredSpecialistType}"; {selectedSpecialist.name} is a "
                {selectedSpecialist.specialistType}".
              </p>
            )}

            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-sm text-ink-muted">
                Start
                <input
                  type="datetime-local"
                  value={plannedStart}
                  onChange={e => setPlannedStart(e.target.value)}
                  className="min-h-11 rounded border border-border bg-bg px-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm text-ink-muted">
                End
                <input
                  type="datetime-local"
                  value={plannedEnd}
                  onChange={e => setPlannedEnd(e.target.value)}
                  className="min-h-11 rounded border border-border bg-bg px-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm text-ink-muted">
              Reason (optional, but explains the decision later)
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                className="rounded border border-border bg-bg px-2 py-1.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              />
            </label>

            <button
              type="submit"
              disabled={submitting !== null}
              className="min-h-11 cursor-pointer rounded-md border border-border px-4 text-sm font-medium text-ink transition hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting === 'override' ? 'Overriding…' : 'Override plan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default OverridePlanModal;

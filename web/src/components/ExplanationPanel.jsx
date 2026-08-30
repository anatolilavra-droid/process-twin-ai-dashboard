import { useEffect, useState } from 'react';
import { getExplanation } from '../api/client';

const CONFIDENCE_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };

function ExplanationPanel({ orderId }) {
  const [status, setStatus] = useState('loading');
  const [explanation, setExplanation] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    getExplanation(orderId)
      .then(data => {
        if (cancelled) return;
        setExplanation(data);
        setStatus('done');
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMessage(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (status === 'loading') {
    return (
      <p role="status" aria-busy="true" className="text-sm text-ink-faint">
        Asking the explanation agent…
      </p>
    );
  }

  if (status === 'error') {
    return <p className="text-sm text-status-overdue">Couldn't load an explanation: {errorMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Why this assignment</p>
        <span className="text-xs text-ink-faint">{CONFIDENCE_LABEL[explanation.confidence] || explanation.confidence}</span>
      </div>

      {explanation.source === 'fallback' && (
        <p className="rounded border border-status-queued/40 bg-status-queued/10 px-2 py-1 text-xs text-status-queued">
          The explanation service was unreachable — this is computed directly from the scheduler's own inputs, not
          written by the LLM.
        </p>
      )}

      <ul className="flex flex-col gap-1.5">
        {explanation.topFactors.map((factor, i) => (
          <li key={i} className="text-sm text-ink-muted">
            <span className="font-medium text-ink">{factor.factor}:</span> {factor.description}
          </li>
        ))}
      </ul>

      <p className="text-sm text-ink-muted">{explanation.summaryText}</p>
    </div>
  );
}

export default ExplanationPanel;

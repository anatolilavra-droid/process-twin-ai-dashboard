import { useEffect, useState } from 'react';
import { listOrders } from './api/client';

function App() {
  const [status, setStatus] = useState('loading');
  const [orderCount, setOrderCount] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    listOrders({ limit: 1 })
      .then(orders => {
        if (cancelled) return;
        setOrderCount(orders.length);
        setStatus('connected');
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMessage(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-slate-200">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
        Stage A · scaffold
      </p>
      <h1 className="text-3xl font-bold text-white">Process Twin AI Dashboard</h1>
      <p className="max-w-md text-sm text-slate-400">
        The order queue, process board, and explanations are not built yet
        (PT-07 onward) — this checks the API connection only.
      </p>
      <p role="status" aria-busy={status === 'loading'} className="mt-2 text-sm">
        {status === 'loading' && <span className="text-slate-500">Connecting to API…</span>}
        {status === 'connected' && (
          <span className="text-emerald-400">API connected — {orderCount} order(s) visible.</span>
        )}
        {status === 'error' && (
          <span className="text-red-400">
            API unreachable: {errorMessage}. Is the backend running on{' '}
            {import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}?
          </span>
        )}
      </p>
    </main>
  );
}

export default App;

import { useCallback, useEffect, useState } from 'react';
import {
  acceptAssignment,
  generateOrders,
  getSchedule,
  listOrders,
  listSpecialists,
  overrideAssignment,
  runSchedule,
} from '../api/client';
import OrderQueue from '../components/OrderQueue';
import ProcessBoard from '../components/ProcessBoard';
import OverridePlanModal from '../components/OverridePlanModal';

function Dashboard() {
  const [specialists, setSpecialists] = useState([]);
  const [queuedOrders, setQueuedOrders] = useState([]);
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const loadAll = useCallback(async () => {
    const [specialistsRes, ordersRes, scheduleRes] = await Promise.all([
      listSpecialists(),
      listOrders({ status: 'queued', limit: 100 }),
      getSchedule(),
    ]);
    setSpecialists(specialistsRes);
    setQueuedOrders(ordersRes);
    setScheduleEntries(scheduleRes);
  }, []);

  useEffect(() => {
    loadAll()
      .catch(err => setErrorMessage(err.message))
      .finally(() => setLoading(false));
  }, [loadAll]);

  async function handleGenerate() {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const created = await generateOrders({ count: 10 });
      setStatusMessage(`Generated ${created.length} orders.`);
      await loadAll();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRunSchedule() {
    setIsScheduling(true);
    setErrorMessage(null);
    try {
      const result = await runSchedule();
      setStatusMessage(
        `Scheduled ${result.scheduledCount} order(s)` +
          (result.unscheduledCount ? `, ${result.unscheduledCount} left unscheduled.` : '.')
      );
      await loadAll();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsScheduling(false);
    }
  }

  async function handleAccept(assignmentId) {
    await acceptAssignment(assignmentId);
    setStatusMessage('Accepted the proposed plan.');
    setSelectedEntry(null);
    await loadAll();
  }

  async function handleOverride(assignmentId, body) {
    await overrideAssignment(assignmentId, body);
    setStatusMessage('Overrode the plan — reassigned and logged.');
    setSelectedEntry(null);
    await loadAll();
  }

  const buttonBase =
    'inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Stage B</p>
          <h1 className="text-2xl font-bold text-ink">Process Twin AI Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`${buttonBase} cursor-pointer border border-border bg-surface text-ink hover:border-accent hover:text-accent`}
          >
            {isGenerating ? 'Generating…' : 'Generate orders'}
          </button>
          <button
            type="button"
            onClick={handleRunSchedule}
            disabled={isScheduling || queuedOrders.length === 0}
            className={`${buttonBase} cursor-pointer bg-accent text-white hover:bg-accent/90`}
          >
            {isScheduling ? 'Scheduling…' : 'Run scheduler'}
          </button>
        </div>
      </header>

      <p role="status" className="min-h-5 text-sm">
        {errorMessage ? (
          <span className="text-status-overdue">{errorMessage}</span>
        ) : (
          <span className="text-ink-muted">{statusMessage}</span>
        )}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <OrderQueue orders={queuedOrders} loading={loading} />
        <ProcessBoard
          specialists={specialists}
          scheduleEntries={scheduleEntries}
          loading={loading}
          onSelectAssignment={setSelectedEntry}
        />
      </div>

      {selectedEntry && (
        <OverridePlanModal
          entry={selectedEntry}
          specialists={specialists}
          onClose={() => setSelectedEntry(null)}
          onAccept={handleAccept}
          onOverride={handleOverride}
        />
      )}
    </div>
  );
}

export default Dashboard;

import OrderTypeTag from './OrderTypeTag';
import { formatRelativeToNow } from '../lib/format';

function OrderQueue({ orders, loading }) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-surface" aria-labelledby="queue-heading">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id="queue-heading" className="text-sm font-semibold text-ink">
          Queue
        </h2>
        <span className="font-mono text-xs tabular-nums text-ink-faint">{orders.length}</span>
      </header>

      {loading && (
        <p role="status" aria-busy="true" className="px-4 py-6 text-sm text-ink-faint">
          Loading queue…
        </p>
      )}

      {!loading && orders.length === 0 && (
        <p className="px-4 py-6 text-sm text-ink-faint">
          No orders in the queue. Use “Generate orders” above to add some.
        </p>
      )}

      {!loading && orders.length > 0 && (
        <ul className="divide-y divide-border">
          {orders.map(order => (
            <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <OrderTypeTag orderType={order.orderType} />
                <span className="truncate font-mono text-xs text-ink-faint">{order.id.slice(0, 8)}</span>
              </div>
              <span className="whitespace-nowrap font-mono text-xs tabular-nums text-ink-muted">
                {formatRelativeToNow(order.deadlineAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default OrderQueue;

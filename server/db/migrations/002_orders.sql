CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_type TEXT NOT NULL CHECK(order_type IN ('standard','urgent','premium','warranty')),
  required_specialist_type TEXT NOT NULL,
  estimated_hours REAL NOT NULL,
  requires_equipment INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  deadline_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK(status IN ('queued','scheduled','in_progress','done','overdue'))
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, deadline_at);

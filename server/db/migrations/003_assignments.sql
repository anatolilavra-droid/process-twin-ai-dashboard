CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  specialist_id TEXT NOT NULL REFERENCES specialists(id),
  planned_start TEXT NOT NULL,
  planned_end TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(created_by IN ('ai','human')),
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignments_order ON assignments(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assignments_specialist ON assignments(specialist_id, planned_start);

-- Enforces the spec invariant: at most one current assignment per order.
-- Overriding a plan must supersede (is_current = 0) the old row before inserting the new one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_one_current
  ON assignments(order_id)
  WHERE is_current = 1;

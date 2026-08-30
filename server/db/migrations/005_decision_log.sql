CREATE TABLE IF NOT EXISTS decision_log (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  action TEXT NOT NULL CHECK(action IN ('ai_proposed','human_accepted','human_overridden')),
  previous_assignment_id TEXT REFERENCES assignments(id),
  new_assignment_id TEXT REFERENCES assignments(id),
  reason_text TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_decision_log_order ON decision_log(order_id, created_at);

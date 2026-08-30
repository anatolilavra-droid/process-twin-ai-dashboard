CREATE TABLE IF NOT EXISTS explanations (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  factors_json TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK(confidence IN ('high','medium','low')),
  source TEXT NOT NULL CHECK(source IN ('llm','fallback')),
  created_at TEXT NOT NULL
);

-- One persisted explanation per assignment; a superseding override gets a
-- new assignment_id (see assignments.is_current) and thus a fresh explanation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_explanations_assignment ON explanations(assignment_id);

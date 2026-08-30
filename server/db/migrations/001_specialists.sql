CREATE TABLE IF NOT EXISTS specialists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialist_type TEXT NOT NULL,
  hours_per_day REAL NOT NULL
);

const db = require('../config/database');

function create({ id, assignmentId, factors, summaryText, confidence, source, createdAt }) {
  try {
    db.prepare(
      `INSERT INTO explanations (id, assignment_id, factors_json, summary_text, confidence, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, assignmentId, JSON.stringify(factors), summaryText, confidence, source, createdAt);
  } catch (err) {
    // assignment_id is UNIQUE — two concurrent requests for the same
    // uncached assignment (e.g. a double-click, or two open tabs) can both
    // reach here after both saw no cached row. The second INSERT loses the
    // race; that's fine, the first request's row is the one to serve —
    // just re-read it instead of surfacing the constraint violation as a 500.
    if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw err;
  }
  return findByAssignmentId(assignmentId);
}

function findByAssignmentId(assignmentId) {
  const row = db.prepare(`SELECT * FROM explanations WHERE assignment_id = ?`).get(assignmentId);
  if (!row) return row;
  return { ...row, factors: JSON.parse(row.factors_json) };
}

module.exports = { create, findByAssignmentId };

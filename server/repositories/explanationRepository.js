const db = require('../config/database');

function create({ id, assignmentId, factors, summaryText, confidence, source, createdAt }) {
  db.prepare(
    `INSERT INTO explanations (id, assignment_id, factors_json, summary_text, confidence, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, assignmentId, JSON.stringify(factors), summaryText, confidence, source, createdAt);
  return findByAssignmentId(assignmentId);
}

function findByAssignmentId(assignmentId) {
  const row = db.prepare(`SELECT * FROM explanations WHERE assignment_id = ?`).get(assignmentId);
  if (!row) return row;
  return { ...row, factors: JSON.parse(row.factors_json) };
}

module.exports = { create, findByAssignmentId };

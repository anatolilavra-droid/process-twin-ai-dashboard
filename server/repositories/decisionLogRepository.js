const db = require('../config/database');

function create({ id, orderId, action, previousAssignmentId, newAssignmentId, reasonText, createdAt }) {
  db.prepare(
    `INSERT INTO decision_log (id, order_id, action, previous_assignment_id, new_assignment_id, reason_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, orderId, action, previousAssignmentId || null, newAssignmentId || null, reasonText || null, createdAt);
  return findById(id);
}

function findById(id) {
  return db.prepare(`SELECT * FROM decision_log WHERE id = ?`).get(id);
}

function list({ orderId, limit = 50, offset = 0 } = {}) {
  if (orderId) {
    return db
      .prepare(`SELECT * FROM decision_log WHERE order_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(orderId, limit, offset);
  }
  return db.prepare(`SELECT * FROM decision_log ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
}

function countsByAction() {
  const rows = db.prepare(`SELECT action, COUNT(*) AS count FROM decision_log GROUP BY action`).all();
  const counts = { ai_proposed: 0, human_accepted: 0, human_overridden: 0 };
  for (const row of rows) counts[row.action] = row.count;
  return counts;
}

// Unpaginated, joined with order_type — for metricsService's decision-latency
// computation and the CSV/JSON research export, both of which need every row
// (not a page of them) grouped chronologically per order.
function listAllWithOrderType() {
  return db
    .prepare(
      `SELECT dl.*, o.order_type
       FROM decision_log dl
       JOIN orders o ON o.id = dl.order_id
       ORDER BY dl.order_id, dl.created_at`
    )
    .all();
}

module.exports = { create, findById, list, countsByAction, listAllWithOrderType };

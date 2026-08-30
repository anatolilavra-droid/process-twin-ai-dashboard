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

module.exports = { create, findById, list };

const db = require('../config/database');

function create({ id, orderId, specialistId, plannedStart, plannedEnd, createdBy, createdAt }) {
  db.prepare(
    `INSERT INTO assignments
       (id, order_id, specialist_id, planned_start, planned_end, created_by, is_current, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  ).run(id, orderId, specialistId, plannedStart, plannedEnd, createdBy, createdAt);
  return findById(id);
}

function findById(id) {
  return db.prepare(`SELECT * FROM assignments WHERE id = ?`).get(id);
}

function findCurrentByOrderId(orderId) {
  return db
    .prepare(`SELECT * FROM assignments WHERE order_id = ? AND is_current = 1`)
    .get(orderId);
}

function listByOrderId(orderId) {
  return db
    .prepare(`SELECT * FROM assignments WHERE order_id = ? ORDER BY created_at`)
    .all(orderId);
}

module.exports = { create, findById, findCurrentByOrderId, listByOrderId };

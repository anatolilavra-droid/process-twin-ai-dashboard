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

// Marks an assignment no longer current — must run in the same transaction
// as inserting its replacement, or the order briefly has zero current rows.
function supersede(id) {
  db.prepare(`UPDATE assignments SET is_current = 0 WHERE id = ?`).run(id);
}

// Read model for the schedule board: every current assignment joined with
// its order and specialist, in start-time order.
function listCurrentWithDetails() {
  return db
    .prepare(
      `SELECT
         a.id AS assignment_id,
         a.order_id,
         a.specialist_id,
         a.planned_start,
         a.planned_end,
         a.created_by,
         o.order_type,
         o.status AS order_status,
         o.deadline_at,
         o.estimated_hours,
         s.name AS specialist_name,
         s.specialist_type
       FROM assignments a
       JOIN orders o ON o.id = a.order_id
       JOIN specialists s ON s.id = a.specialist_id
       WHERE a.is_current = 1
       ORDER BY a.planned_start`
    )
    .all();
}

module.exports = { create, findById, findCurrentByOrderId, listByOrderId, listCurrentWithDetails, supersede };

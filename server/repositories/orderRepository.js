const db = require('../config/database');

function create({
  id,
  orderType,
  requiredSpecialistType,
  estimatedHours,
  requiresEquipment,
  createdAt,
  deadlineAt,
  status,
}) {
  db.prepare(
    `INSERT INTO orders
       (id, order_type, required_specialist_type, estimated_hours, requires_equipment, created_at, deadline_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    orderType,
    requiredSpecialistType,
    estimatedHours,
    requiresEquipment ? 1 : 0,
    createdAt,
    deadlineAt,
    status || 'queued'
  );
  return findById(id);
}

function findById(id) {
  return db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id);
}

function list({ status, limit = 50, offset = 0 } = {}) {
  if (status) {
    return db
      .prepare(`SELECT * FROM orders WHERE status = ? ORDER BY deadline_at LIMIT ? OFFSET ?`)
      .all(status, limit, offset);
  }
  return db
    .prepare(`SELECT * FROM orders ORDER BY deadline_at LIMIT ? OFFSET ?`)
    .all(limit, offset);
}

function updateStatus(id, status) {
  db.prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(status, id);
  return findById(id);
}

module.exports = { create, findById, list, updateStatus };

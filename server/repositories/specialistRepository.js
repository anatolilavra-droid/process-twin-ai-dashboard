const db = require('../config/database');

function create({ id, name, specialistType, hoursPerDay }) {
  db.prepare(
    `INSERT INTO specialists (id, name, specialist_type, hours_per_day)
     VALUES (?, ?, ?, ?)`
  ).run(id, name, specialistType, hoursPerDay);
  return findById(id);
}

function findById(id) {
  return db.prepare(`SELECT * FROM specialists WHERE id = ?`).get(id);
}

function list() {
  return db.prepare(`SELECT * FROM specialists ORDER BY name`).all();
}

module.exports = { create, findById, list };

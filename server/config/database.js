const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { dbPath } = require('./env');

const resolvedPath = path.resolve(dbPath);
const dir = path.dirname(resolvedPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(resolvedPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

module.exports = db;

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const migrationsDir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  db.exec(sql);
  console.log(`Applied migration: ${file}`);
}

console.log('Migrations complete.');

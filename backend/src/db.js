const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'healthcoversim.db');
const INIT_SQL_PATH = path.join(__dirname, '..', 'init.sql');

// Pass ':memory:' for a throwaway database (used by the tests)
function openDatabase(filename = process.env.DB_PATH || DEFAULT_DB_PATH) {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const db = new Database(filename);
  db.exec(fs.readFileSync(INIT_SQL_PATH, 'utf8'));
  return db;
}

module.exports = { openDatabase, DEFAULT_DB_PATH };

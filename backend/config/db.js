const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const env = require('./env');

// Ensure the data directory exists before opening the database file.
const dataDir = path.dirname(env.DATABASE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(env.DATABASE_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

/**
 * Run a SELECT that returns multiple rows.
 * @param {string} sql
 * @param {Array|Object} params
 */
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...(Array.isArray(params) ? params : [params]));
}

/**
 * Run a SELECT that returns a single row (or undefined).
 */
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...(Array.isArray(params) ? params : [params]));
}

/**
 * Run an INSERT/UPDATE/DELETE statement.
 * Returns { changes, lastInsertRowid }.
 */
function run(sql, params = []) {
  const stmt = db.prepare(sql);
  const result = stmt.run(...(Array.isArray(params) ? params : [params]));
  return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
}

/**
 * Execute a function within a transaction. Rolls back automatically on throw.
 */
function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, all, get, run, transaction };

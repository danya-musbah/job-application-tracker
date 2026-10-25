const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');

function initDatabase() {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('[db] Schema applied successfully.');
}

if (require.main === module) {
  initDatabase();
  console.log('[db] Database initialized at', require('../config/env').DATABASE_PATH);
  process.exit(0);
}

module.exports = { initDatabase };

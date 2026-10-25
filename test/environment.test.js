const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

test('rejects an empty JWT secret in production', () => {
  const result = spawnSync(
    process.execPath,
    ['-e', "require('./backend/config/env')"],
    {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: '' },
      encoding: 'utf8',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required environment variable: JWT_SECRET/);
});

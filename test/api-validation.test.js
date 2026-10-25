const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  return port;
}

async function waitForApi(url, child, output) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`API server exited before becoming healthy:\n${output()}`);
    }
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`API server did not become healthy:\n${output()}`);
}

test('validates settings and notification mutations through the API', async (t) => {
  const root = path.resolve(__dirname, '..');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'job-tracker-api-test-'));
  const port = await availablePort();
  const apiUrl = `http://127.0.0.1:${port}/api`;
  const logs = [];
  const child = spawn(process.execPath, ['backend/server.js'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      DATABASE_PATH: path.join(tempDir, 'test.db'),
      JWT_SECRET: 'test-only-secret-not-used-outside-this-process',
      FRONTEND_URL: `http://127.0.0.1:${port}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.setEncoding('utf8').on('data', (chunk) => logs.push(chunk));
  child.stderr.setEncoding('utf8').on('data', (chunk) => logs.push(chunk));

  t.after(async () => {
    if (child.exitCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill();
      await exited;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  await waitForApi(apiUrl, child, () => logs.join(''));
  const cookies = new Map();
  async function request(route, { method = 'GET', body } = {}) {
    const headers = {};
    if (cookies.size) headers.Cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    if (method !== 'GET') headers['X-CSRF-Token'] = cookies.get('jat_csrf');
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${apiUrl}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const setCookie of response.headers.getSetCookie()) {
      const pair = setCookie.split(';', 1)[0];
      const separator = pair.indexOf('=');
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return {
      status: response.status,
      body: response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : await response.text(),
    };
  }

  await request('/csrf-token');
  const registration = await request('/auth/register', {
    method: 'POST',
    body: { name: 'API Test', email: 'api-test@example.com', password: 'TestPassword530!' },
  });
  assert.equal(registration.status, 201);

  const invalidStatus = await request('/settings/preferences', {
    method: 'PUT',
    body: { defaultStatus: 'not-a-status' },
  });
  assert.equal(invalidStatus.status, 422);

  const invalidCurrency = await request('/settings/preferences', {
    method: 'PUT',
    body: { defaultCurrency: '1!!' },
  });
  assert.equal(invalidCurrency.status, 422);

  const savedPreferences = await request('/settings/preferences', {
    method: 'PUT',
    body: { defaultStatus: 'Applied', defaultCurrency: 'eur' },
  });
  assert.equal(savedPreferences.status, 200);
  assert.equal(savedPreferences.body.defaultCurrency, 'EUR');

  const invalidSourceType = await request('/settings/job-sources', {
    method: 'POST',
    body: { name: 42 },
  });
  assert.equal(invalidSourceType.status, 422);

  const invalidSourceLength = await request('/settings/job-sources', {
    method: 'POST',
    body: { name: 'x'.repeat(101) },
  });
  assert.equal(invalidSourceLength.status, 422);

  const customSource = await request('/settings/job-sources', {
    method: 'POST',
    body: { name: '  Career Fair  ' },
  });
  assert.equal(customSource.status, 201);
  assert.equal(customSource.body.name, 'Career Fair');

  const csv = [
    'Company Name,Job Title,Application Date,Salary Min,Salary Max',
    'Example Company,Engineer,2026-10-25,0,0',
  ].join('\n');
  const preview = await request('/applications/import/preview', {
    method: 'POST',
    body: { csvText: csv },
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.valid.length, 1);
  const importResult = await request('/applications/import/commit', {
    method: 'POST',
    body: { rows: preview.body.valid.map((row) => row.data) },
  });
  assert.equal(importResult.body.imported, 1);
  const applications = await request('/applications');
  assert.equal(applications.body.data[0].salaryMin, 0);
  assert.equal(applications.body.data[0].salaryMax, 0);

  const duplicatePreview = await request('/applications/import/preview', {
    method: 'POST',
    body: { csvText: csv },
  });
  assert.equal(duplicatePreview.body.duplicates.length, 1);

  const whitespaceDuplicate = await request('/applications/import/commit', {
    method: 'POST',
    body: {
      rows: [{
        companyName: ' Example Company ',
        jobTitle: 'Engineer',
        applicationDate: '2026-10-25',
      }],
    },
  });
  assert.equal(whitespaceDuplicate.body.imported, 0);
  assert.equal(whitespaceDuplicate.body.skipped, 1);

  const delimiterValues = await request('/applications/import/preview', {
    method: 'POST',
    body: {
      csvText: [
        'Company Name,Job Title,Application Date',
        '"A|B",C,2026-10-26',
        'A,"B|C",2026-10-26',
      ].join('\n'),
    },
  });
  assert.equal(delimiterValues.body.valid.length, 2);

  const invalidDate = await request('/applications/import/preview', {
    method: 'POST',
    body: {
      csvText: [
        'Company Name,Job Title,Application Date',
        'Bad Date Company,Engineer,2026-02-31',
      ].join('\n'),
    },
  });
  assert.equal(invalidDate.body.invalid.length, 1);

  const invalidSalary = await request('/applications/import/commit', {
    method: 'POST',
    body: {
      rows: [{
        companyName: 'Other Company',
        jobTitle: 'Engineer',
        applicationDate: '2026-10-25',
        salaryMin: -1,
      }],
    },
  });
  assert.equal(invalidSalary.body.imported, 0);
  assert.equal(invalidSalary.body.errors.length, 1);

  const invalidNotificationId = await request('/notifications/abc/read', { method: 'PATCH' });
  assert.equal(invalidNotificationId.status, 422);

  const missingNotification = await request('/notifications/999/read', { method: 'PATCH' });
  assert.equal(missingNotification.status, 404);
});

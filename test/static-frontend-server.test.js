const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { createStaticServer, resolveStaticPath } = require('../backend/static-frontend-server');

test('maps the frontend root to index.html', () => {
  const root = path.resolve('frontend');
  assert.deepEqual(resolveStaticPath(root, '/'), {
    filePath: path.join(root, 'index.html'),
  });
});

test('rejects sibling paths that share the frontend directory prefix', () => {
  const root = path.resolve('frontend');
  const target = resolveStaticPath(root, '/../frontend-private/secret.txt');
  assert.equal(target.statusCode, 403);
});

test('rejects malformed percent-encoding', () => {
  const target = resolveStaticPath(path.resolve('frontend'), '/%E0%A4%A');
  assert.equal(target.statusCode, 400);
});

test('rejects decoded null bytes', () => {
  const target = resolveStaticPath(path.resolve('frontend'), '/%00');
  assert.equal(target.statusCode, 400);
});

test('serves the frontend and local icon sprite with their content types', async (t) => {
  const server = createStaticServer(path.resolve('frontend'));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /^text\/html/);

  const sprite = await fetch(`http://127.0.0.1:${port}/icons/lucide.svg`);
  assert.equal(sprite.status, 200);
  assert.match(sprite.headers.get('content-type'), /^image\/svg\+xml/);
  assert.match(await sprite.text(), /id="bell"/);
});

/**
 * Minimal static file server for the frontend, kept separate from the API
 * server to preserve a clean frontend/backend split. In production you can
 * instead serve the `frontend/` folder from any static host (Nginx, S3,
 * Netlify, Vercel, GitHub Pages, etc).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'frontend');
const PORT = parseInt(process.env.FRONTEND_PORT || '5500', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function resolveStaticPath(root, requestTarget) {
  let pathname;
  try {
    pathname = decodeURIComponent(String(requestTarget || '/').split('?')[0]);
  } catch {
    return { statusCode: 400 };
  }

  if (pathname.includes('\0')) return { statusCode: 400 };
  if (pathname === '/') pathname = '/index.html';
  const resolvedRoot = path.resolve(root);
  const filePath = path.resolve(resolvedRoot, `.${pathname}`);
  const relativePath = path.relative(resolvedRoot, filePath);

  if (
    relativePath === '..'
    || relativePath.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativePath)
  ) {
    return { statusCode: 403 };
  }
  return { filePath };
}

function createStaticServer(root = ROOT) {
  const resolvedRoot = path.resolve(root);
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Method not allowed');
      return;
    }

    const target = resolveStaticPath(resolvedRoot, req.url);
    if (target.statusCode) {
      res.writeHead(target.statusCode, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end(target.statusCode === 400 ? 'Bad request' : 'Forbidden');
      return;
    }

    fs.readFile(target.filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR' || err.code === 'EISDIR') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Server error');
        }
        return;
      }
      const ext = path.extname(target.filePath);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Length': content.length,
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : content);
    });
  });
}

if (require.main === module) {
  createStaticServer().listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[frontend] Static frontend server running on http://localhost:${PORT}`);
  });
}

module.exports = { createStaticServer, resolveStaticPath };

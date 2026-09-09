#!/usr/bin/env node
/** A dependency-free, loopback-only static server for the studio. */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
};
const within = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

/** Returns a listening http.Server. Port 0 requests an unused ephemeral port. */
export async function createServer({ root = projectRoot, host = '127.0.0.1', port = 4173 } = {}) {
  if (!['127.0.0.1', '::1', 'localhost'].includes(host)) throw new Error('The studio server only binds to loopback addresses.');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer between 0 and 65535.');
  const resolvedRoot = await realpath(path.resolve(root));
  if (!(await stat(resolvedRoot)).isDirectory()) throw new Error('Static server root must be a directory.');
  const server = http.createServer(async (request, response) => {
    const fail = (status, message) => {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
      response.end(message);
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      return fail(405, 'Method not allowed');
    }
    try {
      // Decode before resolving so encoded separators cannot evade containment.
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.includes('\0') || pathname.split(/[\\/]+/).some(part => part.startsWith('.'))) return fail(403, 'Forbidden');
      const candidate = path.resolve(resolvedRoot, `.${pathname}`);
      if (!within(resolvedRoot, candidate)) return fail(403, 'Forbidden');
      let target = await realpath(candidate);
      if (!within(resolvedRoot, target)) return fail(403, 'Forbidden');
      let details = await stat(target);
      if (details.isDirectory()) {
        target = await realpath(path.join(target, 'index.html'));
        if (!within(resolvedRoot, target)) return fail(403, 'Forbidden');
        details = await stat(target);
      }
      if (!details.isFile()) return fail(404, 'Not found');
      const headers = {
        'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream',
        'Content-Length': details.size,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      };
      let start = 0; let end = details.size - 1; let status = 200;
      if (request.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        if (range && (range[1] || range[2])) {
          if (range[1]) { start = Number(range[1]); end = range[2] ? Math.min(Number(range[2]), end) : end; }
          else { start = Math.max(0, details.size - Number(range[2])); }
        }
        if (!range || (!range[1] && !range[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= details.size) {
          response.setHeader('Content-Range', `bytes */${details.size}`);
          return fail(416, 'Range not satisfiable');
        }
        status = 206;
        headers['Content-Range'] = `bytes ${start}-${end}/${details.size}`;
        headers['Content-Length'] = end - start + 1;
      }
      response.writeHead(status, headers);
      if (request.method === 'HEAD') return response.end();
      if (!details.size) return response.end();
      const stream = createReadStream(target, { start, end });
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    } catch (error) {
      if (response.headersSent) return response.destroy();
      if (error instanceof URIError || error.code === 'ERR_INVALID_URL') return fail(400, 'Bad request');
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) return fail(404, 'Not found');
      if (error.code === 'EACCES') return fail(403, 'Forbidden');
      fail(500, 'Server error');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => { server.off('error', reject); resolve(); });
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/serve.mjs [--port 4173]\nServes this project at http://127.0.0.1:4173. Press Ctrl+C to stop.');
  } else {
    try {
      if (args.length && (args.length !== 2 || args[0] !== '--port')) throw new Error('Use --port NUMBER or --help.');
      const server = await createServer({ port: args.length ? Number(args[1]) : Number(process.env.PORT || 4173) });
      console.log(`Loop Atelier: http://127.0.0.1:${server.address().port}`);
      const close = () => { server.close(); server.closeAllConnections(); };
      process.once('SIGINT', close);
      process.once('SIGTERM', close);
    } catch (error) {
      console.error(`Server: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

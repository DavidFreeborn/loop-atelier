import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from '../scripts/serve.mjs';

let temporary;
let server;
let base;

before(async () => {
  temporary = await mkdtemp(path.join(tmpdir(), 'loop-atelier-http-test-'));
  const root = path.join(temporary, 'public');
  const outside = path.join(temporary, 'outside');
  await mkdir(root);
  await mkdir(outside);
  await mkdir(path.join(root, '.private'));
  await writeFile(path.join(root, 'index.html'), '<!doctype html><title>Local test</title>');
  await writeFile(path.join(root, 'sample.js'), 'abcdefghij');
  await writeFile(path.join(root, '.env'), 'do not serve this');
  await writeFile(path.join(root, '.private', 'sample.txt'), 'do not serve this');
  await writeFile(path.join(outside, 'secret.txt'), 'outside the allowed directory');
  // Junctions do not require the elevated Windows privilege for file symlinks.
  await symlink(outside, path.join(root, 'external'), 'junction');
  server = await createServer({ root, port: 0 });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  if (temporary) {
    // Teardown only the directory created by this test, under the system temp root.
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(tmpdir()));
    assert.ok(path.basename(temporary).startsWith('loop-atelier-http-test-'));
    await rm(temporary, { recursive: true, force: true });
  }
});

test('serves the project index and browser modules with correct metadata', async () => {
  const index = await fetch(`${base}/`);
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type'), /^text\/html/);
  assert.match(await index.text(), /Local test/);
  const module = await fetch(`${base}/sample.js`);
  assert.equal(module.status, 200);
  assert.match(module.headers.get('content-type'), /^text\/javascript/);
  assert.equal(module.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(module.headers.get('cache-control'), 'no-store');
  assert.equal(await module.text(), 'abcdefghij');
});

test('HEAD returns the real content length and no response body', async () => {
  const response = await fetch(`${base}/sample.js`, { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-length'), '10');
  assert.equal(await response.text(), '');
});

test('never serves hidden files, hidden directories or symlinks outside the root', async () => {
  for (const route of ['/.env', '/.private/sample.txt', '/external/secret.txt']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 403, route);
    assert.equal(await response.text(), 'Forbidden');
  }
});

test('encoded Windows traversal and null bytes cannot reach outside the root', async () => {
  for (const route of ['/%5C..%5Coutside%5Csecret.txt', '/%00', '/%2e%2e%5coutside%5csecret.txt']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 403, route);
    assert.doesNotMatch(await response.text(), /outside the allowed directory/);
  }
});

test('malformed URLs, missing files and write methods fail cleanly', async () => {
  assert.equal((await fetch(`${base}/%zz`)).status, 400);
  assert.equal((await fetch(`${base}/missing-file`)).status, 404);
  const post = await fetch(`${base}/sample.js`, { method: 'POST', body: 'change this file' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
  assert.equal(await (await fetch(`${base}/sample.js`)).text(), 'abcdefghij');
});

test('single byte ranges support exact, suffix and open-ended movie seeking', async () => {
  for (const [range, expected, contentRange] of [
    ['bytes=2-5', 'cdef', 'bytes 2-5/10'],
    ['bytes=-2', 'ij', 'bytes 8-9/10'],
    ['bytes=8-', 'ij', 'bytes 8-9/10'],
    ['bytes=8-999', 'ij', 'bytes 8-9/10'],
  ]) {
    const response = await fetch(`${base}/sample.js`, { headers: { Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('content-range'), contentRange);
    assert.equal(response.headers.get('content-length'), String(expected.length));
    assert.equal(await response.text(), expected);
  }
});

test('invalid byte ranges return a valid 416 response', async () => {
  for (const range of ['bytes=99-', 'bytes=-0', 'bytes=8-2', 'bytes=-', 'bytes=0-1,3-4']) {
    const response = await fetch(`${base}/sample.js`, { headers: { Range: range } });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('content-range'), 'bytes */10');
    assert.equal(await response.text(), 'Range not satisfiable');
  }
});

test('the server refuses a public network binding', async () => {
  await assert.rejects(createServer({ host: '0.0.0.0', port: 0 }), /loopback/);
});

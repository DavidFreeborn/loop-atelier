/** Ordinary cold starts, after exports finish; each run owns a fresh browser.
 * `ready` means the API exists, not that WebGL has finished startup/recovery.
 * Record transient losses and require a real, responsive, stable framebuffer. */
import { createRequire } from 'node:module';
import { homedir, release } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createServer } from '../scripts/serve.mjs';
const require = createRequire(import.meta.url);
let playwrightPath;
try { playwrightPath = require.resolve('playwright'); }
catch { playwrightPath = require.resolve(path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const { chromium } = require(playwrightPath);
const playwrightVersion = require(path.join(path.dirname(playwrightPath), 'package.json')).version;
const out = path.resolve('output/qa/03');
await mkdir(out, { recursive: true });
const results = [], started = new Date().toISOString();
const originalPath = path.join(out, 'cold-start-original-failure.json');
const original = await readFile(originalPath).catch(() => null);
const server = await createServer({ port: 0 });
const modes = [
  { id: 'full-chromium', launch: { channel: 'chromium' } },
  { id: 'legacy-headless-shell', launch: {} },
];
const args = ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'];
const report = () => ({
  condition: 'No publication renders running; reduced motion; ordinary source URL without export query; separate fresh browser for every run',
  started, updated: new Date().toISOString(), node: process.version,
  os: `${process.platform} ${release()} ${process.arch}`, playwrightVersion, playwrightPath,
  originalFailure: original ? { file: path.basename(originalPath), sha256: createHash('sha256').update(original).digest('hex'), note: 'Original test stopped at first source run after two RAF callbacks. Its source URL included ?export=1.' } : null,
  criteria: { startupTimeoutMs: 15000, stableIntervalMs: 700, wholeRunTimeoutMs: 35000,
    pass: 'API ready; usable GL and visible artwork; 700ms stable context; two distinct nonblank phase images; final paused default state; no uncaught page errors. Losses remain recorded and require recovery.' },
  summary: { passed: results.filter(r => r.passed).length, completed: results.length,
    transientLosses: results.reduce((n, r) => n + (r.final?.losses ?? r.immediate?.losses ?? 0), 0) },
  results,
});
const save = () => writeFile(path.join(out, 'cold-start.json'), JSON.stringify(report(), null, 2));

function snapshot() {
  const canvas = document.getElementById('art-canvas');
  const gl = canvas?.getContext('webgl2');
  const usable = !!gl && !gl.isContextLost();
  const extension = usable ? gl.getExtension('WEBGL_debug_renderer_info') : null;
  return {
    atMs: performance.now(), losses: window.qaEvents.filter(e => e.type === 'lost').length,
    restores: window.qaEvents.filter(e => e.type === 'restored').length,
    events: window.qaEvents, stats: window.loopStudio?.getStats?.(), state: window.loopStudio?.getState?.(),
    errorVisible: !document.getElementById('canvas-error')?.hidden,
    errorText: document.getElementById('canvas-error')?.textContent,
    renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null,
    vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : null,
    webglVersion: usable ? gl.getParameter(gl.VERSION) : null,
    dimensions: canvas ? [canvas.width, canvas.height] : null,
  };
}

// Reads the existing default framebuffer; never creates a capture context.
function framebuffer() {
  const canvas = document.getElementById('art-canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl || gl.isContextLost()) throw new Error('Framebuffer unavailable: context lost');
  const pixels = new Uint8Array(canvas.width * canvas.height * 4);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let hash = 2166136261, min = 255, max = 0, sum = 0, sumSq = 0, nonblack = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const v = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    min = Math.min(min, v); max = Math.max(max, v); sum += v; sumSq += v * v;
    if (v > 8) nonblack++;
    hash = Math.imul(hash ^ pixels[i], 16777619);
    hash = Math.imul(hash ^ pixels[i + 1], 16777619);
    hash = Math.imul(hash ^ pixels[i + 2], 16777619);
  }
  const n = pixels.length / 4, mean = sum / n;
  return { hash: (hash >>> 0).toString(16), pixels: n, min, max, mean,
    standardDeviation: Math.sqrt(Math.max(0, sumSq / n - mean * mean)), nonblackFraction: nonblack / n,
    glError: gl.getError(), atMs: performance.now(), measuredFrames: loopStudio.getStats().measuredFrames };
}

try {
  for (const mode of modes) for (const surface of ['source', 'offline']) for (let run = 1; run <= 3; run++) {
    const result = { mode: mode.id, surface, run, passed: false, errors: [], consoleErrors: [], launchArgs: args };
    let browser, page, watchdog;
    try {
      browser = await chromium.launch({ headless: true, ...mode.launch, args, timeout: 20000 });
      result.browserVersion = browser.version();
      const session = await browser.newBrowserCDPSession();
      result.runtime = await session.send('Browser.getVersion');
      result.commandLine = await session.send('Browser.getBrowserCommandLine').then(v => v.arguments).catch(() => null);
      await session.detach();
      watchdog = setTimeout(() => { result.watchdogExpired = true; browser.close().catch(() => {}); }, 35000);
      page = await browser.newPage({ viewport: { width: 760, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
      page.setDefaultTimeout(15000);
      page.on('pageerror', e => result.errors.push(e.message));
      page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
      await page.addInitScript(() => {
        window.qaEvents = [];
        for (const [event, type] of [['webglcontextlost', 'lost'], ['webglcontextrestored', 'restored']]) {
          document.addEventListener(event, e => window.qaEvents.push({ type, atMs: performance.now(), target: e.target.id, statusMessage: e.statusMessage ?? '' }), true);
        }
      });
      result.url = surface === 'source' ? `http://127.0.0.1:${server.address().port}/` : pathToFileURL(path.resolve('output/loop-atelier.html')).href;
      await page.goto(result.url, { waitUntil: 'load', timeout: 15000 });
      await page.waitForFunction(() => window.loopStudio?.ready || window.loopStudio?.error);
      result.apiReadyAtMs = await page.evaluate(() => { if (loopStudio.error) throw new Error(loopStudio.error); return performance.now(); });
      await page.evaluate(() => Promise.race([new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))), new Promise(r => setTimeout(r, 1000))]));
      result.immediate = await page.evaluate(snapshot);
      await page.waitForFunction(() => {
        const stats = window.loopStudio?.getStats();
        const usable = stats && !stats.contextLost && stats.measuredFrames > 0 && stats.displaySize > 0 && document.getElementById('canvas-error').hidden;
        if (!usable) { window.qaStableSince = null; return false; }
        window.qaFirstUsableAt ??= performance.now();
        window.qaStableSince ??= performance.now();
        const lastEvent = window.qaEvents.at(-1)?.atMs ?? 0;
        return performance.now() - Math.max(window.qaStableSince, lastEvent) >= 700;
      }, null, { timeout: 15000, polling: 100 });
      result.firstUsableAtMs = await page.evaluate(() => window.qaFirstUsableAt);
      result.stable = await page.evaluate(snapshot);
      result.images = [];
      for (const phase of [.17, .23, .15]) {
        const before = await page.evaluate(phase => { const n = loopStudio.getStats().measuredFrames; loopStudio.setPhase(phase); return n; }, phase);
        await page.waitForFunction(n => !loopStudio.getStats().contextLost && loopStudio.getStats().measuredFrames > n, before, { timeout: 5000 });
        const pixels = await page.evaluate(framebuffer);
        result.images.push({ phase, ...pixels });
        assert.equal(pixels.glError, 0, 'Framebuffer GL error');
        assert.ok(pixels.standardDeviation > 2 && pixels.max - pixels.min > 20 && pixels.nonblackFraction > .01, 'Artwork must contain a nonblank rendered image');
      }
      assert.notEqual(result.images[0].hash, result.images[1].hash, 'Changing phase must change the actual image');
      result.final = await page.evaluate(snapshot);
      assert.equal(result.final.stats.contextLost, false);
      assert.equal(result.final.errorVisible, false);
      assert.equal(result.final.state.scene, 'palimpsest');
      assert.equal(result.final.state.playing, false);
      assert.ok(Math.abs(result.final.state.time - .15) < 1e-12, 'Phase restored to .15 within floating-point precision');
      assert.deepEqual(result.errors, []);
      assert.equal(result.final.losses, result.final.restores, 'Every recorded loss must have a restoration');
      result.passed = true;
    } catch (error) {
      result.failure = error.stack || error.message;
      if (page && !page.isClosed()) {
        result.final = await page.evaluate(snapshot).catch(e => ({ snapshotError: e.message }));
        await page.screenshot({ path: path.join(out, `cold-start-${mode.id}-${surface}-${run}-failure.png`) }).catch(() => {});
      }
    } finally {
      clearTimeout(watchdog);
      await browser?.close().catch(() => {});
      results.push(result);
      await save();
      console.log(JSON.stringify({ mode: mode.id, surface, run, passed: result.passed,
        losses: result.final?.losses ?? result.immediate?.losses, restores: result.final?.restores,
        usableAtMs: result.firstUsableAtMs, renderer: result.final?.renderer, failure: result.failure?.split('\n')[0] }));
    }
  }
} finally {
  await save();
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
}
const final = report();
console.log(JSON.stringify(final.summary));
if (final.summary.passed !== 12) process.exitCode = 1;

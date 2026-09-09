/** Independent end-to-end studio QA. Run against npm start; artifacts go to output/qa. */
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
let playwright;
for (const candidate of ['playwright', path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')]) {
  try { playwright = require(candidate); break; } catch {}
}
if (!playwright) throw new Error('Install Playwright or expose the bundled runtime.');
const out = path.resolve('output/qa');
const skipCaptures = process.env.QA_SKIP_CAPTURES === '1';
await mkdir(out, { recursive: true });
const records = [], consoleErrors = [], networkErrors = [], exceptions = [];
const record = (name, passed, detail = {}) => { const r = { name, passed, ...detail }; records.push(r); console.log(JSON.stringify(r)); };
const assert = (name, actual, expected) => record(name, JSON.stringify(actual) === JSON.stringify(expected), { actual, expected });
const config = { headless: true, channel: 'chromium', args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] };
let browser;
try { browser = await playwright.chromium.launch(config); }
catch (error) {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  if (!executablePath) throw error;
  browser = await playwright.chromium.launch({ ...config, executablePath });
}
let page;
const state = () => page.evaluate(() => loopStudio.getState());
const twoFrames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const pngBuffer = url => Buffer.from(url.split(',')[1], 'base64');
const digest = buffer => createHash('sha256').update(buffer).digest('hex');
const capture = async (scene, extra = {}) => {
  const buffer = pngBuffer(await page.evaluate(options => loopStudio.capture(options), { scene, size: 600, time: .15, samples: 4, ...extra }));
  return { buffer, width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), hash: digest(buffer) };
};
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', deviceScaleFactor: 1, acceptDownloads: true });
  page.on('pageerror', error => exceptions.push(error.stack || error.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('response', response => { if (response.status() >= 400) networkErrors.push({ status: response.status(), url: response.url() }); });
  await page.goto(process.env.LOOP_STUDIO_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.loopStudio?.ready === true);
  await page.waitForFunction(() => !document.getElementById('art-canvas').getContext('webgl2').isContextLost() && document.getElementById('canvas-error').hidden, null, { timeout: 20000 });
  record('Engine starts', true, { browser: browser.version(), stats: await page.evaluate(() => loopStudio.getStats()) });
  assert('Reduced-motion starts paused', (await state()).playing, false);
  const reducedBefore = (await state()).time;
  await page.waitForTimeout(350);
  assert('Reduced-motion phase stable', (await state()).time, reducedBefore);
  await page.screenshot({ path: path.join(out, 'desktop-1440.png'), fullPage: true });
  const sceneIds = await page.evaluate(() => loopStudio.scenes.map(s => s.id));
  const referenceCaptures = {};
  for (const id of sceneIds) {
    await page.locator('#scene-select').selectOption(id);
    await twoFrames();
    assert(`Scene ${id} selection`, (await state()).scene, id);
    assert(`Scene ${id} selected option`, await page.locator('#scene-select').inputValue(), id);
    if (!skipCaptures) {
      const result = await capture(id);
      await writeFile(path.join(out, `${id}-600.png`), result.buffer);
      referenceCaptures[id] = result.hash;
      record(`Capture ${id}`, result.width === 600 && result.height === 600, { width: result.width, height: result.height, bytes: result.buffer.length, sha256: result.hash });
    }
  }
  // Pure capture should not depend on other scenes having been rendered first.
  if (!skipCaptures) {
    const repeat = await capture(sceneIds[0]);
    assert('Capture independent of render order', repeat.hash, referenceCaptures[sceneIds[0]]);
  }
  await page.locator('#scene-select').selectOption(sceneIds[0]);
  await page.locator('#play').click();
  const playBefore = (await state()).time;
  await page.waitForTimeout(350);
  record('Play advances phase', (await state()).time !== playBefore);
  record('Canvas accessibility label tracks playing', (await page.locator('#art-canvas').getAttribute('aria-label')).includes('Animated'));
  await page.locator('#play').click();
  const pauseBefore = (await state()).time;
  await page.waitForTimeout(350);
  assert('Pause stabilizes phase', (await state()).time, pauseBefore);
  assert('Play button accessible label after pause', await page.locator('#play').getAttribute('aria-label'), 'Play animation');
  record('Canvas accessibility label tracks pause', (await page.locator('#art-canvas').getAttribute('aria-label')).includes('Paused'));
  await page.locator('#play').click();
  await page.locator('#timeline').focus();
  await page.locator('#timeline').press('Home');
  await page.locator('#timeline').press('ArrowRight');
  assert('Timeline interaction pauses', (await state()).playing, false);
  assert('Timeline keyboard selects phase', (await state()).time, .001);
  await page.locator('#variation').focus();
  await page.locator('#variation').press('End');
  assert('Deformation keyboard control', (await state()).variation, 1);
  await page.locator('#exposure').focus();
  await page.locator('#exposure').press('Home');
  record('Exposure keyboard control', Math.abs((await state()).exposure - .35) < 1e-10, { actual: (await state()).exposure, expected: .35 });
  await page.locator('#duration').focus();
  await page.locator('#duration').press('End');
  assert('Duration keyboard control', (await state()).duration, 16);
  await page.locator('#seed').fill('123456'); await page.locator('#seed').press('Tab');
  assert('Seed change', (await state()).seed, 123456);
  await page.locator('#seed').fill('-3'); await page.locator('#seed').press('Tab');
  assert('Invalid seed does not corrupt state', (await state()).seed, 123456);
  assert('Invalid seed UI restored', await page.locator('#seed').inputValue(), '123456');
  await page.locator('#new-seed').click();
  record('New variation changes seed', (await state()).seed !== 123456, { seed: (await state()).seed });
  await page.locator('#density').selectOption('60000');
  assert('Density control', (await state()).count, 60000);
  for (const palette of ['amber', 'paper', 'silver']) {
    await page.locator('#palette').selectOption(palette); await twoFrames();
    assert(`Palette ${palette}`, (await state()).palette, palette);
    if (!skipCaptures) {
      const result = await capture(sceneIds[0], { palette });
      await writeFile(path.join(out, `palette-${palette}.png`), result.buffer);
    }
  }
  await page.locator('#reset').click();
  const reset = await state();
  assert('Reset curated parameters', { seed: reset.seed, variation: reset.variation, exposure: reset.exposure, count: reset.count, palette: reset.palette }, { seed: 42, variation: .5, exposure: 1, count: 180000, palette: 'silver' });

  const expectedRecipe = await page.evaluate(() => loopStudio.getRecipe());
  const recipeDownload = page.waitForEvent('download'); await page.locator('#save-preset').click();
  const recipeFile = await recipeDownload; await recipeFile.saveAs(path.join(out, recipeFile.suggestedFilename()));
  record('Recipe downloads', recipeFile.suggestedFilename().endsWith('.recipe.json'), { filename: recipeFile.suggestedFilename() });
  await page.locator('#scene-select').selectOption(sceneIds[1]);
  await page.locator('#preset-file').setInputFiles({ name: 'saved.recipe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(expectedRecipe)) });
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('Recipe loaded'));
  assert('Recipe import exact roundtrip', await page.evaluate(() => loopStudio.getRecipe()), expectedRecipe);
  const beforeInvalid = await page.evaluate(() => loopStudio.getRecipe());
  await page.locator('#preset-file').setInputFiles({ name: 'invalid.recipe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...expectedRecipe, seed: -2 })) });
  await page.waitForFunction(() => document.getElementById('error-message').textContent.includes('Recipe seed'));
  assert('Rejected recipe preserves current state', await page.evaluate(() => loopStudio.getRecipe()), beforeInvalid);
  await page.locator('#preset-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await page.waitForFunction(() => document.getElementById('error-message').textContent !== 'Recipe seed must be between 0 and 4294967295.');
  assert('Malformed JSON preserves state', await page.evaluate(() => loopStudio.getRecipe()), beforeInvalid);

  await page.locator('#export-size').selectOption('1200'); await page.locator('#samples').selectOption('8');
  const pngDownload = page.waitForEvent('download'); await page.locator('#export-png').click();
  const stillFile = await pngDownload; await stillFile.saveAs(path.join(out, 'ui-export-1200.png'));
  await page.waitForFunction(() => !document.getElementById('export-png').disabled);
  const downloadedPng = await readFile(path.join(out, 'ui-export-1200.png'));
  const pngSize = [downloadedPng.readUInt32BE(16), downloadedPng.readUInt32BE(20)];
  assert('PNG output 1200 resolution', pngSize, [1200, 1200]);
  record('UI PNG successful status', (await page.locator('#status').textContent()).includes('1200 px still saved'), { filename: stillFile.suggestedFilename(), status: await page.locator('#status').textContent() });

  await page.locator('#guide-tab').click();
  record('Sources visible', await page.locator('#guide-view').isVisible());
  assert('Sources toggle pressed', await page.locator('#guide-tab').getAttribute('aria-pressed'), 'true');
  record('Studio hidden in Sources', !(await page.locator('#studio-view').isVisible()));
  await page.screenshot({ path: path.join(out, 'sources-desktop.png'), fullPage: true });
  await page.locator('#studio-tab').click();
  assert('Studio toggle pressed', await page.locator('#studio-tab').getAttribute('aria-pressed'), 'true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#play').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await twoFrames();
  assert('Dynamic reduced-motion change pauses', (await state()).playing, false);

  // Simulate the GPU interruption observed in the initial run, then recover it.
  const canLose = await page.evaluate(() => {
    const gl = document.getElementById('art-canvas').getContext('webgl2');
    window.__qaContextExtension = gl.getExtension('WEBGL_lose_context');
    return !!window.__qaContextExtension;
  });
  if (canLose) {
    await page.evaluate(() => window.__qaContextExtension.loseContext());
    await page.waitForFunction(() => document.getElementById('art-canvas').getContext('webgl2').isContextLost());
    await twoFrames();
    assert('Context loss pauses live animation', (await state()).playing, false);
    const lostStats = await page.evaluate(() => loopStudio.getStats());
    record('Diagnostics remain safe during context loss', lostStats.contextLost === true, { stats: lostStats });
    record('Context loss has visible notice', await page.locator('#canvas-error').isVisible(), { text: await page.locator('#canvas-error').textContent() });
    await page.evaluate(() => window.__qaContextExtension.restoreContext());
    await page.waitForFunction(() => !document.getElementById('art-canvas').getContext('webgl2').isContextLost() && document.getElementById('canvas-error').hidden, null, { timeout: 15000 });
    await twoFrames();
    record('Context restore resumes usable renderer', true, { stats: await page.evaluate(() => loopStudio.getStats()), status: await page.locator('#status').textContent() });
    await page.screenshot({ path: path.join(out, 'context-restored.png') });
    await page.locator('#play').click();
    const restoredPhase = (await state()).time;
    await page.waitForTimeout(200);
    record('Playback works after context restore', (await state()).time !== restoredPhase);
    await page.locator('#play').click();
  } else record('Context loss test available', false, { reason: 'WEBGL_lose_context is unavailable on this browser.' });

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 }); await twoFrames();
    const geometry = await page.evaluate(() => {
      const measure = selector => { const e = document.querySelector(selector), r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth }; };
      const overflow = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).map(e => ({ tag: e.tagName, id: e.id, class: e.className, text: e.textContent?.trim().slice(0, 60), right: e.getBoundingClientRect().right }));
      return { viewport: innerWidth, scroll: document.documentElement.scrollWidth, canvas: measure('#art-canvas'), studySelector: measure('#scene-select'), overflow };
    });
    record(`No horizontal overflow at ${width}`, geometry.scroll <= width, geometry);
    await page.screenshot({ path: path.join(out, `mobile-${width}.png`), fullPage: true });
    await page.locator('#scene-select').selectOption(sceneIds[2]);
    assert(`Mobile ${width} scene selection`, (await state()).scene, sceneIds[2]);
    await page.locator('#guide-tab').click();
    const guideWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    record(`Sources no overflow at ${width}`, guideWidth <= width, { width: guideWidth });
    await page.screenshot({ path: path.join(out, `sources-${width}.png`), fullPage: true });
    await page.locator('#studio-tab').click();
  }
  record('No uncaught browser exceptions', exceptions.length === 0, { exceptions });
} finally {
  await writeFile(path.join(out, 'browser-results.json'), JSON.stringify({ timestamp: new Date().toISOString(), skipCaptures, records, consoleErrors, networkErrors, exceptions }, null, 2));
  await browser.close();
}
if (records.some(record => !record.passed)) process.exitCode = 1;

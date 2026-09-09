#!/usr/bin/env node
/** Deterministic offline PNG / frame-sequence / movie export. */
import { createRequire } from 'node:module';
import { access, copyFile, cp, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { constants, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, projectRoot } from './serve.mjs';
import { SCENES as sceneDefinitions } from '../src/scenes.js';

const SCENES = sceneDefinitions.map(scene => scene.id);
const FORMATS = ['png', 'mp4', 'webm', 'frames'];
const VERSION = '2.1.1';
const COLOR_FILTER = 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p,setsar=1';
export const codecOptions = (format, crf) => format === 'mp4'
  ? ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf)]
  : ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1'];
const runtimeRoot = path.join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies');
const help = `Loop Atelier — deterministic publication exports

Usage: node scripts/render.mjs [options]

  --scene       ${SCENES.join(' | ')} (meridian)
  --format      png | mp4 | webm | frames (png)
  --output      Destination file or new frames directory (output/SCENE-SEED.FORMAT)
  --size        Square output size in pixels, 64–8192 (1920)
  --fps         Frames per second, 1–240 (30)
  --duration    Loop duration in seconds, 0.1–120 (scene default: 8–12)
  --samples     Temporal samples per frame, 1–64 (8)
  --shutter     Fraction of one frame exposed, 0–1 (0.65)
  --seed        Integer seed (42)
  --variation   Scene variation, 0–1 (0.5)
  --count       Override the scene's particle count, 100–1000000
  --palette     native | silver | amber | paper (scene default)
  --exposure    Exposure multiplier, 0.1–8 (1)
  --time        Normalized loop time for a still, 0–1 (0.15)
  --crf         Movie quality: integer 0–51 for MP4, 0–63 for WebM; lower is larger
  --software    Use Playwright's legacy headless shell for earlier raster behaviour
  --overwrite   Allow replacing a file and its manifest
  --help        Show this help

PNG and frame sequences are lossless. --crf is accepted only for MP4 and WebM.
MP4 defaults to H.264 CRF 16, except Hyperbolic's curated CRF 12; WebM defaults to 18.
Movies require FFmpeg. Set FFMPEG_PATH to choose its executable.
Full Chromium headless is preferred; headless shell is the launch fallback.
CHROMIUM_PATH overrides browser selection and cannot be combined with --software.
Run: npm install && npx playwright install chromium
`;

export function parseArgs(args) {
  const options = { scene: 'meridian', format: 'png', size: 1920, fps: 30, samples: 8,
    shutter: 0.65, seed: 42, variation: 0.5, exposure: 1, time: 0.15, overwrite: false, software: false };
  const valueFlags = new Set(['scene', 'format', 'output', 'size', 'fps', 'duration', 'samples', 'shutter', 'seed', 'variation', 'count', 'palette', 'exposure', 'time', 'crf']);
  const numeric = new Set(['size', 'fps', 'duration', 'samples', 'shutter', 'seed', 'variation', 'count', 'exposure', 'time', 'crf']);
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') return null;
    if (flag === '--overwrite') { options.overwrite = true; continue; }
    if (flag === '--software') { options.software = true; continue; }
    if (!flag.startsWith('--') || !valueFlags.has(flag.slice(2))) throw new Error(`Unknown argument: ${flag}. Use --help.`);
    const name = flag.slice(2);
    if (seen.has(name)) throw new Error(`Duplicate option: ${flag}`);
    seen.add(name);
    const value = args[++index];
    if (value === undefined || value.startsWith('--') || value.trim() === '') throw new Error(`Missing value for ${flag}.`);
    options[name] = numeric.has(name) ? Number(value) : value;
  }
  if (!SCENES.includes(options.scene)) throw new Error(`Scene must be one of: ${SCENES.join(', ')}.`);
  if (!FORMATS.includes(options.format)) throw new Error(`Format must be one of: ${FORMATS.join(', ')}.`);
  if (options.software && process.env.CHROMIUM_PATH) throw new Error('--software selects Playwright headless shell. Unset CHROMIUM_PATH or omit --software.');
  const scene = sceneDefinitions.find(scene => scene.id === options.scene);
  options.duration ??= scene.duration;
  options.palette ??= scene.palette||'silver';
  const movie = ['mp4', 'webm'].includes(options.format);
  if (!movie && seen.has('crf')) throw new Error('--crf is only supported for MP4 and WebM movies.');
  if (movie) options.crf ??= options.format === 'mp4' ? scene.movieCrf ?? 16 : 18;
  const bounds = { size: [64, 8192, true], fps: [1, 240, true], duration: [0.1, 120], samples: [1, 64, true],
    shutter: [0, 1], seed: [-2147483648, 4294967295, true], variation: [0, 1], count: [100, 1000000, true],
    exposure: [0.1, 8], time: [0, 1], ...(movie ? { crf: [0, options.format === 'mp4' ? 51 : 63, true] } : {}) };
  for (const [name, [min, max, integer]] of Object.entries(bounds)) {
    if (name === 'count' && options.count === undefined) continue;
    if (!Number.isFinite(options[name]) || options[name] < min || options[name] > max || (integer && !Number.isInteger(options[name]))) {
      throw new Error(`--${name} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}.`);
    }
  }
  if (!['silver', 'amber', 'paper','native'].includes(options.palette)) throw new Error('--palette must be native, silver, amber or paper.');
  if (['mp4', 'webm'].includes(options.format) && options.size % 2) throw new Error('MP4 and WebM require an even --size for yuv420p.');
  options.frameCount = options.format === 'png' ? 1 : Math.max(1, Math.round(options.fps * options.duration));
  options.output = path.resolve(options.output || path.join(projectRoot, 'output', `${options.scene}-${options.seed}${options.format === 'frames' ? '-frames' : `.${options.format}`}`));
  if (options.format !== 'frames' && path.extname(options.output).toLowerCase() !== `.${options.format}`) throw new Error(`--output must end in .${options.format}.`);
  return options;
}

function run(command, args, { timeout = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout = (stdout + chunk.toString()).slice(-65536); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-65536); });
    const timer = timeout ? setTimeout(() => { child.kill(); reject(new Error(`${command} timed out.`)); }, timeout) : null;
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${path.basename(command)} exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
      else resolve({ stdout, stderr });
    });
  });
}

async function findFFmpeg() {
  if (process.env.FFMPEG_PATH) {
    try { await run(process.env.FFMPEG_PATH, ['-version'], { timeout: 10000 }); return process.env.FFMPEG_PATH; }
    catch (error) { throw new Error(`FFMPEG_PATH is not usable: ${error.message}`); }
  }
  try { await run('ffmpeg', ['-version'], { timeout: 10000 }); return 'ffmpeg'; } catch {}
  const bundledPython = path.join(runtimeRoot, 'python', process.platform === 'win32' ? 'python.exe' : 'bin/python3');
  const pythonCandidates = [process.env.PYTHON_PATH, bundledPython, 'python', 'python3'].filter(Boolean);
  for (const python of [...new Set(pythonCandidates)]) {
    try {
      const { stdout } = await run(python, ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { timeout: 10000 });
      const candidate = stdout.trim();
      if (candidate) { await run(candidate, ['-version'], { timeout: 10000 }); return candidate; }
    } catch {}
  }
  throw new Error('FFmpeg was not found. Install FFmpeg and add it to PATH, set FFMPEG_PATH, or install imageio-ffmpeg in Python. You can export lossless PNGs with --format frames without FFmpeg.');
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  if (process.env.LOOP_STUDIO_PLAYWRIGHT_PATH) {
    try { return require(process.env.LOOP_STUDIO_PLAYWRIGHT_PATH); }
    catch (error) { throw new Error(`LOOP_STUDIO_PLAYWRIGHT_PATH is not usable: ${error.message}`); }
  }
  for (const candidate of ['playwright', path.join(runtimeRoot, 'node', 'node_modules', 'playwright')]) {
    try { return require(candidate); } catch {}
  }
  throw new Error('Playwright was not found. Run npm install, then npx playwright install chromium.');
}

async function launchBrowser(chromium, { software = false } = {}) {
  const configuration = { headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] };
  const launch = async (settings, headlessMode) => ({ browser: await chromium.launch(settings), headlessMode });
  if (process.env.CHROMIUM_PATH) {
    if (!existsSync(process.env.CHROMIUM_PATH)) throw new Error(`CHROMIUM_PATH does not exist: ${process.env.CHROMIUM_PATH}`);
    return launch({ ...configuration, executablePath: process.env.CHROMIUM_PATH }, 'custom-executable');
  }
  if (software) {
    try { return await launch(configuration, 'headless-shell'); }
    catch (error) { throw new Error(`Playwright headless shell could not launch. Install it with npx playwright install chromium --only-shell, or omit --software. ${error.message}`); }
  }
  // Playwright's full Chromium channel uses modern headless Chrome and can use
  // the installed GPU. The default headless shell commonly uses SwiftShader.
  try { return await launch({ ...configuration, channel: 'chromium' }, 'chromium-new-headless'); }
  catch { console.log('Full Chromium headless is unavailable; trying Playwright headless shell.'); }
  try { return await launch(configuration, 'headless-shell'); }
  catch (original) {
    // Also support a machine with a local Chrome/Edge but no downloaded Playwright browser.
    const candidates = process.platform === 'win32' ? [
      path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
    ] : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
    for (const executablePath of candidates.filter(existsSync)) {
      try { return await launch({ ...configuration, executablePath }, 'system-chromium-headless'); } catch {}
    }
    throw new Error(`Chromium could not launch. Run npx playwright install chromium, or set CHROMIUM_PATH. ${original.message}`);
  }
}

async function assertNewTarget(target, overwrite) {
  try { await access(target); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (!overwrite) throw new Error(`Output already exists: ${target}. Use --overwrite for files, or choose a new destination.`);
}

async function capture(page, parameters) {
  const dataURL = await page.evaluate(async params => window.loopStudio.capture(params), parameters);
  if (typeof dataURL !== 'string' || !dataURL.startsWith('data:image/png;base64,')) throw new Error('window.loopStudio.capture() must return a PNG data URL.');
  const buffer = Buffer.from(dataURL.slice('data:image/png;base64,'.length), 'base64');
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Capture did not produce a valid PNG.');
  if (buffer.readUInt32BE(16) !== parameters.size || buffer.readUInt32BE(20) !== parameters.size) throw new Error('Capture PNG dimensions do not match the requested size.');
  return buffer;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) { console.log(help); return; }
  const manifestPath = options.format === 'frames' ? path.join(options.output, 'manifest.json') : `${options.output}.manifest.json`;
  await assertNewTarget(options.output, options.format === 'frames' ? false : options.overwrite);
  if (options.format !== 'frames') await assertNewTarget(manifestPath, options.overwrite);
  const ffmpeg = ['mp4', 'webm'].includes(options.format) ? await findFFmpeg() : null;
  let ffmpegVersion;
  if (ffmpeg) {
    ffmpegVersion = (await run(ffmpeg, ['-version'], { timeout: 10000 })).stdout.split(/\r?\n/)[0];
    // Fail before rendering a long sequence if this FFmpeg lacks the required
    // codec or cannot perform the RGB → limited-range YCbCr matrix conversion.
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'lavfi',
      '-i', 'color=c=black:s=64x64:r=1,format=rgba', '-frames:v', '1', '-vf', COLOR_FILTER,
      ...codecOptions(options.format, options.crf), '-f', 'null', '-'], { timeout: 30000 });
  }
  const { chromium } = loadPlaywright();
  const started = Date.now();
  let browser; let server; let temporary;
  let outputTemporary;
  const browserErrors = [];
  try {
    await mkdir(path.dirname(options.output), { recursive: true });
    temporary = await mkdtemp(path.join(tmpdir(), 'loop-studio-render-'));
    server = await createServer({ root: projectRoot, port: 0 });
    const launched = await launchBrowser(chromium, options);
    browser = launched.browser;
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    // Observe context creation so metadata describes the detached export canvas,
    // not a guessed device or only the visible studio preview. No graphics state
    // is changed; the original context and options are returned untouched.
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      let context;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        const result = original.call(this, kind, ...args);
        if (kind === 'webgl2' && result) context = result;
        return result;
      };
      window.__loopAtelierExportGraphics = () => {
        if (!context || context.isContextLost()) throw new Error('Export graphics context is unavailable for manifest metadata.');
        const debug = context.getExtension('WEBGL_debug_renderer_info');
        return {
          graphicsRenderer: context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER),
          graphicsVendor: context.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : context.VENDOR),
          hdr: !!context.getExtension('EXT_color_buffer_float'),
        };
      };
    });
    page.on('pageerror', error => browserErrors.push(error.message));
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === origin || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort('blockedbyclient');
    });
    await page.goto(`${origin}/?export=1`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(() => window.loopStudio?.ready === true && typeof window.loopStudio.capture === 'function', null, { timeout: 60000 });
    const appMetadata = await page.evaluate(() => ({ version: window.loopStudio.version, defaults: window.loopStudio.defaults }));
    const params = { scene: options.scene, seed: options.seed, variation: options.variation, size: options.size,
      samples: options.samples, shutter: options.shutter, fps: options.fps, exposure: options.exposure, palette: options.palette,
      duration: options.format === 'png' ? options.duration : options.frameCount / options.fps };
    if (options.count !== undefined) params.count = options.count;
    console.log(`Rendering ${options.scene}: ${options.size} × ${options.size}, ${options.frameCount} frame${options.frameCount === 1 ? '' : 's'}, ${options.samples} temporal samples.`);
    let renderingEnvironment;
    let lastProgress = 0;
    for (let index = 0; index < options.frameCount; index++) {
      const time = options.format === 'png' ? options.time % 1 : index / options.frameCount;
      const png = await capture(page, { ...params, time });
      if (browserErrors.length) throw new Error(`Browser error: ${browserErrors.join('; ')}`);
      if (index === 0) {
        renderingEnvironment = { headlessMode: launched.headlessMode, ...await page.evaluate(() => window.__loopAtelierExportGraphics()) };
        console.log(`  Graphics: ${renderingEnvironment.headlessMode} · ${renderingEnvironment.graphicsRenderer}`);
      }
      await writeFile(path.join(temporary, `frame-${String(index).padStart(6, '0')}.png`), png, { flag: 'wx' });
      if (index === 0 || index === options.frameCount - 1 || Date.now() - lastProgress >= 2000) {
        const elapsed = (Date.now() - started) / 1000;
        const remaining = elapsed / (index + 1) * (options.frameCount - index - 1);
        console.log(`  ${index + 1}/${options.frameCount} (${Math.round((index + 1) / options.frameCount * 100)}%) · ${elapsed.toFixed(1)}s elapsed${remaining > 0 ? ` · ~${Math.ceil(remaining)}s remaining` : ''}`);
        lastProgress = Date.now();
      }
    }
    const manifest = {
      generator: 'Loop Atelier', exporterVersion: VERSION, createdAt: new Date().toISOString(),
      engineVersion: appMetadata.version, format: options.format,
      parameters: { ...params, count: params.count ?? appMetadata.defaults?.count,
        time: options.format === 'png' ? options.time % 1 : undefined },
      frameCount: options.frameCount, requestedDuration: options.format === 'png' ? undefined : options.duration,
      timing: options.format === 'png' ? 'still evaluated at parameters.time; duration sets shutter timing'
        : 'frame i is captured at normalized loop time i / frameCount; endpoint 1 is omitted',
      color: options.format === 'mp4' || options.format === 'webm'
        ? 'Display-referred sRGB artwork code values preserved; BT.709 YCbCr matrix, limited-range yuv420p and conventional BT.709 playback tags; no transfer-curve remapping'
        : 'browser canvas sRGB; lossless 8-bit RGBA PNG',
      browserVersion: browser.version(),
      renderingEnvironment,
      ffmpegVersion,
      encoding: options.format === 'mp4' ? { codec: 'libx264', crf: options.crf, preset: 'slow', pixelFormat: 'yuv420p' }
        : options.format === 'webm' ? { codec: 'libvpx-vp9', crf: options.crf, bitrate: 0, deadline: 'good', cpuUsed: 2, pixelFormat: 'yuv420p' } : { codec: 'png', lossless: true },
    };
    if (options.format === 'frames') {
      await writeFile(path.join(temporary, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
      // Copy is intentional: the system temp folder may be on another volume.
      await mkdir(options.output, { recursive: false });
      await cp(temporary, options.output, { recursive: true, errorOnExist: true, force: false });
    } else {
      outputTemporary = path.join(path.dirname(options.output), `.${path.basename(options.output)}.${process.pid}-${Date.now()}.partial.${options.format}`);
      if (options.format === 'png') await copyFile(path.join(temporary, 'frame-000000.png'), outputTemporary, constants.COPYFILE_EXCL);
      else {
        console.log(`Encoding ${options.format.toUpperCase()}…`);
        // The canvas is finished display-referred artwork. Preserve its RGB code
        // levels and convert only the matrix/range for SDR web delivery. The
        // conventional BT.709 playback tags are a compatibility choice, not a
        // claim that we performed a scene-referred sRGB → BT.709 transfer conversion.
        await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-n', '-framerate', String(options.fps),
          '-start_number', '0', '-i', path.join(temporary, 'frame-%06d.png'), '-frames:v', String(options.frameCount),
          '-an', '-vf', COLOR_FILTER, ...codecOptions(options.format, options.crf), ...(options.format === 'mp4' ? ['-movflags', '+faststart'] : []),
          '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
          '-color_range', 'tv', outputTemporary]);
      }
      if (options.overwrite) await rename(outputTemporary, options.output);
      else {
        // COPYFILE_EXCL also protects against another process creating the output
        // during a long render, after the initial existence check.
        await copyFile(outputTemporary, options.output, constants.COPYFILE_EXCL);
        await rm(outputTemporary);
      }
      outputTemporary = null;
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: options.overwrite ? 'w' : 'wx' });
    }
    console.log(`Saved ${options.output}\nManifest: ${manifestPath}\nCompleted in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    // Only remove paths generated by this process, never an existing user directory.
    if (temporary && path.dirname(temporary) === path.resolve(tmpdir()) && path.basename(temporary).startsWith('loop-studio-render-')) await rm(temporary, { recursive: true, force: true });
    if (outputTemporary) await rm(outputTemporary, { force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Export failed: ${error.message}`); process.exitCode = 1; });
}

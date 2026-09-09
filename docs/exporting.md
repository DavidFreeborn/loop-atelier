# Exporting artwork

The browser preview is for exploring compositions. The command-line renderer produces deterministic frames at the requested resolution, independent of display size, playback speed or dropped browser frames. It waits for each completed PNG before advancing. All browser requests are restricted to the local project server.

## Setup

The browser studio and its source tests use Node.js. Optional Python assembly, thumbnails and movie-inspection tools require `python -m pip install Pillow numpy imageio-ffmpeg`.

Use Node.js 20 or newer and install the project's dependencies:

```sh
npm install
npx playwright install chromium
npm start
```

The development server listens on `http://127.0.0.1:4173`. To select another port, run `node scripts/serve.mjs --port 4200`. It binds only to loopback, prevents traversal and symlink escapes, and does not serve hidden files or directory listings. Byte-range responses allow efficient seeking through locally hosted movies.

The export command starts its own server on an unused port and closes it afterward. No separate server is needed. It uses the installed Playwright package, with a fallback to the Codex bundled runtime. `CHROMIUM_PATH` can select a Chromium executable; `LOOP_STUDIO_PLAYWRIGHT_PATH` can select another installed Playwright package.

Exporter 2.1.0 prefers full Chromium in modern headless mode, using Playwright's `channel: 'chromium'`. This can use the installed graphics hardware while keeping browser windows hidden. If that browser fails to launch, the exporter tries Playwright's headless shell and then an available system Chrome or Edge. The full browser is installed by `npx playwright install chromium`. These are distinct executables and modes, as described in the [official Playwright browser documentation](https://playwright.dev/docs/browsers#chromium-new-headless-mode).

Use `--software` to select the earlier Playwright headless-shell route deliberately. It does not silently fall back to a different browser if the shell is unavailable; install it with `npx playwright install chromium --only-shell`. Headless shell used SwiftShader on the production machine, but the flag selects a browser mode rather than promising an identical GPU backend on every system. Preserve the manifest and PNGs for reproducibility. `CHROMIUM_PATH` retains priority as an explicit executable override; combining it with `--software` is rejected so browser selection is unambiguous.

A local 800 px Caustic benchmark with eight samples measured a complete PNG capture at 1,276 ms in SwiftShader headless shell and 40 ms in full Chromium using an RTX 4070 Laptop GPU, approximately 32 times faster. Both used installed Playwright 1.61.0 and Chromium 149.0.7827.55; the shader was compiled before timing, and publication rendering continued concurrently. RGB differences between the captures averaged 0.090/255, with a maximum of 4/255. This is one measured machine and workload, not a universal speed guarantee. The exact results are retained in `output/qa/export-headless-benchmark.json`.

Movie exports also need FFmpeg with the `libx264` and `libvpx-vp9` encoders and standard `scale`/`format` filters. The renderer looks for `FFMPEG_PATH`, `ffmpeg` on `PATH`, then the `imageio-ffmpeg` Python package. Set `PYTHON_PATH` to select a Python executable. Install `imageio-ffmpeg` with `python -m pip install imageio-ffmpeg` if appropriate for your environment. PNGs and PNG frame sequences do not need FFmpeg.

## Ready-to-use commands

```sh
# A lossless 1920 × 1920 still, including temporal antialiasing.
node scripts/render.mjs --scene meridian --output output/meridian-print.png

# A seamless four-second H.264 loop suitable for most platforms.
node scripts/render.mjs --scene bloom --format mp4 --size 1920 --fps 30 --duration 4 --samples 8 --output output/bloom-loop.mp4

# A six-second loop for the web.
node scripts/render.mjs --scene undertow --format webm --size 1080 --fps 30 --duration 6 --samples 8 --output output/undertow-loop.webm

# Lossless masters for a compositor, archive, or later encode.
node scripts/render.mjs --scene lattice --format frames --size 2160 --fps 60 --duration 4 --samples 16 --output output/lattice-master

# A different composition, at a chosen moment in the loop.
node scripts/render.mjs --scene ribbon --seed 817 --variation 0.72 --time 0.28 --size 2560 --samples 16 --output output/ribbon-817.png

# A new Collection 04 study, with its authored RGB palette.
node scripts/render.mjs --scene hyperbolic --size 2400 --samples 16 --output output/hyperbolic-print.png

# A 12-second Collection 04 loop; duration comes from its catalogue metadata.
node scripts/render.mjs --scene phason --format mp4 --size 1440 --fps 30 --samples 8 --output output/phason-loop.mp4

# Override movie quality explicitly; lower CRF increases quality and file size.
node scripts/render.mjs --scene hyperbolic --format mp4 --size 1440 --crf 12 --output output/hyperbolic-loop.mp4

# Deliberately use the earlier headless-shell rendering environment.
node scripts/render.mjs --scene caustic --software --size 800 --output output/caustic-software.png
```

Run `node scripts/render.mjs --help` for all 26 scene ids, parameters and bounds. The six Collection 04 additions are `surgery`, `laguerre`, `milnor`, `hyperbolic`, `phason` and `vortices`. All earlier studies remain supported. The palettes are `native`, `silver`, `amber` and `paper`; omitting the palette uses the study's authored default. Omit `--count` to preserve the particle studies' curated export density of 360,000 particles. RGB shader studies, including implicit 3D geometry, ignore particle count. `--exposure` multiplies the scene's curated exposure.

Exporter 2.1.1 adds `--crf`: an integer from 0–51 for H.264 MP4 or 0–63 for VP9 WebM. It is rejected for PNGs and frame sequences. Defaults remain 16 for MP4 and 18 for WebM, with one curated MP4 exception: Hyperbolic uses `movieCrf: 12` from its catalogue metadata to preserve fine colored tracery. An explicit value overrides that default, including zero. The manifest records the actual value under `encoding.crf`; publication validation checks the catalogue's exact expected CRF. Engine and recipe versions remain unchanged. Even the lowest CRF cannot undo the delivery format's matrix/range quantization or 4:2:0 chroma subsampling.

A bounded Hyperbolic diagnostic compared the exact 1,440-pixel source frame with Chromium-decoded H.264 at the start of a 60-frame original-motion segment. Red/green/blue mean absolute errors were 3.871/1.243/2.921 code values at CRF 12, versus 3.751/1.082/2.732 at CRF 8. CRF 8 used 45% more bytes in that segment. A repeated-frame, lossless H.264 diagnostic still measured red error 3.619/255 after the same 4:2:0 conversion, showing the remaining floor. CRF 12 is the practical delivery choice; this bounded comparison does not replace final movie validation. Evidence is under `output/qa/04/hyperbolic/` in `codec-diagnostic.json`, `moving-diagnostic.json` and `floor-diagnostic.json`.

Render only the latest collection with `node scripts/render-collection.mjs --new-only`. This flag selects the highest collection number in `SCENES`, which is **Collection 04** in version 2.1.0. Add `--stills-only` or `--movies-only` for one asset type; use `--overwrite` to deliberately regenerate existing files. `node tests/video-appearance.mjs --new-only` follows the same latest-collection rule; run it after the final movies exist. It compares all three RGB channels for these shader studies against exact source frames using their manifests.

The catalogue JSON generated alongside exports supplies the assembly and validation tools with exact ids and durations. Publication presets request 16 samples at 2,400 pixels for stills, and 8 samples at 1,440 pixels and 30 fps for movies. Shader exports combine centered temporal samples with independently permuted spatial pixel strata; particle exports retain their established temporal integration. These settings describe the production command, not a claim that a pending collection's assets have already passed validation. Collection 04's final evidence belongs in [validation-04.md](validation-04.md).

`--missing-only` resumes a collection by retaining files whose asset and manifest already exist. It does not assert that retained files match subsequently edited geometry: use it for interrupted production from the same frozen source, and use deliberate regeneration after changes. Run `node scripts/package.mjs` to refresh the offline studio and gallery. Packaging embeds source and styles and no longer embeds thumbnails; the one-selector studio does not depend on generated preview images. `python scripts/thumbnails.py` remains available for separate image assets and contact-sheet workflows.

The curated Descent preview uses 360,000 particles to keep its long outer contours continuous. Other live particle studies default to 180,000; particle publication presets use 360,000. A saved recipe preserves the selected count explicitly. Shader studies hide this inapplicable control in Studio and render at pixel resolution instead.

Existing files are protected. Add `--overwrite` to deliberately replace a movie or still and its manifest. Frame exports always require a new directory; existing directories are never deleted or replaced.

## Collection 04 proofs

The shared proof tool uses the studio's actual capture contract and starts its own local server. It defaults to the newest collection; pass study IDs to narrow the selection:

```sh
node scripts/proof.mjs --stills --size 800 --samples 4
node scripts/proof.mjs surgery milnor
```

After the publication movies exist, `python scripts/motion-review.py` decodes them into compact animated WebP proofs and a six-phase contact sheet under `output/qa/04/`. This inspects the encoded delivery, rather than rendering another version of the source.

Use the normal exporter for a proof that matches the studio's recipe-seed mapping and manifest contract:

```sh
node scripts/render.mjs --scene surgery --size 800 --samples 4 --time 0.15 --output output/surgery-proof.png
node scripts/render.mjs --scene vortices --format mp4 --size 480 --fps 10 --samples 2 --output output/vortices-proof.mp4
```

The development proof tools evaluate the shader sources directly and write several phases or PNG sequences. They deliberately overwrite their QA images, so preserve a candidate's folder separately before comparing revisions. They are visual development tools, not publication manifests; direct shader seeds can differ from the catalogue's recipe-seed mapping.

```sh
# Geometry: starts and closes its own local server; six phases per study.
node tests/proof-geometry-04.mjs --size=1000 --samples=4

# Geometry motion: 48 phases, excluding the repeated endpoint.
node tests/proof-geometry-04.mjs --motion --size=420 --samples=1

# Restrict a geometry proof to one study.
node tests/proof-geometry-04.mjs milnor --size=1000 --samples=4

# Mathematics: first run npm start in another terminal (port 4173).
# Six phases at 800 px / 4 samples; optional ids select a subset.
node tests/proof-mathematics-04.mjs hyperbolic phason vortices

# Mathematics motion: 120 phases at 480 px / 2 samples, 10 fps integration.
node tests/proof-mathematics-04.mjs --motion phason
```

Geometry proofs are written to `output/qa/04/geometry/{id}/`; mathematical proofs to `output/qa/04-mathematics/{id}/`. These tools request full Chromium headless; the geometry tool explicitly rejects a SwiftShader backend for its hardware-proof run. The general exporter retains its documented fallback and `--software` options.

The new contact sheet is `output/collection-04.png`. Review the moving constructions as well as that still summary. Phason uses the dual pentagrid's exact rhombus states, with optical crossfades during local flips; blended transition frames are not claimed to be exact tilings. Surgery crosses actual singular level sets. Milnor uses finite level bands and a spherical crop, so the complete trefoil and uncropped pages need not be visible. The [mathematical notes](mathematics-04.md) and [geometry notes](geometry-04.md) explain these distinctions.

## Timing and image quality

Each loop contains `round(fps × duration)` frames. Frame `i` is evaluated at normalized time `i / frameCount`; the duplicate endpoint is omitted. Without `--duration`, the renderer uses the scene's curated duration. The original six use 8–10 seconds, and all six Collection 04 additions use 12 seconds: 360 frames at 30 fps. Consult `output/catalog.json` for every study's duration. The manifest records the exact duration, which is `frameCount / fps`. Thus an arbitrary requested duration may be rounded by less than one frame. A still defaults to time `0.15`; select another phase with `--time`.

The renderer passes `fps`, `duration`, `samples` and `shutter` to the studio's capture function. The exposed interval is `shutter / (fps × duration)` of a normalized cycle. Temporal sampling belongs to the capture implementation, so preview controls and command-line output use the same sampling model. Start with 8 samples and a shutter of 0.65; use 16 samples for faster motion or larger masters. A zero shutter removes motion blur but retains shader spatial supersampling when more than one sample is requested. Very large dimensions, densities and sample counts multiply render cost; render a smaller proof before a full sequence. More samples do not raise a shader's internal intersection or iteration budget; inspect and test that numerical approximation separately.

PNG and frame-sequence outputs preserve the browser's lossless 8-bit sRGB raster. They are the archival masters. MP4 uses H.264, normally CRF 16, a slow encoding preset and fast-start metadata; Hyperbolic's curated MP4 default is CRF 12. WebM defaults to VP9 CRF 18, unconstrained variable bitrate and the good-quality encoder mode. `--crf` changes quality without changing the pixel format or color policy. Video compression and chroma subsampling are lossy; retain PNG masters for later grading or alternate encodes. Movie dimensions must be even.

The movies target the finished artwork's appearance in a browser. They preserve its encoded RGB levels and convert only the RGB-to-YCbCr matrix and full-to-limited range, using BT.709 coefficients and `yuv420p`. Conventional BT.709 playback tags provide standard SDR delivery metadata. This is an appearance-oriented delivery choice: it does **not** remap the artwork through an exact sRGB-to-BT.709 transfer conversion. The distinction matters because applying that transfer conversion darkened this already finished artwork in tested Chromium playback. FFmpeg documents matrix/range controls separately from the transfer-curve processing performed by its [scale](https://ffmpeg.org/ffmpeg-filters.html#scale) and [colorspace](https://ffmpeg.org/ffmpeg-filters.html#colorspace-1) filters.

A controlled 512 px Meridian proof, encoded with FFmpeg 7.1, compared the same PNG against the first decoded video frame in Chromium 151. Foreground meant pixels whose source luminance exceeded 20/255. The original transfer-remapping pipeline reduced foreground mean luminance from 110.980 to 97.789 on a 0–255 scale; the appearance-preserving pipeline measured 110.980. Foreground mean absolute error fell from 13.196 to 2.262 code values at H.264 CRF 16. These are measured browser results, not a guarantee for every player or managed display. Recheck final videos against exact source frames when changing the encoder, browser or delivery platform. Exporter 2.1.0 retains and records the color policy introduced in version 1.0.1.

The renderer writes a JSON manifest beside a still or movie, or inside a frames directory. It records the scene, seed, variation, resolution, exposure, palette, particle count, timing, temporal sampling, engine version, browser version, FFmpeg version and encoder settings. Exporter 2.1.0 also records `renderingEnvironment`: the chosen `headlessMode`, the export WebGL context's actual `graphicsRenderer` and `graphicsVendor`, and floating-point framebuffer support as `hdr`. The renderer and vendor use `WEBGL_debug_renderer_info` when available, with standard masked identifiers as a fallback. Keep this file with the artwork. Identical inputs are deterministic within the same rendering environment; browser and GPU differences can introduce small raster differences, so preserve final PNGs as well as parameters.

## Preparing a public release

After producing and verifying the publication assets, run `python scripts/assemble.py`, followed by `python scripts/release.py`. The second command writes the public toolkit ZIP, standalone HTML and `SHA256SUMS` under `.publish/release/`. It replaces authoring-machine paths in textual diagnostics with portable labels, regenerates checksums, checks ZIP integrity and verifies that publication media and manifests are unchanged. Original local QA remains intact. Git excludes working renders and large media; distribute the full assets through a versioned GitHub release.

## Browser integration contract

The renderer visits the project root with `?export=1`, waits for `window.loopStudio.ready === true`, then calls:

```js
await window.loopStudio.capture({
  scene: 'meridian',
  seed: 42,
  variation: 0.5,
  size: 1920,
  time: 0.15,
  samples: 8,
  shutter: 0.65,
  fps: 30,
  duration: 8,
  exposure: 1,
  palette: 'silver',
  // count: 360000, // omitted unless explicitly supplied
});
```

`capture()` may return a PNG data URL directly or return a promise of one. It must render exactly `size × size` pixels, honor normalized loop time without advancing persistent state, and implement the requested temporal integration. `window.loopStudio.version` and `window.loopStudio.defaults.count` provide manifest metadata. Renderer validation rejects non-PNG results, incorrect dimensions and uncaught browser errors. The app suppresses playback and unnecessary preview work when `export=1` is present.

The HTTP server is separately reusable:

```js
import { createServer } from './scripts/serve.mjs';
const server = await createServer({ port: 0 });
console.log(server.address().port);
server.close();
```

Render failures produce a nonzero exit code and a readable error. Temporary files created by the renderer are cleaned up; an existing user directory is never recursively removed. A partially copied frame directory can remain if disk space runs out, allowing manual inspection.

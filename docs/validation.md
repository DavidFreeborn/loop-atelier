# Verification and production record

Reviewed on 9 September 2026. This report records observed results and separates mathematical checks, browser behavior, visual judgement, and encoded-media checks.

**Collection 02:** the eight-study expansion and the latest complete-collection checks are recorded in [validation-02.md](validation-02.md). The report below preserves the production evidence for the original six-study edition.

## Automated geometry and server checks

`npm test` passed **34 tests**. The six studies were checked for seeded reproducibility, independence from render order, reuse of their particle buffers, exact endpoint equality, finite-difference velocity agreement across the loop seam, and ordinary-sized last-to-first transitions. Endpoint equality was not treated as sufficient evidence by itself.

Each study also passed a projected-framing check at 48 phases and three deformation settings. Sampled particles remained finite, intensities stayed within the declared range, and the projected form stayed inside the 95% bounds of the raster. Tests use representative seeds and finite samples; they are not an exhaustive proof over every floating-point parameter.

The primitive tests cover circular-noise inputs, smooth harmonic loops, periodic pulses, closed-path position and tangent continuity, and replacement queues. The replacement example is tested by comparing **complete particle attributes under index permutation**, which is the appropriate seam test for objects that exchange places.

The local server tests cover index/module serving, MIME types, HEAD, byte ranges, invalid ranges, hidden files, encoded traversal, symlink escapes, unsupported write methods, and loopback-only binding.

## Browser verification

The independent browser review passed **56 interface and recovery checks**, followed by a targeted check of diagnostics during a lost graphics context. Evidence and the exact environment are in [browser-qa.md](browser-qa.md).

Verified behaviors include all six scene selections, play/pause, keyboard scrubbing, parameter controls, seed validation, all three palettes, reset, exact recipe round-trip, invalid-recipe rejection, a real 1,200-pixel PNG download, field-guide navigation, initial and changed reduced-motion preferences, and forced WebGL context recovery. There were zero uncaught exceptions and zero failed network requests in the successful retest.

Desktop, 390-pixel, and 320-pixel layouts were visually inspected. The narrowest view initially overflowed; a two-column study list resolved it. Playback labels and navigation states were corrected. Context loss now pauses the artwork, displays a recovery message, rebuilds resources, and leaves playback under user control after restoration. Diagnostics remain safe while the live renderer is unavailable.

`tests/package-check.mjs` separately verifies the final self-contained studio, the sandboxed conversation sampler, and playback in the native movie gallery. Its machine-readable results are in `output/qa/package-qa.json`.

## Visual iteration

The source study was followed by actual GPU renders at several phases. Revisions were made in response to the images:

- Increased default live sampling to 180,000 points and publication sampling to 360,000. This makes filaments substantially more continuous than the initial 50,000–90,000-point proofs.
- Elevated Bloom's camera to reveal the fivefold structure; the earlier view read as an undifferentiated vessel.
- Deepened Undertow's throat and increased its obliquity so the surface reads as a funnel with a visible interior.
- Increased the independence of Orbit's planes so its sparse bands visibly intersect.
- Preserved Meridian's central void, Lattice's exact scaffold, and Ribbon's finite textile-like edges.

The compositor uses small point coverage, depth attenuation, and additive radiance. It deliberately has no bloom layer. Highlights arise from density and projection. This follows our interpretation of the source imagery while keeping the compositions and implementation independent.

The final motion contact sheet is `output/qa/motion-contact.png`. It contains four decoded phases of each delivered movie. The still collection is `output/collection.png`. A contact sheet assesses the sequence's composition; continuous playback and adjacent-frame analysis assess its motion.

## Publication outputs and media checks

The collection uses 360,000 particles per frame and a shutter fraction of 0.65. Stills use 16 temporal samples at 2,400 × 2,400 pixels. Movies use 8 samples at 1,440 × 1,440 pixels and 30 frames per second. Each movie contains exactly one cycle, with no duplicated endpoint:

| Study | Duration | Frames |
|---|---:|---:|
| Meridian | 8 s | 240 |
| Bloom | 8 s | 240 |
| Undertow | 9 s | 270 |
| Lattice | 8 s | 240 |
| Ribbon | 10 s | 300 |
| Orbit | 10 s | 300 |

`scripts/verify-collection.py` independently decodes the finished files. It checks PNG integrity, opaque alpha, dimensions, nonblank histograms, exposure statistics, movie dimensions, frame rates, frame counts, durations, color metadata, and agreement with the per-file manifests. It also compares the last-to-first frame difference with ordinary adjacent differences in the decoded movies. The authoritative results are in `output/validation-assets.json`.

The final run passed **all 12 assets**, with zero failures and zero review notes. The last-to-first difference divided by the median ordinary adjacent-frame difference ranged from **0.953 to 1.250** across the six movies. The source-to-browser appearance comparison passed for every movie: foreground mean absolute error was **1.625–2.396 / 255**, and average foreground brightness differed by less than one code value in each case. The higher errors at individual edges are expected from lossy compression; these are measured tolerances, not a claim of lossless video.

The movie exporter was additionally smoke-tested for MP4, WebM, PNG, and lossless frame sequences. Both movie codecs decoded correctly. Existing-output protection was tested. The final edition delivers MP4 for broad playback support; WebM and frame-sequence production remain available through the toolkit.

A direct source-to-player comparison caught a late color issue that structural validation did not detect: applying an sRGB-to-BT.709 transfer remapping made the browser movie darker than the source artwork. Exporter 1.0.1 preserves the display-referred RGB code values while converting the matrix and range to limited-range YUV. A controlled 512-pixel proof reduced foreground error from 13.196 to 2.262 on an 8-bit scale, consistent with codec loss. The movie masters were then regenerated from the source geometry, avoiding a second lossy encoding of the earlier files. `tests/video-appearance.mjs` compares all six final movies against their exact source frames in Chromium; results are in `output/qa/video-appearance.json`.

Shutter convergence was checked by comparing 8 and 16 samples at a high-motion phase selected for each study from 32 candidates. At 900 pixels and 360,000 particles, the mean absolute difference was 0.013–0.224 on an 8-bit channel scale; 99% of channel differences were no more than 1–3 levels. These checks support the 8-sample movie setting for this collection. Raw comparisons are in `output/qa/sampling-quality.json`; faster or more complex future studies need their own sampling check.

## Performance observations

At 180,000 particles, median CPU geometry-update times were **1.8–3.1 ms** across the six studies on this Windows machine under Node 24.12.0. This benchmark was taken while offline rendering was also running and is not an isolated hardware maximum. Its 95th-percentile values were approximately 3.4–6.3 ms. Raw results are in `output/qa/geometry-performance.json`.

These timings exclude GPU rasterization, readback, PNG encoding, browser scheduling, and display refresh. They therefore do **not** establish a universal 60 fps claim. The source caches spatial harmonics, reuses typed arrays and GPU buffers, bounds live resolution, and suspends updates for hidden pages. The export path samples exact phases and waits for each completed frame; slow rendering changes production time, not movie timing.

## Practical limits

- WebGL 2 is required for the interactive studio. Publication capture additionally requires `EXT_color_buffer_float`. The exported PNGs and MP4s can be viewed without the particle renderer.
- The final PNG raster is lossless **8-bit sRGB**. The internal accumulation buffer has higher precision; this is not a 16-bit archival raster or a color-managed print proof.
- MP4 and WebM are compressed delivery formats. The exporter preserves display-referred appearance, converts RGB to limited-range YUV with the BT.709 matrix, and uses conventional BT.709 tags. It deliberately does not remap the transfer curve. This is a browser-tested artwork-delivery choice, not a scene-linear mastering transform. Player behavior and platform recompression can still affect presentation.
- A media player can introduce a pause at repetition despite continuous underlying geometry. The live studio evaluates the cycle directly.
- Geometry is deterministic. Pixel-identical output is expected within the tested rendering environment, but not promised across all browsers and GPUs.
- Mobile testing covers responsive layout in desktop Chromium, not battery use or sustained performance on physical phones. Lower the particle count on constrained devices.
- The six studies explore a filament-based subset of the researched visual vocabulary. The supplied primitives support extension, but this is not a complete implementation of Jacob’s practice, a physical light simulator, or a general solid-geometry engine.

Source references, attribution distinctions, and the documented research basis are in [research.md](research.md). The delivery archive includes checksums of the source and completed assets so the exact reviewed edition can be preserved.

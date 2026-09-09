# Collection 02 — validation and refinement

This is the historical Collection 02 report. See [Collection 03 validation](validation-03.md) for the latest edition.

Reviewed on 9 September 2026. This extension adds eight original studies to the six-study toolkit. The source scene modules, metadata, publication settings, and stills were frozen before movie production. All geometry uses the existing renderer; the rendering engine and the established video colour pipeline are unchanged.

## Mathematics and geometry

The final `npm test` run passed **74 tests**, with no failures. One inapplicable raw-coordinate test is explicitly skipped for Descent and replaced by seven dedicated checks of its gallery permutation, visible positions, radiance, and seam derivatives. The complete suite includes the original primitives and server checks.

Every scene passes seeded repeatability, buffer reuse, arbitrary-order evaluation, finite coordinates, normalized nonnegative intensity, and projected framing across 48 sampled phases and three deformation settings. These are finite sampling checks rather than an exhaustive proof over all seeds and floating-point values.

New tests verify that the two degree-three harmonic modes are orthogonal with equal sphere-average energy; their homogeneous extensions are harmonic polynomials. The square membrane modes share eigenvalue 29π² and satisfy the stated Neumann boundaries. The sampled gyroid has a small measured residual relative to its trigonometric scaffold, and its area sampling retains cyclic symmetry. The nodal approximation and the displaced artwork are explicitly distinguished from an exact minimal surface.

The seam test uses independent second-order one-sided derivative estimates at step 0.00005. A first-order estimate falsely flagged Resonance's narrow, smoothly moving intensity bands because of their large temporal curvature. The threshold was retained at 0.02, and a separate convergence test demonstrates that the one-sided discrepancy shrinks as the step decreases. Endpoint equality alone was not accepted as evidence.

Hopf's added tests infer circles from output positions, verifying planarity, constant radius, and uniform chord spacing through the four-dimensional transformation. An additional numerical art-direction check found linking-number magnitudes approximately 1.00010 for all 153 representative band pairs at two phases, using 256 samples per circle. The exact topological claim follows from the Hopf construction; the numerical integral is supporting evidence, not a replacement for it.

Descent was checked at 4,096, 4,099, 60,000, 60,003, 180,000, and 360,000 particles, including counts not divisible by eight. Visible coordinates and emitted-light derivatives match after the documented gallery permutation. The recycled gallery is completely dark around its reset; unused remainder particles remain stationary and black.

## Visual refinement

Every new study was inspected at three phases using 1,000-pixel proofs with 360,000 particles and eight shutter samples. The accepted revision includes:

- A genuine SU(2) transformation for Hopf, followed by exact uniform arc-length circle sampling. This removes the stretched, dotted outer arcs produced by directly sampling the stereographic parameter and makes the live preview smoother.
- A stronger periodic rocking view for Trefoil that exposes the over/under crossings while retaining the travelling weave.
- A large open aperture and a legible intersecting wall for Klein.
- Slightly broader point coverage and stronger light for Gyroid's porous scaffold.
- An undulating saddle presentation of Resonance's nodal interference, with normalized particle intensity and compensating exposure.
- An axisymmetric partner mode, thirteen radial layers, centre suppression, stronger oblique movement, and a larger final scale for Harmonic.
- Wider twisted bevels and twelve travelling pleats for Descent.
- A denser 360,000-particle live preview for Descent, whose eight repeated galleries otherwise undersample the long outer arcs. The other studies retain the standard 180,000-particle preview. Publication density stays at 360,000 for all studies.
- Three broader ruled ribbons for Confluence, retaining separated strands and two clear scrolls.

Final 2,400-pixel stills were inspected individually or together in `output/collection-02.png`. Thumbnails are Lanczos reductions of the final stills. The contact sheet keeps the same artwork framing as the publication assets.

## Temporal sampling

All fourteen studies were compared at eight and sixteen centred shutter samples. Candidate phases were selected from 32 evenly spaced samples using visible geometry and intensity displacement; dark recycling coordinates contribute no motion score.

For the eight new studies, mean raster differences were **0.049–0.232 on the 0–255 scale**, with 99th-percentile differences of 1–4. No meaningful doubled contours or shutter streaks were observed in the reviewed proofs. Granular texture that persists at sixteen samples comes from spatial point sampling. These comparisons support the chosen eight-sample movie setting, but are not a formal bound over every phase or parameter value.

The final movies use 1,440 × 1,440 pixels, 30 fps, 360,000 particles, eight shutter samples, a 0.65-frame shutter, H.264 CRF 16, and the existing browser-tested matrix/range conversion. The stills use 2,400 × 2,400 pixels and sixteen samples. Each file records its exact recipe and encoding environment in a JSON manifest.

## Studio and packaging

The expanded interface passed **88 browser checks**, with no failures, uncaught exceptions, or failed network requests. These include fourteen scene selections and captures, playback, scrubbing, parameter controls, recipes, invalid-input rejection, PNG download, reduced-motion changes, graphics-context recovery, and narrow layouts.

An independent edition audit passed **12 checks** across source and self-contained files. It verified the eight new builders, collection visibility and pressed states, complete recipe round-trips across collections, working thumbnails, and layouts from 320 to 1,280 pixels. The self-contained studio made no HTTP requests. Each added source module is wrapped in a private scope in the offline bundle.

The final inline sampler passed seven targeted checks, including all fourteen distinct nonblank renders, phase and playback controls, reduced motion, and 320/760-pixel layouts. It also worked with the host wrapper's optional CDN helpers disabled. The complete package check passed all four groups: opening the self-contained studio from disk, using the sandboxed sampler, loading and playing all fourteen native-gallery videos from disk, and running the independent replacement authoring example. No browser errors were recorded.

After the Descent preview improvement, a targeted check verified that source and offline selection/reset use 360,000 particles, explicitly saved 180,000-particle recipes still reload their original count, and the inline GPU buffer contains the intended 360,000 particles. The revised 760-pixel preview has more continuous outer contours; a single live sample still retains some point-raster texture compared with the publication movie.

## Performance and practical limits

At 180,000 particles, the measured median geometry-update times for the new studies were about 0.9–2.3 ms, except Confluence at 13.4 ms. Measurements used Node 24.12 on this Windows machine during production; they exclude GPU work, browser controls, and temporal supersampling and must not be interpreted as playback frame rates. Confluence evaluates six nonlinear sine shears per particle and is the most expensive new study. The lower particle setting is available for slower devices.

The renderer accumulates projected light and does not compute opaque occlusion, physical scattering, or material contact. WebGL 2 is required for live playback, and floating-point framebuffer support is required for final capture. Offline MP4 files supply a playback alternative. Media players can introduce their own pause at a loop boundary even when the underlying frame sequence is correct.

## Final asset checks

**All 28 final assets passed**, with zero failures and zero review notes. Every movie was fully decoded and checked for dimensions, frame count, duration, codec, colour metadata, and manifest consistency. The stills passed full raster decoding, opacity, dimensions, foreground coverage, and highlight checks. Final evidence is in `output/validation-assets.json`.

| New study | Duration | Frames | Last-to-first / median adjacent change | Browser video/source difference |
|---|---:|---:|---:|---:|
| Hopf | 10 s | 300 | 0.933 | 1.955 / 255 |
| Trefoil | 9 s | 270 | 1.479 | 1.880 / 255 |
| Klein | 10 s | 300 | 1.172 | 2.196 / 255 |
| Gyroid | 10 s | 300 | 1.411 | 1.813 / 255 |
| Resonance | 12 s | 360 | 1.193 | 2.335 / 255 |
| Harmonic | 12 s | 360 | 1.434 | 2.283 / 255 |
| Descent | 8 s | 240 | 0.891 | 1.760 / 255 |
| Confluence | 10 s | 300 | 0.775 | 1.601 / 255 |

The continuity ratio compares the last-to-first decoded frame change with ordinary adjacent frames; values need not equal one because motion speed changes around a loop. The mathematical seam checks independently verify smooth closure. The last column is the mean absolute foreground red-channel difference between movie frame zero as displayed by Chromium and its exact source frame. All fourteen movies passed the established threshold of 4/255, including the unchanged original six. The original source PNG and the lossy video are not claimed to be pixel-identical.

The final contact sheet provides four decoded phases per movie. Partial reports from intermediate production remain explicitly named `.available` and are excluded from the delivery archive. The final archive includes full source, documentation, recipes/schema, stills, movies, offline players, selected QA evidence, and SHA-256 checksums.

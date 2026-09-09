# Collection 03 — validation and production report

This edition adds Palimpsest, Switchboard, Section, Inversion, Monodromy and Caustic to the fourteen existing works. It also adds an RGB pixel-shader path to LoopRenderer 2.0.0. The older particle path keeps its original transfer function and sampling behaviour.

## Artistic revisions

The initial wavefront prototype was rejected as a blurred diamond between two light fans. Increasing optical frequency exposed fringes but did not solve the composition. The final work instead pulls coherent diffraction through a changing cubic control map, creating a sixfold braid with deep cancellation channels. Its intensity gain was reduced to preserve central fringe colour.

The first opaque studies looked like model renders against an abruptly clipped bright floor. The floor now continues into a dark, fogged setting, with more deliberate material separation. Wider framing preserves the plinths and the large inversion arch throughout the sampled cycle. Rays begin at a conservative bounding box to avoid wasting tracing steps in empty space.

Switchboard originally showed arbitrarily clipped arc fragments during quarter-turns. Contacts now retract into round rotors and reconnect when each movement locks. Palimpsest uses a full-frame architectural print, exact scale replacement, and sparse vermilion thresholds.

Motion review identified an abrupt colour sweep in Monodromy near phase .51. A root passed close to the palette's angular origin. Replacing the angle with a smoothly regularized direction removed that singularity; a separate cutoff suppresses numerical residual noise after Newton convergence.

## Mathematics and actual shader evaluation

`npm test` passed **84 tests**, with no failures and one explicitly documented skip. The skipped raw pointwise Descent seam is covered by its separate permutation-aligned tests. The suite includes the actual GLSL for the new patterns and complex fields, tested with unwrapped time so public phase wrapping cannot conceal a broken mathematical period.

- Pattern studies: five phases × three variations × two seeds per work, plus finite nonnegative radiance and replay checks. Largest raw period differences were below .001/255.
- Complex fields: 30 combinations per work; largest raw period image differences were .008874/255 for Monodromy and .000251/255 for Caustic. Fractal boundaries can magnify Float32 rounding at individual pixels.
- Space studies: 120 phase/seed/variation configurations in total, with no nonfinite or negative radiance. Fifteen endpoint pairs per artwork matched exactly. An independent exact sphere-distance comparison checked the conservative inversion bound in 1,620 cases.
- Diffraction: 256-node midpoint integration agreed with a 512-node Gauss–Legendre reference to less than 7.5×10⁻⁷ complex-amplitude error across 51,984 controls. This checks the finite-aperture integral, not a physical optical experiment.
- Spatial sampling: every supported sample count, 1–64, has centred strata in both pixel directions. Independent permutations separate pixel sampling from shutter time; this fixes the initial correlated shutter/pixel pattern and the biased non-power-of-two pattern.

The 3D tracing budget is finite. Against a 160-step diagnostic reference, the final 80-step images differed at isolated grazing rays: the worst sampled significant-pixel fraction was .23% for Section and .07% for Inversion. These limits are documented rather than represented as an exact path-traced solution.

A final exact optimization reduces Section's six rounded-box evaluations per field query to two. Across 36 shader configurations, 2,359,296 tested linear-float pixels were bit-identical to the original implementation; 300,729 algebraic cases covered distances and material choices. The measured 256-pixel render median improved from 21.68 to 15.85 ms (about 27% less time). This is a comparative benchmark on the test device, not a universal frame-rate claim. A regression test covers the equivalence.

## Interface and packaging

The main browser suite passed **106 checks**, with no uncaught exceptions or failed network requests. It exercises all twenty studies, scene controls, repeatable capture, recipes, invalid input, playback, reduced motion, context recovery, and narrow layouts.

Source and offline edition checks passed all **12 groups**. The long new study names exposed a 390-pixel overflow; the selector now stays in two columns through 420 pixels. Checked widths: 320, 360, 380, 390, 414, 620, 760, 900 and 1280 pixels. Shader studies hide the inapplicable particle-count control and restore their native palettes; older recipes retain their settings.

The sandboxed inline sampler also passed all twenty distinct-scene renders, playback and phase controls, reduced-motion startup, and 320/760-pixel layouts, with no script errors. These checks disabled the wrapper's optional remote helpers; the sampler itself has no network dependencies.

Live shader previews cap resolution to manage GPU load. The final images and movies use their requested output resolution independently. Concurrent publication renders can reduce preview frame rates, and GPU context interruption was observed during heavy independent QA; automatic recovery worked. Live performance is device-dependent, so this report does not claim universal 30 or 60 fps playback.

A separate cold-start diagnostic isolated startup from publication rendering. Full Chromium on the RTX 4070 had no context losses across three source and three offline starts. Legacy headless shell on SwiftShader lost its initial context once per start and recovered automatically; source rendering became usable at about 1.2 seconds. The diagnostic waits for a stable usable context, reads actual nonblank framebuffer pixels, changes phase and verifies the image changes, then restores the paused default state. This is distinct from the API's `ready` flag, which is established before the first draw. The original early-sampling failure is preserved in `output/qa/03/cold-start-original-failure.json`; detailed startup and recovery events remain visible in `output/qa/03/cold-start.json`.

## Publication assets

The complete collection passed publication validation: **40 assets passed, zero failed**, including full decoding of every movie, exact frame counts, dimensions, durations, colour metadata and manifests. Results are recorded in `output/validation-assets.json`. All six new movie-to-source RGB checks passed; the largest per-channel mean absolute difference was 2.736/255 (Monodromy blue), below the 4/255 inspection threshold. Those checks compare each movie's first decoded frame with a fresh source render using its exact manifest recipe; they are recorded in `output/qa/video-appearance.new.json`.

Final package checks passed all four groups: the studio opens directly from disk, the sandboxed sampler works, all twenty gallery movies load with native playback, and the authoring example plays and scrubs at desktop and 320-pixel widths. No uncaught script errors were recorded. File checksums and the toolkit archive are generated after these asset checks.

The matte-relative border heuristic raises six composition notices. They were visually reviewed: patterns and continuous fields intentionally continue beyond the image, and the 3D scenes' floors and background gradients reach the border. The sculptures and plinths were checked separately for framing. These notices remain visible in the machine report; `output/qa/03/composition-review.json` records their resolution.

Each new work has a lossless 2,400 × 2,400 PNG at phase .15, with 16 spatial/temporal samples, and a 1,440 × 1,440 MP4 with 8 samples at 30 fps. All six new loops run for 12 seconds and omit a duplicate endpoint. Colour is encoded using the established display-referred BT.709 matrix policy, preserving the source's sRGB code-value appearance in ordinary browser playback.

Exporter 2.1.0 now prefers full Chromium headless, with a headless-shell launch fallback and an explicit `--software` option. On this device, the full browser used the RTX 4070 while the shell used SwiftShader. An 800-pixel, eight-sample Caustic capture measured 1,276 ms versus 40 ms; the compared RGB images differed by .0898/255 mean absolute error and at most 4/255. This single-frame comparison ran while another export was active, so it establishes the backend improvement rather than an idle-machine throughput guarantee. The final 360-frame Caustic master rendered and encoded in 42.6 seconds. Its manifest records the actual GPU and HDR support. The other Collection 03 masters were completed with the earlier software-rendered exporter; all were checked against the final source. Section's exact optimization is pixel-identical to its earlier master shader.

The main session resolved Playwright 1.61.0 from an ancestor installation and used Chromium 149.0.7827.55. The project declares and locks Playwright 1.62.1; an additional explicit-runtime smoke export succeeded with that version, Chromium 151.0.7922.34, and the RTX 4070. Nine bounded exporter checks passed for launch fallbacks, explicit overrides, existing-output protection and failure cleanup. The audit corrected explicit Playwright-package override priority and Windows temporary-root normalization. The rendering environment and browser version must be retained when reproducing exact pixels; browser and GPU changes can introduce small raster differences.

The artwork is original. The mathematical explanations distinguish canonical structures from finite approximations and artistic coordinate maps. These are independent studies informed by published looping techniques, not works by or endorsements from Étienne Jacob.

# Loop atelier 2.1.0 — verification record

The studio now presents one title, one alphabetical selector containing all 26 studies, essential controls, and the selected mathematical construction and equation. Sources replaces the field guide with a short explanation and eight primary references. Routine announcements remain available to assistive technology; actionable errors are visible. Collection numbers remain production metadata and are absent from the studio and movie gallery.

## Composition and revision

Six new studies were developed through multiple phases and complete motion proofs. Surgery's smooth cubic-sine schedule spends more of the cycle in its connected five-handle regime while preserving the actual splitting and sealing events. Laguerre uses an oblique cutaway, exact face normals and analytic shadow exits from convex power cells; these remove false bright junctions caused by grazing finite marches. Milnor's elevated side view reveals the curl and opening of its pages. Conservative point-light visibility replaced a soft-shadow heuristic that produced false surface ripples.

Hyperbolic's heptagrams and inset boundaries expose the disk's hierarchy. Phason's preliminary Fourier contours were rejected in favour of actual dual-pentagrid rhombi. Its final local flip windows are brief optical crossfades of fixed tile states, normalized to prevent brightness pumping. Vortices uses six signed phase defects, a saddle carrier, and analytic phase-gradient widths to keep the nodal connections legible.

## Mathematical evidence

The complete Node suite passes **107 tests with zero failures and one intentional skip**. The skipped pointwise Descent seam is inapplicable to its replacement permutation and is covered by separate permutation-equivalence checks. Seven new geometry tests and eleven new field tests exercise independent mathematical properties, rather than merely mirroring displayed formulas. Five exporter tests cover codec defaults, overrides, boundaries and rejection of invalid quality options.

- Surgery: critical levels, Morse indices and independently meshed closed-manifold Euler characteristics verify the four regular-level topology regimes.
- Laguerre: normalized power bisectors and convex chamber ray exits are independently checked. A 2,048-step shadow reference differs at one tangent-threshold pixel in each of two sampled phases; the other four agree exactly. Largest mean linear difference: .0000303.
- Milnor: stereographic points lie on the unit three-sphere, and sampled binding points satisfy the polynomial trefoil equation. Deeper primary and shadow references agree at the sampled phases.
- Hyperbolic: the actual fundamental triangle has reflection orders (7,2,3). Three neighbouring heptagons cover an independently sampled vertex ring exactly once, with 240 samples per neighbour. A 36,000-point visible-disk audit terminates within 11 circle reflections, below the 36-reflection budget.
- Phason: five-grid orthogonality, unit rhombus edges, 36°/72° acute angles, golden area ratio, and 1,100 sampled hard-acceptance coverage cases pass. The bounded intersection search matches a four-times-wider reference.
- Vortices: prescribed positions and velocities close at the seam; measured winding numbers verify three charge +3 and three charge −3 defects.

The raw geometry audit bypasses both phase wrapping and radiance clamping: 108 seed/variation configurations produce finite nonnegative radiance, and tested binary-exact phases agree exactly at t and t+1. The field audit also uses unwrapped negative and greater-than-one phases. Its largest image-period mean errors are .010638/255, .000062/255 and .001139/255 for Hyperbolic, Phason and Vortices. Float32 calculations at boundaries can change isolated pixels.

The common image-contract check passes all six studies: exact repeated capture, exact public endpoint wrapping, visible seed and deformation effects, substantial structural motion, and seam steps consistent with neighbouring motion. At a deliberately small 256-pixel proof size, 8-versus-16-sample mean RGB differences range from .114 to 2.758/255; the dense hyperbolic boundary accounts for the largest value. This is a sampling comparison, not a claim that finite sampling is exact.

Detailed derivations and numerical limits are in [geometry-04.md](geometry-04.md) and [mathematics-04.md](mathematics-04.md). Machine evidence is under `output/qa/04/` and `output/qa/04-mathematics/`.

## Interface and delivery checks

The main browser suite passes **124 checks** for all 26 studies, including playback, scrubbing, controls, recipe round trips, invalid inputs, repeatable PNG capture, keyboard access, reduced motion, narrow layouts and forced graphics-context recovery. No uncaught exceptions or failed requests occur. Two expected console errors come from deliberately rejected malformed recipes.

The final source and standalone cleanup suite passes **12 groups**, including all study selections and eight bibliography entries. Layout widths checked are 320, 360, 390, 414, 620, 700, 701, 760, 900, 1280 and 1600 pixels. Both forms retain local-only runtime resources.

The inline suite passes **four groups**, including distinct renders for every study, playback and scrubbing, reduced motion, 320/760-pixel layout, and a regression for batched visibility notifications. An observer could receive an initial invisible entry followed by a visible one in the same callback; using only the first left the sampler blank. The sampler now uses the latest entry and redraws when it becomes visible. This correction affects the inline preview only.

The final package suite passes **four groups**: the standalone studio opens directly from disk and exports a PNG; the sandboxed sampler works; all 26 gallery movies load with native playback, looping and controls; and the replacement authoring example plays and scrubs, including at 320 pixels. No script errors were recorded. The standalone studio is 137,233 bytes and contains no external runtime dependencies.

## Publication assets and encoding

Each of the six additions has a lossless **2,400 × 2,400 PNG**, at phase .15 with 16 samples, and a **1,440 × 1,440 MP4**, at 30 fps with 8 samples. Every new loop contains 360 frames over 12 seconds and omits the duplicate endpoint. All 40 earlier publication assets are byte-for-byte unchanged against their prior SHA-256 checksums.

All six final movie-to-source RGB comparisons pass the existing per-channel mean error limit of **4/255**. The largest is Vortices red, 3.899243/255. These compare Chromium's first decoded movie frame with a fresh capture at the exact manifest recipe, including spatial and temporal sampling.

Hyperbolic's first CRF-16 movie exceeded that limit in red (4.109249/255). A 60-frame motion diagnostic compared lower CRFs while preserving H.264, 4:2:0 and the established colour policy. CRF 12 reduced its final full-movie first-frame red error to **3.870669/255**; green and blue measured 1.242868 and 2.921247. CRF 8 improved red by only .119 while increasing the diagnostic segment size by 45%. Lossless H.264 after the same chroma conversion still produced red error 3.619, isolating the subsampling/conversion floor.

Exporter **2.1.1** now accepts a validated `--crf` override. Hyperbolic has the curated MP4 default `movieCrf:12`; other MP4 defaults remain 16 and WebM remains 18. Manifests record the actual value and publication validation checks the catalogue's exact expected value. A tiny end-to-end export confirmed an explicit CRF 13 in both the manifest and the encoded bitstream. The quality threshold was not relaxed, and no artwork colour or geometry was changed to pass it.

Full-file validation passes **52 assets, zero failed and zero missing**, including complete movie decoding, frame counts, dimensions, durations, manifests and colour metadata. Eight matte-relative border notices remain visible in the report: the six previously reviewed compositions, plus Phason and Vortices, whose fields intentionally continue beyond the frame. Surgery, Laguerre, Milnor and Hyperbolic all retain a dark margin. The new decisions are documented in `output/qa/04/composition-review.json`; earlier decisions remain under `03/`.

The six publication movies have also been decoded into complete 120-frame inspection copies at 10 fps, with six selected phases shown in `output/qa/04/final-movie-contact.png`. Compact animated copies and adjacent-frame metrics are included under `output/qa/04/{study}/`. These are inspection derivatives; the 30 fps movies remain the delivered motion masters. Their wraps are not exceptional relative to ordinary adjacent-frame changes.

The portable archive includes all 26 PNGs and 26 MP4s, their manifests, source, documentation, compact motion proofs, selected inspection images and numerical reports. Large per-frame working rasters can be regenerated using the documented proof commands. Assembly computes SHA-256 checksums and verifies the ZIP's CRC integrity after writing it.

## Public-build compatibility correction

The first GitHub Linux run exposed a Hyperbolic defect that the authoring GPU did not reveal: an early return outside the disk left `fwidth` derivatives undefined for neighbouring rim fragments. SwiftShader could then produce different edge pixels for identical inputs. The shader now evaluates a safe interior surrogate for outside fragments and uses its existing final rim mask to return the background. This keeps every fragment lane alive through the derivative calculations without changing the construction or its controls. A focused software-renderer regression checks exact repeated draws through changes of phase and inspection mode; the original finite-radiance and periodicity checks remain strict.

The PNG and MP4 masters retain their previously verified bytes and original rendering manifests. They document the authoring GPU's published rasters; the corrected live and offline studio also supports repeatable edge rendering on software graphics backends.

## Practical limits

These are mathematically defined generative studies with designed materials and motion. Milnor shows cropped finite level bands, not complete zero-thickness pages. Phason's blended transition image is not an exact tiling. The vortex field is a prescribed complex construction, not a solved wave or fluid experiment. Ray budgets, tolerances, pixel filtering, and the finite screen limit what can be resolved.

Publication rendering uses full Chromium 149.0.7827.55, Playwright 1.61.0 resolved from the authoring environment, and the NVIDIA RTX 4070 Laptop GPU through ANGLE/D3D11 with floating-point framebuffer support. The project retains its locked Playwright 1.62.1 dependency, previously checked by an explicit-runtime smoke export. Exact pixels can vary with browser or graphics backend; preserve masters, source and manifests together. Earlier edition reports describe their historical source and validation runs.

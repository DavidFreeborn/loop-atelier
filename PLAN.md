# Loop atelier — research and production plan

## Collection 04 — version 2.1.0, completed edition

Expand the source catalogue to 26 studies and make the studio quiet: one title, Studio/Sources tabs, one alphabetical selector, essential controls, and only the selected construction note and equation beside the artwork. Remove promotional prose, collection divisions, repeated captions and ordinary visible status messages. Preserve accessible announcements, visible errors, keyboard access, reduced motion, fullscreen, recipes and PNG export.

Completed: source interface cleanup and integration of Surgery, Laguerre, Milnor, Hyperbolic, Phason and Vortices through the existing RGB shader contract. Packaging reads the current source and no longer embeds thumbnails. The public scene and recipe interfaces remain compatible.

The six additions cover topology-changing quartic surfaces, weighted 3D cells, Milnor pages, hyperbolic tessellation, dual-pentagrid phason changes and complex phase singularities. Their exact geometric definitions must be distinguished from finite tracing, cropping, shading and optical presentation. In particular, Phason crossfades exact tile states during local flips; an intermediate blended image is not asserted to be an exact tiling.

1. Complete iterative image and motion review, including distinctiveness against the existing 20 studies. Revise the geometry or presentation when the mathematics is not visually legible.
2. Finish independent mathematical checks and raw GLSL evaluation, then check source and standalone behaviour with all 26 studies. Confirm the unobtrusive status/error model, Sources links, narrow layouts and saved recipes.
3. Freeze source and render the six publication stills at 2,400 square and loops at 1,440 square, 30 fps, using the curated duration and deterministic shutter integration. Record browser and graphics provenance.
4. Decode the final assets, compare video RGB against exact source frames, inspect complete motion and shutter convergence, and assemble `output/collection-04.png`.
5. Rebuild the standalone studio, inline sampler, film gallery and portable archive. Publish the exact outcomes and practical limitations in [docs/validation-04.md](docs/validation-04.md).

All five stages are complete. The collection contains 26 finished PNGs and 26 MP4s: **52 assets passed, zero failed or missing**. The final suite passes 107 tests with one documented inapplicable pointwise skip, the main browser suite passes 124 checks, and studio/inline/package checks pass 12/4/4 groups. Eight intentional border compositions have been visually reviewed. Hyperbolic's final CRF-12 movie passes the unchanged RGB quality threshold; exporter 2.1.1 records and validates curated or explicit quality settings. An inline visibility race was fixed and covered by regression. All 40 earlier publication files retain their previous SHA-256 hashes. See the [verification record](docs/validation-04.md) and [detailed brief](docs/collection-04.md).

## Collection 03 — completed earlier edition

Six new works expand the toolkit into continuous RGB fields, changing network connectivity, self-similarity, four-dimensional sections, inversion, complex dynamics and diffraction. The detailed staged plan and authoring guide are in [Collection 03](docs/collection-03.md).

Completed: six new 2,400-pixel stills and six 1,440-pixel/30 fps loops, integrated with all fourteen earlier studies. Mathematical, browser, offline, colour and complete-file checks are recorded in [the validation report](docs/validation-03.md). All forty publication assets decode and validate; six intentional border-composition notices have been visually reviewed. Source and publication files are included together in the portable archive.

## Collection 02 — expansion brief

Add eight mathematically richer original studies: linked Hopf fibres, a braided trefoil, a Klein immersion, a porous gyroid, nodal interference, spherical harmonics, recursive scale motion, and a periodic volume-preserving flow. Preserve the original six and all recipe/export capabilities.

1. Implement independent topology, field, and dynamics modules using the common scene contract. Describe the actual mathematics and any artistic approximations.
2. Render several phases and deformation values for every candidate. Refine silhouette, camera, spacing, exposure, and time evolution after visual inspection.
3. Integrate a new collection selector, generate thumbnails from high-resolution stills, and make packaging/gallery/validation derive from the shared catalogue.
4. Verify deterministic evaluation, numerical continuity and framing, representative motion blur, browser controls, offline bundling, reduced motion, and narrow layouts.
5. Render eight 2,400-square stills and eight 1,440-square, 30 fps loops. Decode movies, check appearance against source, inspect the final motion proofs, and rebuild the complete archive and inline preview.

Acceptance: all eight additions are visually distinctive, have legible mathematical structure and deliberate continuous motion, and work through the same reusable authoring and export pipeline. No candidate is accepted solely because its equations or a single frame look interesting.

Completed: eight new 2,400-pixel stills and eight 1,440-pixel/30 fps movies, all integrated into the offline studio and gallery. Seventy-four mathematical/server tests pass; Descent's inapplicable raw-coordinate check is explicitly replaced by dedicated permutation checks. Browser, packaged-file, sampling, video-appearance and complete-asset QA pass. All 28 final assets decode and verify successfully. See `docs/validation-02.md` for the refinement record and exact results.

## Brief
Understand Étienne Jacob’s generative animation practice, translate the reusable ideas into an independently implemented toolkit, and produce a curated collection of original, publication-ready studies. The deliverable is a portable source toolkit with a browser-based studio, research notes, reproducible presets, stills, and rendered loops.

## 1. Research the visual and mathematical language
- Study the artist’s own gallery, current tutorials, FAQ, and code repository.
- Separate documented methods from our visual interpretation.
- Explain normalized time, phase delays, circular noise, object replacement, simulated paths, particle density, projection, and temporal sampling.
- Record source URLs and distinguish original artwork rights from reusable mathematical ideas.

## 2. Build the common instrument
- A pure scene function maps seeded samples and normalized time to positions and light intensity.
- A small WebGL renderer handles point sprites, projection, exposure, temporal sampling, and output independently of scene geometry.
- Identical parameters yield identical images. Time is continuous and periodic; frame generation never depends on elapsed render time.
- Provide accessible playback, timeline, seed, density, deformation, exposure, palette, and capture controls, plus portable preset import/export.
- Keep the runtime free of external services and libraries. Package the public API and an approachable starter scene.

## 3. Compose six studies
- Meridian: folded toroidal filaments.
- Bloom: a breathing radial structure with nested lobes.
- Undertow: coherent flowing trajectories with spatial delays.
- Lattice: a geometric system with travelling deformation.
- Ribbon: a pleated, twisting parametric sheet.
- Orbit: interwoven orbital paths with phase relationships.

Each needs a distinctive silhouette, balanced negative space, coherent motion, controlled highlights, and a strong small-screen read. Reject redundant or visually weak results and adjust parameters after seeing the actual renders.

## 4. Produce the publication assets
- Export curated lossless stills at 1920–2400 pixels.
- Render deterministic movie frames with multiple shutter samples; encode clean MP4 loops and retain reproducible manifests.
- Document format tradeoffs, looping playback, output sizes, colour handling, and reproducibility.
- Supply a gallery contact sheet and a concise quick start.

## 5. Verify and refine
- Test repeatability, finite geometry, bounds, position continuity, derivative continuity at the loop seam, and seed variation.
- Inspect actual images at several phases; compare silhouettes, density, highlight clipping, and margins.
- Test browser startup, scene selection, playback, scrubbing, parameter changes, preset round-trip, capture, responsive layout, keyboard access, and reduced motion.
- Measure scene update/render costs; cache invariant quantities and avoid work for hidden pages.
- Decode exported movies; verify dimensions, frame counts, duration, and file readability.
- Write an evidence-based validation report, including any practical limitations.

## Completion criteria
All six studies render successfully and loop continuously. The studio’s essential controls work on desktop and narrow screens. Exported stills and movies exist and have been inspected. The source API, starter recipe, research dossier, production instructions, and verification results let a future author make another study without reverse-engineering the project.

## Scope
The artwork and implementation are original studies informed by published techniques; they are not reproductions or works by Jacob. Public hosting is outside this toolkit delivery. Files remain ready to serve or integrate into a publication.

## Collection 03 — revised artistic brief

The earlier collection was too uniform in visual language. The next six studies must change rendering material, composition and mathematical structure together. The detailed [Collection 03 plan](docs/collection-03.md) covers motion-first prototypes, rejected candidates, independent mathematical checks, RGB shader integration, publication exports and package verification. The accompanying [validation report](docs/validation-03.md) records the final evidence and remaining numerical limits.

## Original six-study edition — historical completion, 9 September 2026

All five stages are complete. The edition includes six 2,400-pixel PNGs, six 1,440-pixel/30 fps movies, an offline studio, an inline animated sampler, a movie gallery, source modules, reusable loop primitives, a runnable replacement example, a recipe schema, and the research/production documentation.

Verification passed 34 geometry/server tests, 56 interface/recovery checks plus a targeted diagnostic regression, packaged-file and authoring-example checks, shutter-sampling comparisons, all 12 final-asset checks, and exact-frame movie appearance comparisons. Visual refinement changed sampling density, three compositions' framing/geometry, narrow-screen layout, small-preview point energy, graphics recovery, and the video color pipeline. Full evidence and practical limits are in `docs/validation.md`.

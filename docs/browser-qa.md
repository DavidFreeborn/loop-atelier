# Independent studio review

Reviewed on 9 September 2026 against the visual criteria in [research.md](research.md). Test surface: local studio at `http://127.0.0.1:4173`, Chromium 149.0.7827.55 through Playwright, Windows, device scale factor 1. Desktop viewport 1440 × 1100; narrow viewports 390 × 844 and 320 × 844. Narrow viewport testing checks layout and interaction; it does not establish performance on physical mobile hardware.

The reproducible check is [browser-check.mjs](../tests/browser-check.mjs). It writes screenshots, lossless scene captures, downloaded files, and its machine-readable results to `output/qa`. `QA_SKIP_CAPTURES=1` skips repeated six-scene and palette proof rendering when checking interface fixes.

## Scope and evidence

The first full pass exercised all six scene buttons, selected-state feedback, play/pause, keyboard timeline scrubbing, deformation, exposure, duration, seed validation, randomized seed, density, all three palettes, reset, recipe download and exact reimport, invalid recipe rejection, malformed JSON rejection, 1200-pixel PNG download, field guide navigation, and both initial and dynamically changed reduced-motion preferences.

Each scene was also captured through `loopStudio.capture({ scene, size: 600, time: .15, samples: 4 })`. The then-current capture default was 360,000 particles. The same Meridian capture was repeated after the other five scenes and had the same SHA-256 digest, checking that rendering other scenes did not contaminate its output. These small proofs are visual evidence for the reviewed build; they are not final publication masters.

The recipe test confirmed that an invalid seed and malformed JSON left the current valid composition intact. The PNG test inspects the downloaded file's PNG header rather than merely trusting the on-screen success message. Expected validation errors are retained in the console log; they are not uncaught runtime exceptions.

## Actionable findings from the first pass

| Priority | Evidence and impact | Requested remedy |
|---|---|---|
| High | One startup lost its live WebGL context. `getStats().renderer` returned null, screenshots showed a blank white canvas, and a later resize raised an uncaught framebuffer allocation error. Offscreen capture still worked. A fresh isolated launch displayed the live artwork correctly, so this was intermittent context loss rather than a universal shader failure. | Handle context loss and restoration, pause during loss, show a visible status, and rebuild renderer resources after restoration. Make diagnostic APIs safe while the renderer is unavailable. |
| Medium | At 320 pixels, the document measured 363 pixels wide. The six-study grid's three columns had minimum widths imposed by image-plus-label content; the rightmost Undertow and Orbit buttons extended outside the viewport. At 390 pixels there was no horizontal overflow. | Use two columns on the narrowest viewport, or otherwise constrain the study entries without clipping their names. |
| Low | The mobile intro displayed `moment.Shape` because the line-break element was hidden with CSS and there was no separating space. | Preserve a real space between the sentences. |
| Low | The canvas accessibility label described the playback state only at scene selection, so it became stale after play/pause. | Update the label together with playback state, or avoid claiming a changing state in a static label. |
| Low | Studio and Field guide used `aria-selected` on ordinary buttons without a tab role. | Use `aria-pressed` for these view toggles, or implement full tab semantics. |

The implementation owner addressed these findings during review. The final retest status is recorded below; initial findings are retained to document why those changes exist.

## Visual assessment

The studio's visual hierarchy is strong: a restrained dark surround, a large isolated artwork, a readable study list, and compact controls. The warm neutral typography gives the interface an editorial character without competing with the images. The artwork margins and black voids are valuable parts of the compositions. The export section makes the page long on mobile, but the order remains usable: choose, view, compose, export. A long page by itself is not a layout defect.

At desktop size, several secondary labels are deliberately small. They are readable in the inspected screenshots, but further reduction would be unwelcome. The essential composition controls become larger on narrow viewports. The field guide is clear at all tested widths and its source links are visibly separated from the instructional text.

| Study | Assessment of the initial 600-pixel proof at phase .15 |
|---|---|
| Meridian | Strongest immediate composition: a legible dark aperture, a stable folded silhouette, and dense filaments that remain subordinate to the form. Good balance between bright compression and quiet surface. |
| Bloom | A distinct lobed structure with clear voids, though the initial view read more as a sharp wire figure than a soft flower. The scene owner was already refining the camera and petals during this review; final judgment should use the revised proof. |
| Undertow | Clear direction into a dark throat, with surface-following filaments carrying the depth cue. The oblique mouth distinguishes it from a generic circular vortex. |
| Lattice | Coherent architectural scaffold with visible deformation. Its exact geometry provides useful contrast against the organic studies. Fine line crossings should be inspected at actual delivery size for moiré. |
| Ribbon | An expressive sequence of twists with sufficient dark space between folds. It reads as a continuous material. The thin boundary threads deserve scrutiny after video encoding. |
| Orbit | A deliberately sparse counterpoint to the dense pieces. The initial still had relatively uniform ring brightness and weak depth; a stronger near/far hierarchy or intersecting planes could improve its identity. The scene owner subsequently refined it. |

Silver is the closest of the offered palettes to the studied monochrome vocabulary. Amber remains restrained and coherent. Ink on paper turns the same geometry into an engraving-like study and remains legible; it is an extension of the toolkit rather than a claim about Jacob's usual presentation.

This independent check does not substitute for the final movie review. A good still cannot establish seam quality, motion rhythm, or compression quality. The main validation workflow separately checks mathematical closure, temporal transitions, full-cycle contact sheets, and encoded masters.

## Final retest

The revised build passed **56 interface and recovery checks**, with zero uncaught browser exceptions and zero failed network requests. Repeated six-scene capture generation was skipped in this pass to avoid competing with the final movie rendering; the earlier successful capture and palette proofs remain in `output/qa`.

Forced `WEBGL_lose_context` testing confirmed that interruption pauses playback, displays a visible recovery message, reconstructs the renderer after restoration, and permits playback afterward. The restored live canvas was visually inspected in `output/qa/context-restored.png`. The latest desktop screenshot also shows successful automatic recovery from an initial context interruption.

The latest 390-pixel document width is exactly 390 pixels; the 320-pixel document width is exactly 320 pixels. Both field-guide widths also match their viewports. The 320-pixel study list now uses two columns, displays full names, and all entries remain selectable. The missing mobile sentence space is fixed. Canvas playback descriptions and navigation pressed states now follow the active controls.

One transient diagnostic edge was found and fixed separately: calling `getStats()` during context loss could dereference a null renderer even though the visible interface recovered. A subsequent targeted test passed: while the context was lost, diagnostics safely returned `contextLost: true` and null device fields; after restoration they returned `contextLost: false` and valid device fields. There were no browser exceptions. Evidence is in `output/qa/context-diagnostics.json`, and the lost-interval assertion has been added to the reusable check script.

The refined six-study contact sheet at `output/qa/contact-refined.png` was also inspected. It confirms consistent scale, margins, background, and fine filament treatment across the collection. Meridian and Undertow provide the strongest dense forms, Lattice the geometric contrast, Ribbon the lateral rhythm, and Orbit the sparse counterpoint. Bloom's distinct lobes remain readable. No claim of encoded-movie quality is made from the contact sheet alone.

A brief source review of the phase helpers, replacement example, scene construction, and compositor found no additional blocking correctness issue. The collection uses analytic periodic geometry; the replacement example correctly repeats the same sample pattern in every queue item. The supplied harmonic field is identified as harmonic rather than falsely labeled OpenSimplex noise. The compositor averages exposure before tone mapping. These distinctions agree with the research dossier.

# The Loop atelier framework

## What it does

Version 2.1.0 turns a deterministic scene into a reproducible image through either of two contracts: a JavaScript particle buffer or a GLSL RGB field. The 26-study catalogue contains 14 particle studies and 12 shader studies. Both use the same normalized time, temporal integration, recipes, capture API and movie exporter.

```text
                   Seed + recipe + phase
                    /                 \
       scene.update(t, v)          artwork(pixel)
      positions + intensity      linear RGB radiance
       projection + sprites     own geometry / shading
                    \                 /
                 HDR sample accumulation
                 temporal mean + exposure
                  tone map + output palette
                       sRGB PNG
                optional SDR movie encoding
```

The source contains no third-party runtime code. The examples use coherent trigonometric fields, not a copied noise implementation. The `loopNoise` adapter accepts an external continuous noise function if you want that construction.

## The particle geometry contract

```js
const scene = {
  count: 100000,
  data: new Float32Array(100000 * 4),
  update(t, variation) {
    // Fill x, y, z, intensity for each particle.
    // Mutate and return the same Float32Array.
    return this.data;
  },
};
```

Coordinates are in scene units, normally within roughly ±1. The fourth value is nonnegative intensity, normally between 0 and 1. Intensity affects radiance, not an opaque surface material. The particle path uses additive point coverage; it does not model occlusion, shadows, scattering, or physical light transport. This is intentional: overlapping faint marks disclose density and internal structure.

Treat phase as a continuous real number measured in complete cycles. Rendering the same phase with the same parameters must not depend on the order of earlier calls. Keep random sampling out of `update()`. Precompute spatial basis functions when creating the scene, and only combine their coefficients with time-varying harmonics during updates.

The 14 particle studies export this contract from `createScene(id, options)` in `src/scenes.js`. Their metadata supplies a construction note, equation, camera, duration, point size and curated exposure. The topology, field and dynamics modules extend the same catalogue. `src/example.js` supplies a separate replacement study that demonstrates extension without editing the built-in catalogue. For replacement loops such as Descent, visible state closes under a documented permutation; raw particle identity need not return to its original coordinate. Its dedicated test therefore verifies the complete visible permutation and the hidden recycle interval.

## The RGB shader contract

```js
const scene = {
  kind: 'shader',
  seed: 42, // direct shader uniform; see recipe mapping below
  palette: 'native',
  source: `
    vec3 artwork(vec2 p) {
      float a = 6.28318530718 * uPhase;
      float radius = .45 + .12 * sin(a);
      float d = length(p) - radius;
      float ring = exp(-1600. * d * d);
      return vec3(1.2, .5, .08) * ring;
    }
  `,
};
```

This small example illustrates the contract, rather than a finished composition. `source` defines `vec3 artwork(vec2 p)` and any private helpers; omit `#version`, `main`, precision and uniform declarations. The renderer supplies scalar uniforms `uPhase`, `uVariation`, `uSeed` and `uResolution`. Pixel coordinates `p` sample `[-1,1]²`, with positive y upward and stratified subpixel offsets when supersampling. `uResolution` is the square raster width in pixels. Phase is normalized in cycles and variation lies in `[0,1]`.

Return finite, nonnegative **linear RGB radiance**, before exposure, tone mapping or sRGB conversion. The shared wrapper clamps each channel to `[0,32]` and replaces invalid RGB with black; those guards are not substitutes for correctness. Tests should evaluate the raw artwork separately so invalid arithmetic cannot be hidden by the wrapper. Do not use already encoded sRGB values as though they were linear light.

`LoopRenderer` dispatches on `kind` and caches the compiled program by its source. There is no particle array or `update()` method for this path. Particle count, the shared particle camera and point size have no effect. For an opaque implicit surface, the shader itself defines camera rays, intersections, normals, materials and light visibility. Surgery intersects a quartic directly; Laguerre and Milnor trace bounded geometric fields. These are scene-specific geometric renderers inside the RGB contract, not a shared mesh renderer or a physical light-transport engine.

`createScene(id, {seed})` maps the integer recipe seed through the catalogue's seeded generator to a scalar shader uniform in `[0,1000)`. A direct `{kind:'shader', seed:42}` scene uses uniform 42 directly and does not reproduce recipe seed 42. Use `createScene()` when matching studio recipes, captures or manifests.

All 12 shader studies evaluate arbitrary phases without feedback textures, previous frames or simulation warm-up. Exact periodic constructions can still contain moving edges, singular topology events and finite numerical approximations; they do not imply differentiability at every pixel. Test raw `t` and `t+1` without the shared renderer's wrapping, then inspect the actual last-to-first image transition. See [Collection 03](collection-03.md), [Collection 04 geometry](geometry-04.md) and [Collection 04 mathematics](mathematics-04.md) for the individual constructions and limits.

## The renderer contract

```js
import { LoopRenderer } from '../src/renderer.js';
const renderer = new LoopRenderer(canvas);
renderer.resize(2400); // square raster size, not CSS size
renderer.render(scene, 0.15, {
  variation: 0.5,
  camera: { yaw: 0.08, pitch: 0.44, distance: 3.4 },
  pointSize: 1.12,
  exposure: 1.12,
  palette: 'silver', // silver | amber | paper | native
  samples: 16,
  shutter: 0.65,
  fps: 30,
  duration: 8,
});
canvas.toBlob(blob => { /* save or upload your own output */ }, 'image/png');
renderer.dispose(); // release GPU resources when finished
```

For particles, camera rotations are radians. Point size is specified in pixels at an 800-pixel reference size and scales with output resolution and perspective. Brightness includes a smooth near/far cue. Sample weight compensates for particle count, so raising density mostly changes filament continuity instead of simply making everything white. This compensation is approximate because the sampling pattern and point-coverage rasterization also matter. Exposure remains an independent multiplier. For catalogue scenes, pass the metadata's camera, point size, duration and exposure when calling `LoopRenderer` directly; the studio capture API does this automatically.

The renderer accumulates into an RGBA16F texture when supported. Temporal samples are centered around the requested phase over an interval `shutter / (fps × duration)`. Shader samples also use independently permuted, centered pixel strata. One sample evaluates the exact requested phase and pixel center. Increasing samples improves temporal and spatial integration; it does not increase the numerical tracing budget inside an artwork shader.

For a shader's `native` palette, the averaged RGB radiance is exposed with `1 − exp(−exposure × RGB)` and then converted to sRGB. The alternative palettes first reduce shader RGB to linear luminance, apply the same exposure and transfer, then interpolate between authored encoded background/ink colors. Particle palettes use their scalar accumulated intensity in that latter path. `native` preserves shader color; it does not add colors to the monochromatic particle buffer. There is no bloom pass. The standard-precision live fallback is for exploration; the capture API requires floating-point support so a reduced-precision preview cannot silently become a publication master.

## Reusable loop primitives

Read `src/primitives.js` for signatures and examples. These are independently implemented mathematical utilities.

| Primitive | Purpose | Design constraint |
|---|---|---|
| `wrap(t)` / `phaseAt(t, offset)` | Normalize time or shift a gesture | Positive offsets advance; negative offsets delay. |
| `seededRandom(seed)` | Reproducible random sampling | Use during scene construction. |
| `createLoopField(seed, octaves)` | A cached, coherent Fourier loop | Integer frequencies guarantee a closed cycle. |
| `harmonicLoop(t, seed, octaves)` | Convenience one-shot evaluation | Use the cached field for repeated evaluation. |
| `loopNoise(noiseFn, t, options)` | Evaluate noise along a time circle | The supplied function must be continuous in its coordinates. |
| `replacementPhase(index, count, t, cycles)` | A queue whose members exchange positions | `cycles` is integral; **all** appearance attributes must match under permutation. |
| `smoothPeriodicPulse(t, width)` | A smooth pulse crossing the timeline boundary | Width determines the visible duty cycle. |
| `createClosedPath(points)` / `sampleClosedPath(points, t)` | Smooth wrapped Catmull–Rom path | The tangent is continuous, but speed is not necessarily constant. |

For constant-speed motion along a strongly nonuniform path, construct an arc-length lookup table and sample by distance. For simulation-derived art, simulate once, fit or resample an appropriate closed path, and animate traversal of that cached path. Wrapping an arbitrary simulation state is insufficient: its endpoints and velocity must already agree.

## A practical composition workflow

1. **Choose a scaffold.** Start from one readable curve, annulus, shell, lattice, or sheet. Define the intended empty area as carefully as the filled one.
2. **Choose the loop mechanism.** Oscillation works when a surface deforms; replacement is useful when material must appear to keep travelling. Use a closed time circle for noise-driven motion.
3. **Choose the phase field.** Give nearby points related delays. Linear, radial, angular, and nonlinear longitudinal offsets suggest different movement.
4. **Choose the rendering path.** Additive point sprites suit transparent filaments and sampled surfaces. RGB shaders suit precise tiles, fields, implicit solids and their own shading. Their visual identities should follow the construction.
5. **Establish depth or hierarchy.** Adjust the camera for a solid, or the scale relationships and negative space for a planar field. Let the main structure remain legible at preview size.
6. **Tune sampling.** Inspect at the actual delivery size. Particle undersampling causes dotted curves; shader undersampling can alias moving contours or edges. More samples should clarify the geometry rather than obliterate its voids. Trace-budget errors need changes to the shader itself.
7. **Curate seeds.** Hold all other variables fixed. A deterministic framework makes useful comparisons possible; randomness does not replace selection.
8. **Check the cycle.** Inspect multiple phases, the transition from last frame to first, and motion on both sides of the seam. A matching endpoint alone is not enough.
9. **Render a proof, then the master.** Save the recipe and environment metadata with the final lossless output.

## How the original six studies differ

| Study | Construction | Visual purpose |
|---|---|---|
| Meridian | Closed annulus with travelling toroidal harmonics | A strong central void and density folds. |
| Bloom | Fivefold polar shell, viewed from above an oblique axis | Lobes that read as a flower with internal depth. |
| Undertow | Flared helical surface with a deep, off-axis throat | Directional flow into an architectural void. |
| Lattice | Two line families on six faces, displaced by pinned wave modes | Precise edges against a breathing interior grid. |
| Ribbon | A pleated ruled sheet around a moving spine | Finite textile-like edges and a travelling twist. |
| Orbit | Seven elliptical bundles in independently inclined planes | A deliberately spare counterpart to the dense surfaces. |

The later collections broaden the vocabulary: Collection 02 adds topology, implicit fields and recursive replacement; Collection 03 adds continuous RGB patterns, complex dynamics, diffraction and geometric ray tracing. Arbitrary live simulations and general packing remain outside the built-in catalogue.

## Collection 04: six mathematical constructions

| Study | Geometry or field | Presentation and limits |
|---|---|---|
| Surgery | `Σ(xᵢ²−a)² = κ(t)a²`, crossing critical levels 1 and 2 | Direct quartic intersections; singular geometry at the actual topology changes; curvature informs color. |
| Laguerre | Moving 3D power cells, `‖x−sᵢ‖²−wᵢ` | Exact bisector distances support finite walls, a spherical shell and a cutaway wedge; cells can disappear. |
| Milnor | Argument levels of `z₁²+cz₂³` on `S³` | Finite level bands and a cropped stereographic view; the full trefoil and complete pages need not be visible. |
| Hyperbolic | Regular `{7,3}` tessellation in the Poincaré disk | Exact circle-reflection construction and periodic disk isometry, evaluated with a finite reflection budget and pixel filtering. |
| Phason | Five-grid dual construction and a closed internal-space path | Exact rhombus tile states; optical crossfades during local flips. Intermediate blends are not asserted to be exact tilings. |
| Vortices | Three charge `+3` and three charge `−3` factors with a phase carrier | Regularized cores and analytic contour-width control; a constructed complex field, not a fluid simulation. |

All six have a curated 12-second cycle. Their definitions and bounded numerical checks are in [geometry-04.md](geometry-04.md) and [mathematics-04.md](mathematics-04.md). Publication and final verification status is tracked separately in [validation-04.md](validation-04.md).

## Reproducibility and recipes

Studio recipes include the scene ID, seed, deformation, exposure, duration, density, palette, and normalized phase under the versioned `loop-atelier/recipe` schema. Invalid recipes are rejected before modifying the current composition. Loading a recipe pauses playback at the saved phase. Saving or rendering a still captures the selected phase without advancing it.

The quiet studio uses a single alphabetical selector for all 26 studies. It shows the selected construction note and formula without a second title or descriptive caption. Sources has direct attribution and mathematical references. Routine messages remain available to assistive technology; actual errors are visible. Particle density is hidden for shaders, while saved recipes retain their schema-compatible count field. The change in layout does not change the public API.

The machine-readable schema is `docs/recipe.schema.json`. Recipes retain the full stored phase precision; the shorter number shown by the playback control is only a display label.

There are three distinct resolutions: the CSS display size, the live render resolution, and the exported raster size. Changing the browser window does not change offline export dimensions. The UI caps its live raster and pauses when hidden. The movie exporter drives exact phases independently of real-time performance and suppresses live preview animation.

The scene definitions are deterministic, and repeated captures are reproducible within the tested rendering environment. Floating-point arithmetic, point rasterization, shader derivatives, tracing thresholds and browser color handling can differ across GPUs and browsers. Preserve the completed PNG and the source version as well as its recipe; a recipe is not a substitute for the final image.

## Extending the studio catalogue

Add metadata and either a particle builder or a `{kind:'shader', source}` definition to `src/scenes.js`, usually through an independent module. Metadata includes `id`, `title`, `technique`, `formula`, `duration`, `exposure` and an authored default palette; particles additionally use camera and point size. Collection numbers are production metadata, while the studio displays all entries in one alphabetical selector.

The studio, exporter, movie gallery and packaging derive their entries from this catalogue. `scripts/render-collection.mjs` and `scripts/package.mjs` write `output/catalog.json` for asset checks and contact sheets. Update the recipe schema when adding an id. The offline bundler wraps each additional module in a private scope; add a new module to its module list. Packaging embeds source and styles, not thumbnails; it can build the studio before movie or still production finishes. The film gallery's linked assets must be present for playback.

Run mathematical, raw-shader or particle continuity checks appropriate to the construction, then review proofs before publishing a master. The [export guide](exporting.md) gives the Collection 04 proof commands. For an independent custom scene, use `LoopRenderer` directly; no catalogue changes are required. See [Collection 02](collection-02.md) and [Collection 03](collection-03.md) for more authoring examples.

The framework remains a small scene catalogue, two explicit rendering contracts, reusable loop primitives and a deterministic export pipeline. It does not supply a general mesh modeller, physics solver or physically based light-transport renderer.

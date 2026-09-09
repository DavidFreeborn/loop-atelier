# Collection 03 — Structures beyond the surface

The brief changed after the second collection: mathematical novelty alone did not produce enough visual surprise. Most studies still shared one composition, one material, and one kind of motion. This collection changes those three things together.

Six original works use continuous pixel fields and opaque ray-marched surfaces. They extend the existing fourteen particle studies; all twenty remain editable in the same studio. The new renderer accumulates RGB radiance, includes spatial subpixel sampling, and preserves the original particle renderer's tonal response.

## The production plan

1. Prototype six different mechanisms: four-dimensional sections, spherical inversion, complex root monodromy, wave diffraction, self-similarity, and changing network connectivity.
2. Review six phases and a complete low-resolution cycle for every candidate. Look for structural transformation, compositional hierarchy, purposeful colour, and a distinct visual identity. Improve weak candidates before rendering masters.
3. Validate each mathematical claim separately from its aesthetic treatment. A numerical approximation must be identified as one. Neither filmic shading nor artistic colour implies physical accuracy.
4. Integrate the new rendering path into recipes, palettes, offline packaging, live playback, and lossless export. Preserve all older recipes and studies.
5. Render 2,400-pixel stills and 1,440-pixel, 30 fps movies with spatial and temporal supersampling. Inspect the encoded movies, the loop boundaries, colour, browser controls, and narrow layouts.
6. Package the source, explanations, evidence, and full publication assets together.

## How these work

The older scenes ask, “Where is each particle at this phase?” The new scenes ask, “How much light reaches this pixel at this phase?” The time convention stays the same: one cycle is `t ∈ [0,1)`, and every frame can be evaluated independently.

For solid forms, a ray starts at a virtual camera and advances through an implicit distance field. An intersection supplies a surface normal, lighting and material. A four-dimensional slice can radically change its three-dimensional structure even under a smooth rotation in four dimensions.

For complex dynamics, every pixel is an initial complex number. Repeatedly applying Newton's method reveals which root attracts that number and how difficult convergence was. The polynomial coefficients complete a loop while individual roots can exchange places, a phenomenon called monodromy.

For diffraction, each pixel sums complex wave amplitudes from a finite aperture. Amplitudes can reinforce or cancel. Squaring the magnitude gives intensity; the changing folds are produced by interference, not by drawing bright curves over the image.

For recursive patterns, a logarithmic coordinate can turn scale into translation. Travelling by one cell then gives an apparently endless zoom with an exact image loop. A tiled mechanism can also loop through a permutation: after a cycle the same visible structure returns even when its conceptual parts have traded identities.

## Authoring another shader study

Add a metadata object to one of the `src/shaders-*.js` modules and include it in `SCENES`. The object supplies its title, description, mathematical technique, duration, exposure, `kind: 'shader'`, `collection: 3`, `palette: 'native'`, and a GLSL `source` string.

```glsl
// The shared renderer provides these uniforms:
// uPhase, uVariation, uSeed, uResolution (all floats).
// p is the square image coordinate in [-1,1]².
vec3 artwork(vec2 p) {
  float theta = 6.28318530718 * uPhase;
  float wave = .5 + .5*cos(12.*length(p) - theta);
  return vec3(.7, .25, .08) * wave; // nonnegative linear RGB radiance
}
```

Do not declare `main`, GLSL version, or the provided uniforms. Private helper functions are allowed. Each artwork compiles into its own program, so helper names can repeat between studies. Programs are cached and released with the renderer. `uSeed` is a reproducible pseudorandom float derived from the recipe's integer seed, not the integer itself.

Return radiance rather than display-encoded RGB. The shared renderer averages all samples, applies `1 − exp(−exposure × radiance)`, then encodes sRGB. Native palettes preserve colour; Silver, Amber and Ink on paper remap luminance. Particle density has no meaning for pixel shaders, so that control is hidden for these studies.

At one sample the renderer evaluates the pixel centre and exact phase. With multiple samples it combines a stratified pixel footprint and a centred shutter interval. Use derivative filtering for narrow procedural lines as well. Deterministic rendering does not make a fractal boundary band-limited: supersampling reduces aliasing but cannot display arbitrarily small detail.

The GPU determines live playback performance. Exported movies use exact frame times and remain independent of live frame rate. Reduced-motion preferences pause the live studies.

Detailed formulas, approximation limits and mathematical checks are in the [pattern notes](pattern-studies.md), [space notes](new-space.md), and [complex-field notes](complex-fields.md). The [verification report](validation-03.md) records what was actually tested and rendered.

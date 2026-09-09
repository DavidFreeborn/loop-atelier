# Recursive and dynamical studies

`src/scenes-dynamics.js` exports `DYNAMIC_SCENES` and `DYNAMIC_BUILDERS`. Each builder takes `(count, seededRandom, packedFloat32Array)` and returns `update(normalizedTime, variation)`. It writes the existing renderer's four-float particle format and reuses all allocations. Import the metadata into `SCENES` and spread the builder map into `BUILDERS` in `src/scenes.js` to integrate both studies.

## Descent

**Descent / An endless spiral of thresholds** uses a recursive scale illusion. Rounded-square architectural galleries expand toward the viewer; successive galleries rotate into a logarithmic spiral. Each gallery comprises 32 thin contour filaments spanning a wide, twisted bevel, with twelve travelling pleats and a second fourfold relief. The composition has measured edges, a clear central aperture, and repeated depth cues.

For gallery index `k` and normalized time `t`, define:

```text
s_k = (k - t) mod K                 K = 8
r_k = 1.18 exp(-0.405 s_k)
angle_k = (0.37 + 0.54 variation) s_k + 0.08 sin(2πt)
```

The planar contour is the superellipse `x⁶ + y⁶ = 1`, sampled by its polar radius rather than fractional powers of sine and cosine. This avoids severe sampling gaps near the axes. Copies occupy geometrically decreasing scales; their bevel depth also decreases with scale. Intensity compensates for increasing projected point density in the inner galleries.

The visible loop is exact **under a permutation of galleries**, rather than through a closed orbit of every individual stored particle. Advancing time by one exchanges the galleries. They share exactly the same seeded contour template, sampling offsets, and intensities, so the exchange preserves the rendered image. The recycling gallery passes through an exactly dark interval at both ends of its scale range. A quintic visibility window reaches zero with vanishing first and second derivatives before its coordinates wrap. Temporal sampling therefore never exposes a visible teleport.

Equal populations per gallery are essential. For arbitrary counts, at most seven remaining particles are kept black instead of allocating unequal populations. At the curated 360,000 particles, no particles are unused. Metadata explicitly declares `loopTopology: 'permutation'`. A particle-by-particle near-seam displacement metric is inappropriate for this study; compare rendered frames, or compare particles after the documented gallery permutation. `tests/dynamics.test.mjs` checks visible coordinates and derivatives of emitted light and its spatial moments after that permutation, at 4,096, 60,000, 180,000 and 360,000 particles, plus nonmultiples of eight. It also verifies that resetting and remainder particles remain exactly black.

Default loop duration is 8 seconds. Variation changes the logarithmic spiral's twist and fine corrugation; it preserves the recursive relationship. The suggested camera has a modest oblique tilt so the bevels remain legible while the central aperture stays open.

## Confluence

**Confluence / Three currents through a double scroll** begins with three broad, ruled ribbons braided around a closed double-scroll centreline:

```text
C(u) = (0.67 sin u, 0.44 sin 2u, 0.245 cos u)
u ∈ [0, 2π)
```

The centreline's tangent never vanishes. A periodic frame built from its projected normal supplies two transverse directions without Frenet-frame flips at inflection points. Three ribbon families, separated by a third of a turn, wind around it with angle `3u + family × 2π/3`. Each family contains 36 close but separate filaments. The two broad lobes, crossing throat, and individual strands provide clear negative space and structure.

Six elementary sine shears then stretch and fold this braid. A first pass has the form:

```text
x ← x + a sin(3.4 y + 2πt)
y ← y + b sin(3.1 z - 2πt)
z ← z + c sin(3.7 x + 2πt)
```

A second, weaker pass uses different spatial frequencies and integer temporal harmonics. Each shear changes one coordinate by a function of another, so its Jacobian determinant is exactly one. Their composition preserves volume before a fixed display scale. Subtracting the image of the origin stabilizes the framing and also preserves volume. All time dependence uses integer harmonics: every material particle's position and brightness return smoothly, and exactly in the mathematical model, after one cycle.

This is a designed cyclic family of dynamical deformations, with explicit equations and no numerical warm-up. Its stretching and folding are motivated by nonlinear flow maps; no claim of a measured chaotic attractor or positive Lyapunov exponent is needed. A coherent highlight travels along the braid while the deformation changes its silhouette. Variation increases both shear passes without changing the number of strands or their closure.

The default loop duration is 10 seconds. The builder precomputes the entire undeformed braid once, then evaluates six sine functions per particle per update. It allocates no memory during rendering. Confluence is more computationally expensive than the original precomputed-harmonic surfaces, so benchmark export density and temporal sample counts on the target machine.

## Verification considerations

- Check finite coordinates, nonnegative intensity, seed reproducibility, variation endpoints, and out-of-order frame evaluation for both studies.
- Confluence should pass pointwise period and near-seam derivative checks.
- Descent should pass rendered-image period and seam checks under the gallery permutation. Its hidden coordinate resets are intentional and fully masked.
- Check the full loop through the supplied cameras at variations 0, 0.5 and 1 before raising density or brightness. Thin, distinct bands and an open central space are the intended visual features.

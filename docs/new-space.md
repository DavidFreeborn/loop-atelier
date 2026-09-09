# Section and Inversion

These two original GLSL studies use opaque geometry, warm key light, a cool fill, soft geometric shadows, and local ambient occlusion. Their source exports `SPACE_SHADERS` and follows the collection 03 `artwork(vec2 p)` contract. Returned values are nonnegative **linear radiance**, before the shared renderer's exposure, tone mapping, and sRGB conversion.

## Section: a three-plane through a four-dimensional grid

Embed the viewing space as an affine three-plane in four-dimensional Euclidean space:

\[
q=R(t)(x,y,z,h(t)).
\]

The rotation is the composition of rotations in the \(xw\), \(yw\), and \(zw\) planes. Its angles and the slice offset are smooth periodic functions of time. In the four-dimensional grid, each coordinate defines a family of equally spaced hyperplanes. Thickening pairwise intersections of these families gives six families of structural members. Restricting this solid to the rotating three-plane produces the visible architecture.

For coordinate \(q_i\), let \(d_i\) be its unsigned distance to the nearest grid hyperplane. A rounded rectangular cross-section is evaluated on each pair \((d_i,d_j)\); taking the minimum over the six pairs forms their union. Rotations are orthogonal and restriction to the affine slice does not increase distances, so the four-dimensional distance field supplies conservative steps for tracing its three-dimensional restriction.

The rounded cross-section is symmetric and nondecreasing in either nonnegative coordinate. Consequently, the closest pair among \(x,y,z\) consists of their smallest and middle distances. The closest pair involving \(w\) uses the smallest of \(x,y,z\) together with \(w\). The shader therefore evaluates two rounded cross-sections instead of six, preserving both structural families and their material selection.

Members arising from pairs among \(x,y,z\) are ivory; members whose pair includes \(w\) are copper. These colours identify structural families. They do not depict literal four-dimensional materials or imply that a perspective camera can look directly into a fourth spatial dimension.

The grid is infinite in its mathematical definition. The displayed structure is cropped to a finite box and placed on a conventional three-dimensional graphite plinth. This is a slice of a thickened hypercubic cellular construction, **not** a tesseract edge projection or a representation of an actual historical building.

## Inversion: an inverse image of vaulted cells

Sphere inversion with centre \(c\) and squared radius \(R^2\) is

\[
I(p)=c+\frac{R^2(p-c)}{\|p-c\|^2}.
\]

The source geometry is a periodic three-dimensional lattice of rounded rectangular structural members. The displayed solid is its inverse image under \(I\). The source lattice stays orderly; inversion produces curved openings and progressively smaller features near the centre. The sphere's centre and radius, and the source grid's translation, change periodically. Those changes transform the structure itself in addition to moving the camera.

This produces a hierarchy of scales from an infinite periodic source, but it is not an iterated-function-system fractal, a Mandelbox, or an Apollonian sphere packing. The artwork deliberately excludes a ball of radius 0.31 around the inversion centre and crops the exterior. It does not claim to resolve arbitrarily small geometry.

### Conservative ray steps

Multiplying a source distance by the local inverse Jacobian scale is only a local approximation. This shader instead uses a conservative bound.

Let \(r=\|p-c\|\), and let \(D\) be the absolute distance bound in the source field. Inversion obeys the exact two-point distance identity

\[
\|I(x)-I(p)\|=\frac{R^2\|x-p\|}{\|x-c\|\|p-c\|}.
\]

Within a ball of radius \(\delta<r\) around \(p\), the right-hand side is at most \(R^2\delta/[r(r-\delta)]\). Setting this equal to the source clearance \(D\) gives the conservative step used by the shader:

\[
\delta=\frac{Dr^2}{R^2+Dr}.
\]

This expression stays below \(r\), is stable as \(D\) approaches zero, and needs no square root. It is tighter than a bound formed from the largest Jacobian norm over the same ball.

The source distance function is 1-Lipschitz: each grid-plane distance is 1-Lipschitz in its independent coordinate, the rounded cross-sections use a standard Euclidean box distance, and the union takes their minimum. The bound therefore applies. It is conservative rather than an exact Euclidean signed distance to the transformed geometry. Negative values are used to preserve the inside/outside sign and to estimate the surface normal.

## Rendering and loop limits

The primary ray uses at most 80 steps; small previews use 68. Shadows use 24 additional steps, and ambient occlusion uses four normal-direction samples. The radiance model is a controlled illustration with approximate local illumination, not a physically converged path-traced solution. Very small or nearly tangent details can be affected by the finite step and hit tolerances.

Every animated value is a smooth function of integer-frequency trigonometric terms. The shader wraps the normalized phase with `fract`, including at the exact endpoint. There is no accumulated simulation state or frame feedback. The same seed, variation, and phase describe the same surface on repeated evaluations.

## Verified performance optimization

`node scripts/benchmark-space-pairs.mjs` compares the original six-pair Section field with the ordered two-pair field in isolated GLSL programs. It reconstructs the original calculation for comparison without editing the production source. The retained report is `output/qa/03/space-pair-optimization.json`.

On the development host at 256 × 256 pixels, alternating ABBA timing groups measured median frame times of **21.68 ms before and 15.85 ms after**: a 1.37× speedup, or approximately 27% less rendering time. Across 36 seed, variation, and phase configurations, all 2,359,296 compared pixels were bit-identical in raw linear floating-point output. The independent scalar comparison covered 300,729 nonnegative input cases, including signed interior distances and material ties, with zero mismatches. Tests additionally evaluate Section's actual GLSL ordering expressions against the original six-distance definition.

The corresponding Inversion prototype also matched its tested pixels exactly, but its measured speedup was only 1.007×. It was not adopted. Timings depend on GPU, resolution, driver, and concurrent work; the image equivalence, rather than a particular timing ratio, is the essential acceptance criterion.

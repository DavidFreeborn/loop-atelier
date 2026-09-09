# Three original field studies

`src/scenes-fields.js` exports `FIELD_SCENES` and `FIELD_BUILDERS`, with the same packed particle-buffer interface as the existing scenes. These studies introduce a porous implicit architecture, an interference plate, and lobed angular volumes. They do not reuse artist code or assets.

## Gyroid

The static scaffold approximates the nodal set

`sin x cos y + sin y cos z + sin z cos x = 0`

inside one cubic period. Marching tetrahedra on a 32-cell grid produces triangles; stratified area-weighted sampling avoids parameterization pile-ups. The implicit gradient supplies smooth normal directions. A small, spatially delayed normal wave and a periodic rotation animate the sculpture.

This trigonometric nodal approximation is not an exact minimal gyroid. The animated normal displacement does not preserve a particular implicit level set or zero mean curvature. Shading uses the reference normals and the renderer's depth weighting; there is no hidden-surface solver. The intended material is translucent granular light, with physical openings in the sampled scaffold.

## Resonance

The field mixes the square Neumann eigenfunctions `(2,5)` and `(5,2)` in quadrature:

`F = cos(2πu) cos(5πv) cos(2πt + α) + cos(5πu) cos(2πv) sin(2πt + α)`.

They have the same eigenvalue of the negative Laplacian, `29π²`. Brightness traces the instantaneous nodal set with a smooth rational band `I ∝ [1 + (F/w)²]⁻²`. A height proportional to the mode value is added to a gently undulating saddle embedding. The interference equation lives in the original square coordinates; the saddle is an artistic spatial display of that field, not a claim that the deformed surface shares the flat square's eigenfunctions.

This is an analytic field visualization, not sand dynamics or a physical bending-plate simulation. The cosine basis corresponds to an ideal square with Neumann boundary conditions. Deformation adjusts relief and contour thickness, not a false claim about physical stiffness.

## Harmonic

On the unit sphere, the real degree-three functions

`A = √105 xyz` and `B = (√7/2) (5z³ − 3z)`

are orthogonal and each has mean square one. Their common eigenvalue of the negative spherical Laplacian is 12. The mixture `Q = A cos(2πt + α) + B sin(2πt + α)` changes angular organization continuously while preserving sphere-average mean-square amplitude. A smooth magnitude maps its directions into lobed radial volumes:

`r = s ρ (√(Q² + δ²) − δ)`.

The final scale is `s = .41`; the deformation control varies `δ` from .15 to .06. Equal-area spherical directions prevent pole concentration. Thirteen nested radial layers, with `ρ` running approximately from .38 to 1, supply internal structure rather than latitude/longitude wires. A smooth radial visibility window suppresses the centre, and signed brightness distinguishes interpenetrating lobes. A changing oblique rotation makes the volumetric organization readable. This is a sculptural encoding of harmonic amplitude, not a quantum probability-density computation.

The second mode is the axisymmetric degree-three harmonic, producing axial lobes and an equatorial belt. Its homogeneous extension is `(√7/2)(2z³ − 3zx² − 3zy²)`, which is the form used in the mathematical validation helper.

## Technical properties

All time dependence uses integer temporal harmonics or smooth functions of them. The builders themselves therefore close in position, intensity, and derivatives; they do not depend on a wrapper forcing `t=1` back to zero. No randomness is generated during updates. Static arrays are allocated once, and every call returns the original supplied output buffer.

Gyroid's mesh is compiled once per module and reused across seeds/counts. Resonance and Harmonic require only scalar arithmetic and square roots per particle after precomputation. Their parameters and source are independent original constructions. Multiphase review led to brighter gyroid walls, stronger membrane relief, and harmonic lobes with thirteen nested radial layers in an enlarged, obliquely turning composition.

## Numerical checks performed

A direct builder check (without an outer phase wrapper) compared phases zero and one and found zero Float32 difference for all three. Central finite-difference velocities at zero and one also agreed exactly at a normalized phase step of .0005. Revisiting a frame after another phase and deformation value returned the identical data. Each builder returned the original output array throughout.

At 60,000 samples, 24 phases and three deformation levels produced only finite coordinates and intensities in `[0,1]`. After visual refinement, observed maximum world radii were 1.139 for Gyroid, 1.238 for Resonance, and 1.053 for Harmonic. With the default camera projections, maximum absolute screen coordinates were .831, .819, and .685 respectively, where the image edge is 1. These are sampled bounds, not an analytic guarantee for every possible camera setting. Indicative single-machine update times were .39 ms, .20 ms, and 1.35 ms respectively; these measure geometry updates, not GPU drawing or physical mobile performance.

For 12,000 sampled points on the undeformed gyroid scaffold, the trigonometric nodal residual had RMS .00346 and maximum .01169. This quantifies the finite-grid approximation rather than claiming an exact implicit solution.

The mathematical labels can also be checked directly. The square modes have zero normal derivative at all four boundaries and Laplacian eigenvalue `−(2² + 5²)π²`. Both cubic polynomials have zero Euclidean Laplacian; their restrictions to the unit sphere therefore have spherical-Laplacian eigenvalue `−3(3+1)`. The displayed normalization uses the sphere-average inner product, so it has mean square one rather than integral square one.

The eight tests in `tests/fields.test.mjs` check these claims, the gyroid's cyclic sampling symmetry, and default-camera framing across the loop and deformation range. They also test the steep Resonance intensity bands with genuinely separate one-sided velocity estimates: their disagreement halves as the first-order step halves, and second-order one-sided stencils agree below .02 at step .00005. A large fixed-step first-order discrepancy here measures curvature bias rather than a seam cusp.

## Temporal image quality

The frozen studies were rendered at 900 pixels with 360,000 particles, 30 fps timing and a .65-frame centred shutter, comparing 8 and 16 temporal samples. For each scene, the test chose the largest visibility-weighted geometry and intensity displacement among 32 candidate phases. The differences below are absolute RGB byte differences after tone mapping, on a 0–255 scale:

| Study | Selected phase | Mean difference | 99th percentile |
| --- | ---: | ---: | ---: |
| Gyroid | .5 | .072 | 1 |
| Resonance | .09375 | .049 | 1 |
| Harmonic | .1875 | .073 | 2 |

Visual comparison showed no meaningful contour doubling or discontinuous shutter trails at these phases. Resonance contained a few localized changes on its brightest thin contours: 14 of 810,000 pixels differed by more than 16 levels in any channel. Fine granular structure in Gyroid and Harmonic persisted at 16 samples, as expected from their spatial sampling. These selected-phase comparisons support the chosen temporal settings; they are not a bound over every frame, resolution or parameter choice. The complete 14-study measurements and capture settings are in `output/qa/sampling-quality.json` and `output/qa/sampling/parameters.json`.

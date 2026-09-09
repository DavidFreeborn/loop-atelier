# Collection 04: mathematical field studies

Three original RGB materials in `src/shaders-mathematics-04.js`. Each evaluates an arbitrary frame from `uPhase`, `uVariation` and `uSeed`, returns nonnegative linear radiance, and closes after 12 seconds. There is no feedback buffer or stored simulation state. The equations supply the geometry; the composition, engraving, palette and motion paths are original design choices.

## Hyperbolic

The underlying geometry is the regular `{7,3}` tiling: seven sides per heptagon, three heptagons at each vertex. Put

\[
A=\pi/7,\quad B=\pi/3,\quad
D=\sqrt{\cos^2 B-\sin^2 A},\quad C=\cos B/D,\quad R=\sin A/D.
\]

The side circle has centre `(C,0)` and radius `R`; `C²−R²=1` makes it orthogonal to the unit circle. Its inversion `z ↦ C + R²(z−C)/|z−C|²` is a hyperbolic reflection. These parameters and the regular-polygon construction are grounded in [Steve Trettel’s derivation](https://stevejtrettel.site/notes/2026/regular-polygons-disk-model/).

**The fundamental chamber is a triangle, not the whole heptagon.** Each iteration folds the angle into `[0,π/7]` using a multiple of `2π/7` and a reflection, then reflects in the side circle when necessary. The triangle has angles `π/7`, `π/2`, `π/3`. Its pairwise reflection products have orders 7, 2, 3; fourteen triangle chambers assemble one heptagon. This is why odd `q=3` is valid here. The shader does not assume the whole heptagon is a Coxeter chamber, assign a unique polygon-reflection word, or use reflection parity to color tiles.

The view moves by the exact disk automorphism

\[
M_a(z)=\frac{z-a}{1-\bar a z},\qquad
a(t)=(.38+.24v)(\cos 2\pi t,\;.72\sin 2\pi t).
\]

Seed changes the tiling’s orientation; variation changes the excursion. The heptagram engraving uses seven orthogonal-circle arcs through points on a small concentric circle. It is invariant under the same `D7` symmetry as the tile. Distance is measured hyperbolically before derivative-based antialiasing, so the small tiles retain the hierarchy of the large ones.

The mathematical tiling is infinite. A finite image resolves only finitely many tiles: the shader allows 36 circle reflections and filters detail near the ideal boundary. Its 36,000-point visible-disk audit needed at most 11. “Infinite depth” describes the model and its limiting structure, not infinitely many resolved pixels.

## Phason

This is a dual-pentagrid construction, replacing the preliminary Fourier contour treatment. Its mathematical basis is [N. G. de Bruijn’s original algebraic construction of Penrose tilings](https://pure.tue.nl/ws/files/4344195/597566.pdf). Define five physical directions and their internal-space counterparts:

\[
u_j=(\cos(2\pi j/5),\sin(2\pi j/5)),\qquad
v_j=(\cos(4\pi j/5),\sin(4\pi j/5)).
\]

The five line families obey `uⱼ·r + γⱼ = nⱼ`, where `γⱼ=vⱼ·w(t)` and

\[
w(t)=(.137,.091)+(.18+.35v)(\cos 2\pi t,\sin 2\pi t).
\]

The shifts satisfy `Σγⱼ=0` and are orthogonal to physical translations because `Σuⱼvⱼᵀ=0`. Moving through this two-dimensional internal space changes the combinatorics, rather than merely sliding a periodic pattern across the screen.

At the intersection of grid lines `i,j`, set the other three integers to `kₗ=ceil(uₗ·r+γₗ)`. The four dual vertices are

\[
X+\{0,u_i,u_j,u_i+u_j\},\qquad
X=n_i u_i+n_j u_j+\sum_{l\ne i,j}k_lu_l.
\]

These are exact rhombi of unit edge length, with acute angles 36° or 72° and areas in the golden ratio. For a regular pentagrid, hard acceptance gives a nonoverlapping Penrose rhombus tiling. Thin rhombi receive copper accents; thick rhombi receive ivory edges. The circular and diagonal engravings are decorative and are not claimed to be the arrow-matching rules or Ammann bars.

The shader finds nearby intersections directly. Since `Σuⱼuⱼᵀ=(5/2)I`, a dual tile differs from `(5/2)r` by a bounded projection error. For each grid direction,

\[
|n_i-(.4u_i\cdot x+\gamma_i)|\le 2\varphi/5\approx .647214<1.
\]

Only the floor and ceiling of that estimate can contribute: 40 intersections per pixel, rather than a large arbitrary search. The transition-window allowance raises the bound to less than `.713` before antialiasing, still below one. A wider CPU search independently verifies coverage.

**The animation is an optical interpolation of local flips.** At a singular grid configuration, exact tiling combinatorics change discontinuously. In a narrow internal-space neighborhood, the renderer crossfades neighboring integer choices while their rhombus vertices stay fixed. Products of smooth half-space weights are normalized by accepted pixel coverage. This prevents simultaneous flips from pumping the face brightness. Most tiles remain crisp; overlapping alternatives remain visible in the local transition patches. The intermediate image is not itself an exact tiling, nor is this a dynamical model of an atomic material. The half-width `.014` in internal-space distance gives a brief, resolved transition on the final 30 fps timeline; its duration depends on the trajectory’s crossing speed.

## Vortices

Six moving phase defects deform a real-field nodal network. The construction uses the phase-dislocation idea described by [J. F. Nye and M. V. Berry in *Dislocations in wave trains*](https://michaelberryphysics.wordpress.com/wp-content/uploads/2013/07/berry034.pdf), with original prescribed paths and display geometry.

\[
\Psi(z,t)=e^{i\phi(z,t)}\prod_{j=0}^2
\left[
\frac{(z-a_j(t))(\bar z-\bar b_j(t))}
{\sqrt{(|z-a_j(t)|^2+\epsilon^2)(|z-b_j(t)|^2+\epsilon^2)}}
\right]^3,\qquad\epsilon=.04.
\]

Each isolated `aⱼ` has charge `+3`; each isolated `bⱼ` has charge `−3`. The two triangular groups counter-rotate and change separation along smooth closed paths. Variation changes the negative group’s radius; seed changes the gentle viewing rotation. The saddle carrier is `φ=24(x²−y²)+8xy+2sin(2πt)`.

The main engraving follows `Re(Ψ)=0`; a weaker phase contour and small core rings distinguish the two charge groups. The analytic phase gradient,

\[
\nabla\arg\Psi=\nabla\phi+
3\sum_j\left[\frac{J(z-a_j)}{|z-a_j|^2}-\frac{J(z-b_j)}{|z-b_j|^2}\right],
\quad J(x,y)=(-y,x),
\]

controls contour width. This prevents broad pale bands near stationary points while preserving the nodal connections. Core denominators and the display amplitude are regularized. The complex factors define a phase field; no claim is made that these prescribed, higher-charge trajectories solve a wave equation or represent experimentally stable vortices.

## Validation and reproducible proofs

Run `node --test tests/mathematics-04.test.mjs`. Eleven checks cover:

- Hyperbolic metric invariance, orthogonal sides, reflection orders `(7,2,3)`, 36,000 terminating folds, and independent three-heptagon vertex coverage. A 720-point ring assigns exactly 240 points to each neighbor and matches the shader’s folded boundary distance.
- Phason orthogonality, zero-sum shifts, equal rhombus edges, the two acute angles, golden area ratio, and 1,100 control/position samples with unique hard-tiling coverage. The optimized search matches a four-times-wider reference. Repeated raw phases agree.
- Vortex loop and velocity closure, and winding-number measurements confirming the six signed charges.
- Actual GLSL with negative and greater-than-one phase uniforms, three variations and two seeds. This bypasses the public renderer’s time wrapping. All tested pixels have finite, nonnegative radiance below the shared HDR bound. Worst image-period MAE was `0.010638/255` for Hyperbolic, `0.000062/255` for Phason, and `0.001139/255` for Vortices. Identical seed/phase calls repeat exactly; changing either control has a visible effect.

`node tests/proof-mathematics-04.mjs` renders six 800 px stills per study. Add `--motion` for 120 frames covering the complete 12-second cycle at 480 px. `python tests/inspect-mathematics-04.py` encodes and decodes the motion proofs, produces 24-frame contact sheets, and measures every adjacent frame including the wrap. All files are under `output/qa/04-mathematics/`. These are bounded inspection proofs; the collection’s publication exports use the main rendering workflow.

The proof renderer explicitly uses full Chromium via `channel: 'chromium'`. These audits ran on the NVIDIA RTX 4070 Laptop GPU, with the shared HDR pipeline. The contact sheets were inspected over the complete cycle: the hyperbolic hierarchy remains legible, local rhombus changes retain the surrounding order, and the nodal braid changes connectivity without a special seam event. Mathematical correctness and sampled rendering checks do not replace viewing the final exported movies at their publication size.

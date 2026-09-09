# Collection 04: implicit geometry

These three original studies use the shared `artwork(vec2 p)` GLSL contract. They return nonnegative linear radiance; the renderer supplies exposure, tone mapping and sRGB conversion. They are analytic constructions evaluated directly at any phase, not simulations or reproductions of an artist's source code.

## Surgery

Let

\[
 F(x,y,z)=\sum_{i=1}^{3}(x_i^2-a)^2,
 \qquad a=0.40.
\]

The visible surface is `F = κa²`, where

\[
 \kappa(t)=1.42+(0.65+0.20v)\sin^3(2\pi t-0.45).
\]

The variation control is `v∈[0,1]`. A mild, periodic rigid orientation change reveals different openings without changing topology. The phase offset puts the studio's initial phase `.15` in the open-handle regime. Cubing the sinusoid spends more time in this five-handle interval while preserving the full level range and a smooth periodic timing function.

The derivative is `∂F/∂xᵢ = 4xᵢ(xᵢ²−a)`. Every critical coordinate is either zero or `±√a`. A critical point with `j` zero coordinates has level `ja²` and Morse index `j`, since the Hessian is diagonal with entries `12xᵢ²−4a`.

| Regular level | Boundary of the sublevel volume | Derivation |
| --- | --- | --- |
| `0 < κ < 1` | Eight spheres | Eight isolated minima give eight disjoint balls. |
| `1 < κ < 2` | One genus-five surface | Twelve index-one attachments join the eight minima along the cube graph; `g = E−V+1 = 12−8+1 = 5`. |
| `2 < κ < 3` | Two spheres, one inside the other | Six face attachments complete the cube's two-skeleton; its regular neighbourhood is a shell around an inner cavity. |
| `κ > 3` | One sphere | The final index-three attachment fills the cavity. |

The animation crosses levels 1 and 2, but does not reach level 3. At a critical level the surface is singular; topology cannot change through a family of entirely regular embedded surfaces. These events are real level-set surgery, not a rendered mesh being faded between shapes.

Rays are intersected directly with the quartic. The cubic derivative isolates monotone intervals, then 21 bisection steps find the first crossing. Moving the polynomial origin to the ray's closest approach reduces cancellation. The normal and Gaussian curvature come from the analytic gradient and diagonal Hessian. Blue saddle regions therefore have geometric meaning. A finite radial normal is used only where the gradient vanishes at a singular event; a unique smooth normal does not exist there.

An independent marching-tetrahedra test verifies the boundary component counts and Euler characteristics at `κ=.6,1.4,2.3,3.3`: respectively `(8,16)`, `(1,−8)`, `(2,4)`, `(1,2)`. Every mesh edge is also checked to belong to two faces. The critical-point derivation, not the appearance of a picture, establishes the genus claim. Historically, this polynomial belongs to the octahedrally symmetric quartic family studied by [Goursat (1887)](https://www.numdam.org/articles/10.24033/asens.299/); the construction and analysis above are independently derived.

## Laguerre

Nineteen seeded sites form a moving power diagram. Its cells are

\[
 C_i=\{x:P_i(x)\le P_j(x)\text{ for all }j\},
 \qquad P_i(x)=\lVert x-s_i\rVert^2-w_i.
\]

The sites make small periodic motions while the weights change more substantially. A weight moves all that site's bisector planes, rather than merely changing a drawn cell's colour or radius. This is the power-distance convention documented by [CGAL's regular-neighbour manual](https://doc.cgal.org/latest/Interpolation/index.html). In general a weighted site's cell can disappear; the artwork does not claim to preserve every cell or its adjacency throughout the loop.

If `i` wins at `x`, its exact clearance to the cell boundary is

\[
 d(x,\partial C_i)=\min_{j\ne i}
 \frac{P_j(x)-P_i(x)}{2\lVert s_j-s_i\rVert}.
\]

The numerator is affine in `x`; dividing by the normal length gives signed distance to that bisector plane. The minimum is the distance from an interior point of a convex cell to its boundary. A fixed offset thickens these boundaries into walls. The walls and an outer spherical shell are clipped by a moving dihedral wedge. Retaining part of the shell gives a clear depth reference. Copper denotes freshly exposed section faces, while the inner walls and outer shell use different materials.

The diagram and planes are exact analytic geometry. Wall thickness, the shell, section wedge and lighting are deliberate presentation choices. Analytic normals come directly from the winning bisector, cutting plane or sphere; a CSG branch chooses the normal where corners have no unique normal. This avoids inventing a thin reflective bevel through finite-difference averaging. The cells are not presented as smooth surfaces or a material stress simulation.

Shadow visibility also exploits the cell geometry directly. A chamber is the winning convex cell eroded by wall thickness and intersected with the inner sphere. Dividing each positive face clearance by its closing speed along a ray gives the next possible wall hit; the sphere gives the remaining candidate. The retained cutaway volume is a sphere intersected with the union of two halfspaces, so testing the two clipped ray intervals answers visibility without a marching budget. This removes the false light leaks that can arise when a grazing distance-march takes too many small steps beside a flat wall.

## Milnor

Inverse stereographic projection maps a point `p=(x,y,z)` into the unit three-sphere:

\[
 (z_1,z_2)=\left(
 \frac{2(x+iy)}{1+\lVert p\rVert^2},
 \frac{2z+i(\lVert p\rVert^2-1)}{1+\lVert p\rVert^2}
 \right).
\]

Use `f=z₁²+cz₂³`, where `c=.85+.30v>0`. Three argument levels `arg f = θ(t)+2πj/3`, `j=0,1,2`, select three pages of its open book. The common binding is `f=0`. The framework is the polynomial fibration studied by [Milnor, *Singular Points of Complex Hypersurfaces*, §§4–5 and 9–10](https://www.degruyterbrill.com/document/doi/10.1515/9781400881819/html?lang=en).

The binding can also be checked directly. Choose positive radii with `r₁²+r₂²=1` and `r₁²=cr₂³`. Then

\[
 z_1=r_1e^{3is},\qquad
 z_2=r_2e^{i(2s+\pi/3)}
\]

satisfies `f=0`: its phases wind three and two times around the two factors of a Clifford torus. The binding is a `(3,2)` torus knot, a trefoil. The argument changes while this binding remains fixed in the geometric coordinates; the camera also rocks slightly. The three material colours identify pages as they exchange positions.

The shader displays finite *level bands*, not exact zero-thickness pages or constant Euclidean thickness. Each band satisfies `|Im(e⁻ⁱθf)|≤ε` and `Re(e⁻ⁱθf)≥0`. A small `|f|` tube emphasises the binding, and a radius-1.62 sphere crops the unbounded stereographic view. **The crop can truncate both pages and binding; the full trefoil and the complete Seifert surfaces need not be visible in a frame.** The displayed cropped solid is not itself asserted to have the topology of an uncut page.

Tracing uses a conservative clearance bound. The polynomial has Lipschitz bound `L=3 max(1,c)` on the unit four-ball. Stereographic chord lengths satisfy

\[
 |q(p)-q(x)|=\frac{2|p-x|}{\sqrt{(1+|p|^2)(1+|x|^2)}}.
\]

For a positive polynomial-band clearance `D`, the safe world-space step is `D(1+r²)/(2L+Dr)`. Lighting uses bounded point-light visibility rays. A conventional soft-shadow heuristic was rejected because applying it to a conservative distance bound introduced false ripples that are absent from the surface itself.

## Verification and limits

`node --test tests/geometry-04.test.mjs` verifies the critical levels and Morse indices, independently meshes the four topology regimes, checks normalized power-bisector distances and exact chamber ray exits, checks the stereographic unit-sphere identity, samples the trefoil binding equation, and checks analytic framing bounds.

`node tests/numeric-geometry-04.mjs` runs directly against raw RGBA32F buffers without the shared renderer's clamping or phase wrapping. On full Chromium 149.0.7827.55 with NVIDIA RTX 4070 Laptop GPU / ANGLE D3D11, 108 seeded/variation configurations had finite nonnegative radiance and exact raw equality at `t` and `t+1` for four binary-exact phases. A 512-step reference found no missed geometry at the six checked phases. Milnor matched that reference exactly; Laguerre's largest remaining linear difference was below .0055 in a tiny dark region. This is bounded numerical verification, not a claim of exact floating-point arithmetic or testing every possible parameter.

The final analytic Laguerre visibility query was also compared with an independent 2,048-step shadow march: four phases agreed exactly; two phases each differed at one tangent-threshold pixel, with a largest mean linear difference of .0000303. A 512-step shadow reference matched Milnor exactly at all six phases. Those comparisons distinguish mathematical ray intersections from the finite hit tolerances of a marcher.

`node tests/proof-geometry-04.mjs --size=1000 --samples=4` writes six-phase proofs; `--motion --size=420 --samples=1` writes a 48-frame loop. All three compositions have analytic bounding spheres that remain within 76% of the square frame's half-width, throughout the loop. No earlier frame, warm-up, feedback texture or particle history is required.

The ray budgets are upper limits with early exit: Surgery uses direct root isolation; Laguerre uses at most 180 primary steps, Milnor 240. Geometry is evaluated only after analytic bounding-sphere entry. Surgery and Laguerre have direct intersection queries for shadows. A Milnor shadow ray that exhausts its bounded search is conservatively shadowed rather than treated as proven visible. Point-light occlusion, restrained materials and ambient occlusion provide depth without adding a floor, plinth, labels or decorative overlays.

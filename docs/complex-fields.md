# Monodromy and Caustic

Two original full-frame shader studies for Collection 03, implemented in `src/shaders-fields.js`. They supply nonnegative linear radiance to the common renderer. Their palettes, compositions, control paths and implementations are original; no artist or third-party shader code is included.

## Monodromy

The degree-five polynomial factors as

`P(z,t) = A(z,t)B(z,t)`, with `A=(z−c)³−a` and `B=(z−d)²−b`.

The derivative is `P′=3(z−c)²B+2(z−d)A`. Starting from each image position, the shader applies 28 Newton steps, `z←z−P/P′`. Newton iteration and its complex basin structure are established mathematics; the particular coefficient loop and visual encoding are original. For mathematical context, see Dierk Schleicher's research on [Newton dynamics for complex polynomials](https://arxiv.org/abs/1108.5773).

The argument of `a(t)` increases by one turn per loop; the argument of `b(t)` decreases by one. Their strictly positive magnitudes and the two factor centres vary periodically. Consequently the three cubic roots undergo a cyclic permutation and the two quadratic roots exchange, while the polynomial itself closes. The palette depends on the regularized final root direction `z/√(|z|²+.15²)`, so it avoids both relabelling jumps and the angular singularity of a root passing through the origin. A smooth accumulated orbit effort generates the engraved contours; the colors are an editorial encoding, not a physical quantity.

This is a bounded rendering of Newton dynamics. Iterations stop moving near residual `1e−8`; the complex division denominator is floored at `1e−24`, and far orbits are capped at radius 1000 to stay within Float32 range near singular poles. Unconverged pixels use their final iterate's regularized direction. A smooth effort cutoff between residuals `1e−5` and `1e−3` prevents accumulated Float32 residue after convergence from creating false contour noise. Derivative-filtered engraving suppresses subpixel contour frequencies, but fractal basin boundaries still require the shared renderer's spatial and temporal supersampling. Smooth coefficient loops do not imply every pixel remains differentiable as moving basin boundaries cross it.

## Caustic

The underlying quartic phase is

`Φ(s;X,Y) = s⁴/4 + Xs²/2 + Ys`.

Its stationary points solve `s³+Xs+Y=0`; coalescence occurs on `4X³+27Y²=0`, the cusp curve. This is the canonical cusp structure associated with the Pearcey integral, after coefficient scaling. [NIST DLMF §36.2](https://dlmf.nist.gov/36.2) defines the canonical quartic integral and its relation to cusp catastrophes.

The shader evaluates the deliberately finite-aperture field

`Ψ(X,Y)=∫[−1.7,1.7] w(s) exp(ikΦ) ds`, with `w(s)=(1+cos(πs/1.7))/2`.

It uses 256 midpoint nodes and a Hann aperture, with optical phase frequency `k` between 16 and 24; this is an apodized Pearcey-type integral, not an exact evaluation of the infinite-domain canonical Pearcey function. The control plane is bent through the periodic cubic map `W=1.35z³−(.55+.18cos τt)exp(.5i sin τt)z`, followed by componentwise compression `q=1.45tanh(.9W)`. Here the hyperbolic tangent acts separately on real and imaginary components, so the complete embedding is not a holomorphic map. This coordinate construction folds and braids the displayed preimages of two cusp fields; it is an artistic embedding, not a physical propagation claim.

The complex field is `Ψ₁+exp(iθ)Ψ₂`, with periodic relative phase and a spatial carrier `9qₓ−6qᵧ`. Its coherent intensity alone drives the light, permitting deep cancellation channels. Relative wave strength chooses between amber and blue; a high-intensity ivory contribution preserves luminous intersections. A documented power-law transfer controls display contrast. The final gain is reduced to retain central fringe detail. The finite aperture bounds spatial frequencies in the underlying wave field, while the nonlinear embedding and artistic transfer can introduce finer display structure; the shared supersampling handles reconstruction.

## Numerical checks

`tests/shaders-fields-quality.py` compares the final 256-node midpoint diffraction calculation with independent 512-node Gauss–Legendre quadrature across 51,984 wavefront controls, including the cubic embedding: 24 phases, three deformation values and a 19×19 image grid for each of the two fields. The maximum complex-amplitude difference was `7.48×10⁻⁷`, with RMS `5.50×10⁻⁸`. These CPU double-precision comparisons validate the quadrature choice over the sampled controls. The test applies the registry's recipe-seed-to-shader-uniform mapping.

The same script checks the polynomial's analytic roots, coefficient seam, one-sided coefficient velocities, and expected root permutations. Across 4,000 sampled phases at recipe seed 42 the closest pair of roots was approximately .0284 apart. This is an observed minimum, not a proof of a uniform separation for every seed. Neither study uses feedback, texture history or random changes between frames.

`tests/complex-shaders.test.mjs` compiles the actual GLSL, bypassing the public renderer's phase wrapping and invalid-value guards. Across 30 combinations per study it checks finite nonnegative radiance within the shared HDR limit, deterministic replay, and raw `t` versus `t+1` image agreement. Largest mean byte differences were .00888/255 for Monodromy and .000251/255 for Caustic. The test also bounds the fraction of large differences; fractal boundary pixels can amplify Float32 phase rounding without indicating a mathematical seam. The final cubic Caustic was visually reviewed at phases .15, .5 and .7 after gain reduction.

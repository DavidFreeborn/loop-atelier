# Three topology studies

These are independent analytical constructions for Loop Atelier. They use the same packed point buffer and renderer as the original six studies. Their geometry is evaluated directly at any phase; no preceding frames or simulation warm-up are required.

## Hopf — linked circles from a three-sphere

Write a point of the unit three-sphere as a pair of complex numbers:

\[
(z_1,z_2)=(\cos\eta\,e^{i(\psi+\phi)},\;\sin\eta\,e^{i\psi}).
\]

Holding \(\eta,\phi\) fixed and varying \(\psi\) produces one Hopf fibre. Before projection, a periodic unitary rotation mixes the complex coordinates:

\[
\begin{pmatrix}z'_1\\z'_2\end{pmatrix}
=\begin{pmatrix}\cos\beta&e^{i\gamma}\sin\beta\\-e^{-i\gamma}\sin\beta&\cos\beta\end{pmatrix}
\begin{pmatrix}z_1\\z_2\end{pmatrix},
\quad\beta=(0.15+0.24a)\sin2\pi t,\ \gamma=0.65\cos2\pi t+0.25\sin4\pi t.
\]

Here \(a\) is the variation control. This transformation commutes with the common complex phase, so it sends each Hopf fibre to another Hopf fibre. Stereographic projection gives

\[
P=s(t)\frac{(\Re z'_1,\Im z'_1,\Re z'_2)}{1-\Im z'_2},
\qquad s(t)=\frac{0.467}{1+5.4\beta^2}.
\]

Each displayed curve is an exact projected circle. Every pair of distinct fibres has linking number one up to orientation. Three separated latitude ranges and six azimuths produce eighteen bands, with eight nearby fibres per band. Periodic latitude changes and latitude-dependent azimuth shifts move the circles before the unitary rotation. The samples also travel once around each circle. The changing orientation in four dimensions makes some circles swell and others contract in the projection; the smooth common scale keeps the composition framed.

For rendering, the projected circle’s centre and two perpendicular radius vectors are derived analytically from the complex coefficients. The points are then spaced uniformly in Euclidean arc length. Uniform samples on the original three-sphere would be stretched apart near the projection pole; this exact reparameterization prevents dotted outer arcs at interactive particle counts. The circle frame uses the projected position and tangent at \(\psi=0\), so it remains smooth even when the second complex coefficient passes through zero.

This is a selected finite family, not a display of every fibre. Before mixing, the latitude ranges stay below 0.68 radians. The mixing angle is at most 0.39 radians, so no fibre reaches the projection pole; the denominator remains greater than 0.12 even under a conservative bound. The bands are made of nearby circles; they are not solid ribbons or physically simulated strings.

## Trefoil — a travelling weave around a knot

The centreline is a standard \((2,3)\) torus knot:

\[
C(u)=((R+r\cos3u)\cos2u,\;(R+r\cos3u)\sin2u,\;r\sin3u),
\quad R=0.535,\ r=0.235.
\]

The supporting torus supplies a smooth periodic unit normal

\[
N(u)=(\cos3u\cos2u,\;\cos3u\sin2u,\;\sin3u).
\]

With unit tangent \(T=C'/\|C'\|\), set \(B=T\times N\). The rendered filaments have the form

\[
P=C+[b(u,t)+a(u,t)\cos\theta]N+a(u,t)\sin\theta B,
\quad\theta=v+5u+2\pi t.
\]

Seven separated ranges of \(v\) form the seven cable bands. Small periodic changes in \(a\) and \(b\) make the twist travel along the knot. A rigid rotation with yaw \(0.65\sin2\pi t\), pitch \(0.22\cos2\pi t\), and roll \(0.14\sin4\pi t\) reveals the over-and-under crossings without changing the knot. The use of a torus normal avoids a numerical Frenet-frame flip. The centreline has trefoil knot type; the displayed fine strands form a more elaborate cable around it. Their individual knot or link types are not asserted. This is analytical geometry, not a mechanical rope model or a simulation of contact forces.

## Klein — a figure-eight immersion

Rotate a planar figure-eight cross-section by half the longitude:

\[
A+iB=e^{i(u/2+\delta(t))}(\sin v+i\kappa(t)\sin2v),
\qquad P=((R+A)\cos u,(R+A)\sin u,B).
\]

The implementation adds a positive width multiplier and gentle \(2\pi\)-periodic longitudinal changes in \(R\). These respect the reversed gluing

\[
P(u+2\pi,v,t)=P(u,-v,t).
\]

This is an immersion of the Klein bottle in three dimensions, **not an embedding**. Two sheets meet along the image of the cross-section’s crossing. The self-intersection is shown as a concentration of threads, not hidden or described as a physical connection between sheets. The Klein bottle is non-orientable; this does not mean an individual drawn curve has only one side.

To close each visible filament, longitude is sampled over \([0,4\pi)\) and the cross-section over \((0,\pi)\). Together these cover the same parameter quotient as the usual full cross-section and one longitude traversal. The half-twist and periodic section changes provide visible motion while preserving the gluing.

## Loop and rendering limits

All three studies use smooth integer-frequency temporal harmonics or smooth functions of them. Position and intensity agree at phases zero and one. A sequence should contain phases \(k/N\), for \(k=0,\ldots,N-1\); appending a duplicate endpoint makes the playback pause for one frame.

Depth is communicated by perspective, near/far light weighting, and the accumulation of projected filament density. Additive rendering does not perform opaque hidden-surface removal, so a crossing’s brightness is not a measurement of geometric curvature or a proof of topological linkage. The mathematical constructions determine the topology; the images make selected features visible.

The new module exports `TOPOLOGY_SCENES` and `TOPOLOGY_BUILDERS`. Each builder accepts `(count, random, data)` and returns `update(t, amount = 0.5)`, which overwrites and returns the supplied packed `Float32Array`.

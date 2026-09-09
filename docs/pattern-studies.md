# Pattern studies: Collection 03

These two works are original shader constructions. They use broad ink-and-paper structure, a single vermilion accent, and multiple scales of detail. They do not sample images, use an external texture, or reproduce another artist's source code. Each pixel is calculated directly from position, phase, variation, and seed; rendering never depends on a previous frame.

## Palimpsest

An off-centre aperture pulls an architectural print through itself. The material contains three families of rooms, thresholds, stairs, and hatching. Nested openings provide detail within a single cell; the logarithmic projection then repeats that hierarchy across the whole picture. The coloured apertures make the scale change easier to follow.

Let `z = p − (−.17,.065)`, `r = |z|`, `θ = atan2(z.y,z.x)`, `L = 1.72 ln(r)`, and `a = .20 + .45 variation`. The coordinates of the print are:

```
q.x = L − 3t
q.y = 6θ/(2π) − aL + 2t
```

The material repeats every three horizontal cells and every two vertical cells. Advancing phase by one changes `q` by `(−3,+2)`, which preserves the material exactly. The `atan2` branch changes `q.y` by six cells, also an exact material period. This is an image symmetry, not a claim that a particular doorway returns to the same physical scale. Following one feature corresponds to a combined logarithmic scale change and rotation.

The logarithm is evaluated at `max(r,.00001)`. A smooth central aperture hides the unresolved innermost scales. A narrow red ring establishes a deliberate endpoint to the visible hierarchy. Filtering grows with the reciprocal radius, so small inner cells soften before they become unstable pixels. The filter is computed from radius rather than from derivatives of the wrapped angle; the `atan2` branch must not introduce a false blur stripe.

Seed selects accent placement on the six-period material. Variation changes the shear of the logarithmic lattice. Neither affects the periodicity proof. The lattice motion is constant in logarithmic coordinates throughout the cycle.

## Switchboard

A hierarchy of paired circular tracks locks, releases, turns, and reconnects. The broadest tracks reverse the black-and-white ground. Smaller tracks form the main route network. Fixed port bearings and fine etched centres establish a third scale. Vermilion appears in channels while their mechanisms move.

Inside each square cell, the route motif consists of two radius-one-half circles centred at opposite corners. A half-turn exchanges those circles, so their union is invariant under rotation by π. Each cycle schedules two quarter-turns using the clamped quintic easing function:

```
E(x) = x³(6x² − 15x + 10),  x clamped to [0,1]
s = fract(t + offset − cellDelay)
α = (π/2) [orientation + E((s − .12)/.23) + E((s − .62)/.23)]
```

`orientation` is zero or one. Each movement interval takes 23% of the cycle; the remaining time provides rests. `E` has zero first and second derivatives at its endpoints. Cells receive deterministic spatial and grouped delays, creating travelling changes of order without a random state machine.

The contact fingers retract into a circular rotor while the tile turns. They return before the next locked state. This is deliberately a network that temporarily disconnects and reconnects, not a proof of connected paths during every intermediate image. Retraction also prevents arbitrary square clipping from dominating the turning shapes. Its gate and red activity envelope are identical at phase zero and one, with zero derivatives at the local cycle boundary. The half-turn motif symmetry therefore also preserves the complete shaded image, including the larger ground pattern.

## Rendering and validation

Both functions return nonnegative linear radiance. The common renderer accumulates spatial and temporal samples before applying its exponential tone map and sRGB output transfer. The shader's native palette is authored as part of the print; monochrome palette overrides remain available through the shared renderer.

`node --test tests/patterns.test.mjs` compiles and evaluates the actual GLSL in WebGL 2. It directly supplies **unwrapped** phases, including negative phases and values above one. The test compares `t` with `t+1` at five phases, three variation values, and two seeds; checking only the wrapped public capture API at zero and one would prove nothing. A separate shader inspection mode checks for invalid or out-of-range radiance. The test also checks deterministic rendering and that the intended dark, light, and accent regions remain present. Tiny edge differences caused by floating-point arithmetic are allowed; a structural mismatch is not.

For visual review, `node scripts/proof-03.mjs --stills palimpsest switchboard` captures six phases; omit `--stills` to capture sixty motion frames. The final loop omits the duplicated endpoint. These works require WebGL 2 and use no image or video input assets.

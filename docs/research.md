# Étienne Jacob: a practical research dossier

Research verified on 9 September 2026. This document separates statements made by the artist, observations of his originals, and our own design and engineering recommendations. The accompanying toolkit and examples are independent work inspired by general techniques; they are not Jacob animations, authorized reproductions, or an endorsement by him.

## The central finding

The transferable idea is **coherent geometry undergoing continuous, precisely organized change**. The monochrome palette makes that organization unusually legible. Texture, density, timing, and a carefully chosen camera do much of the work usually assigned to color or elaborate materials. Loop construction is part of the composition from the start.

That is our synthesis, not a quotation or a claim that every Jacob work follows one formula. His practice includes delicate curves, dense granular fields, geometric grids, recursive structures, and 3D surfaces. A toolkit limited to drifting white particles would miss most of this range.

## What the artist actually says

| Evidence | Finding | Consequence for this framework |
|---|---|---|
| [Current FAQ](https://bleuje.com/faq/) | Most animations were programmed in Processing's Java version; he also uses openFrameworks and sometimes GLSL. | The visual language is independent of a particular programming environment. |
| [About](https://bleuje.com/about/) | Almost all animations are made under a 5 MB GIF constraint, and he values work that can be enjoyed without its explanatory story. | Concision, visual economy, and immediate readability belong in the brief. Our high resolution masters need not imitate the historical file limit. |
| [2020 first-person interview](https://www.generativehut.com/post/interview-with-etienne-jacob) | He describes a largely monochrome, perfectly looping practice; black backgrounds can dissolve into the surrounding page. He combines existing ideas, tunes many parameters, and favors the visual result. He explains depth through surface marks that change size and density with distance. | Curate a small grammar, then invest in parameters, framing, and texture. Keep artwork and explanatory interface visually distinct. |
| [Periodic function tutorial](https://bleuje.com/tutorial2/) | A periodic change plus a spatial offset generates propagation. Offset can depend on radius, position, angle, or noise. | A phase-field abstraction can support many scenes. |
| [Replacement tutorial](https://bleuje.com/tutorial4/) | He identifies queues of objects taking their neighbors' states as probably his most-used loop technique. | Replacement must be a first-class primitive, alongside oscillation. |
| [Noise tutorial](https://bleuje.com/tutorial3/) | Circular traversal through noise creates a repeating smooth random function. Extra dimensions introduce spatial variation. He cautions that the exact advanced propagation example is not something he uses particularly often. | Do not equate the entire style with 4D noise. |
| [Motion blur tutorial](https://bleuje.com/tutorial6/) | His recurring Processing template comes from Dave Whyte / beesandbombs. Frames average several nearby time samples. | Treat temporal supersampling as a reusable renderer feature. Credit the method's source. |

The interview dates to August 2020 and describes that period. The current FAQ is the better source for his current software list. In particular, the older interview's description of working without advanced lighting should not become a claim that he never uses lighting: his later [Sinusoids packing repository notes](https://github.com/Bleuje/processing-animations-code/tree/main/code/sinusoidspacking) explicitly identify normal-based lighting.

## Visual study of original animations

The following original GIFs were viewed directly in a browser. These are qualitative observations, not reverse engineering claims. The source artwork is linked rather than bundled into the project.

| Original reference | Observed visual structure | Transferable question |
|---|---|---|
| [Holeturn / contrast hole, shown in the replacement tutorial](https://bleuje.com/tutorial4/) ([original GIF](https://animation-files.bleuje.com/2019/2019_5_constrasthole.gif)) | An oblique funnel is described by white dashes. Long foreground streaks and small compressed background marks establish depth. A curved dark void gives the image a strong center. The marks follow the surface rather than floating arbitrarily. | Can the motion of the marks reveal the surface without a wireframe or outline? |
| [Spirals sphere](https://bleuje.com/gifanimationsite/single/spiralssphere/) | A fine strand changes between sparse looping contours and denser coils. Large black margins preserve the silhouette; brightness differences distinguish portions of the strand. Several phases were inspected. | Does the object have clear, different silhouettes through its cycle? |
| [Noise propagation tutorial result](https://bleuje.com/tutorial3/) | Dense small points form irregular concentric compression ridges. Bright bands emerge from local concentration, with a quieter grey mesh between them. It reads as a continuous material despite being drawn as many marks. | Can a density gradient produce the highlight instead of added glow? |
| [Moore curve queue](https://bleuje.com/gifanimationsite/single/moorecurvequeue/) | Thin orthogonal paths and outlined circles form an almost full-frame pattern. Occasional filled white points punctuate the field. The hierarchy remains legible despite repetition. | Can topology and a small set of mark types do the work of elaborate decoration? |
| [Sinusoids packing](https://bleuje.com/gifanimationsite/single/sinusoidspacking/) | Differently sized circular regions carry rhythmic dotted contours. Several size scales coexist within a single coherent mass; the outline and internal voids are readable. | Is there a hierarchy of large, medium, and small forms, with enough dark space to separate them? |
| [2D fractal sliding squares](https://bleuje.com/gifanimationsite/single/2dfractalslidingsquares/) | Large quiet rectangles coexist with increasingly fine subdivisions, bright points, and momentary blurred traces. The main scaffold stays visible across scale changes. | Can recursive detail enrich a simple scaffold without making every region equally busy? |

The latter three widen the reference set beyond the frequently imitated particle-and-vortex examples. Their documented techniques include [replacement and Hilbert curves](https://github.com/Bleuje/processing-animations-code/tree/main/code/moorecurvequeue), [circle packing and normal-based lighting](https://github.com/Bleuje/processing-animations-code/tree/main/code/sinusoidspacking), and [recursion, a tree structure, and fractal zoom](https://github.com/Bleuje/processing-animations-code/tree/main/code/fractalsliding2d). The fractal piece was made for a collaboration with Yann Le Gall, which should remain part of its attribution.

## A reusable mathematical grammar

The equations below are independently expressed implementation guidance. They develop the general methods explained in the linked tutorials, rather than reproduce source code.

### 1. Continuous, normalized time

Let a frame be a pure function of phase:

```text
image = render(scene, seed, parameters, t),    0 ≤ t < 1
wrap(t) = t − floor(t)
```

The same inputs should produce the same frame, independent of call order. Construct seeded variation before drawing; do not draw fresh random values each frame. Continuous time permits scrubbing, export at any frame rate, and motion blur.

For an N-frame loop, render `t = 0/N, 1/N, …, (N−1)/N`. Do not append the frame at `t=1`; that duplicates the start and can create a perceptible pause. A looping animation's last stored frame is usually **not** identical to its first: it is one normal time step earlier. Compare `render(0)` and `render(1)` for endpoint identity, and compare the last-to-first transition with ordinary adjacent transitions for motion continuity.

### 2. Propagation by phase

Following the construction in the [periodic-function tutorial](https://bleuje.com/tutorial2/), choose a one-periodic function `F`, an offset `φ(x)`, and a visible property `q`:

```text
q(x,t) = F(t − φ(x))
```

Some useful phase fields are:

| Phase field | Result |
|---|---|
| `φ(x,y) = ax + by` | Plane wave |
| `φ(x,y) = k √(x²+y²)` | Outward or inward concentric wave |
| `φ(x,y) = kr + m atan2(y,x)/(2π)` | Spiral wave |
| `φ(s) = as + bs³` | Propagation whose apparent speed varies along a path |

For a spiral, integer `m` makes the angular branch cut agree modulo a full cycle. A smoothly varying phase field produces organized motion; independent random phases can instead dissolve the organization. A periodic function need not be sinusoidal: a smooth periodic pulse or Fourier sum can change the character while preserving the loop.

### 3. Smooth repeating variation

Jacob's [noise tutorial](https://bleuje.com/tutorial3/) uses a circle in noise space. An independently expressed field is:

```text
θ(x,y,t) = 2π(t − φ(x,y))
D(x,y,t) = N4(sx, sy, r cos θ, r sin θ)
```

Time consumes two coordinates because a circle closes. `s` controls spatial variation; `r` controls how much of noise space is traversed in a loop. Two independently seeded fields can control two displacement axes. Closure follows because sine and cosine agree after one revolution. Smoothness at the seam follows from the periodic inputs, assuming the noise evaluator is smooth enough.

A harmonic field is another independent option:

```text
D(x,t) = Σ a_j(x) sin(2π n_j t + b_j(x)),   n_j ∈ integers
```

It is inexpensive and exactly periodic, but should be described as harmonic variation rather than OpenSimplex noise. Avoid turning a nonperiodic time axis into a loop merely by applying modulo: the values on either side of the wrap can disagree.

### 4. Replacement rather than return

An object need not return to its starting position. The **collection of rendered objects** must return to the same visible state. For a closed parameterized route `P`, consider:

```text
p_i(t) = wrap((i+t)/K),  i = 0…K−1
position_i(t) = P(p_i(t))
```

After one cycle, index `i` occupies the next object's former parameter value. This is the general queue method explained in [Replacement technique](https://bleuje.com/tutorial4/). For an open route, the incoming and outgoing marks must become invisible at the boundaries or pass beyond the crop. Use an endpoint envelope that reaches zero smoothly.

**A subtle implementation constraint:** all visible properties must participate in the replacement. If an index carries its own arbitrary permanent color, radius, or brightness, it may occupy the neighbor's position with the wrong appearance at the seam. Define appearance from the continuous route coordinate, repeat the full attribute pattern consistently, or replace a whole seeded queue. Position closure alone is insufficient.

### 5. Replacement on a surface

The [2D-grid tutorial](https://bleuje.com/tutorial5/) extends queues to repeated elements and uses delayed transformations, randomized delays, and easing. An abstract grid can map to a curved surface: the grid need not look rectangular in the image.

Our design application is to split the system into three functions: `surface(u,v)`, `phase(u,v,t)`, and `mark(u,v,t)`. This allows a cylindrical skin, folded sheet, toroidal passage, or topographic field to share an animation mechanism. If one grid direction advances, make its texture and attributes close under the same replacement. Use an oblique view only when it improves understanding of the surface.

### 6. Precomputed trajectories

In [Drawing on paths computed by steps/simulation](https://bleuje.com/tutorial7/), Jacob separates simulation from drawing: store sampled positions once, then interpolate them at arbitrary continuous time. The tutorial also combines such paths with replacement and illustrates fading at route boundaries.

Our implementation recommendation is to store both positions and cumulative arc lengths. Interpolation by index preserves the simulated time law; interpolation by arc length produces approximately constant travel speed. Those are different artistic choices. Tangents can orient short dashes; a smoothed tangent can avoid abrupt rotation at sampled corners. A precomputed route is not automatically a loop: it still requires closure or a replacement strategy.

### 7. Temporal supersampling

Following the principle in the [beesandbombs template explanation](https://bleuje.com/tutorial6/), render several exposures around each frame time and average them. One centered midpoint quadrature is:

```text
t(k,s) = wrap((k + shutter * ((s+0.5)/S − 0.5))/N)
frame[k] = (1/S) Σ render(t(k,s)),     s = 0…S−1
```

`S` controls sample count. `shutter` is exposure duration as a fraction of one frame interval, not degrees in this notation. Values above one overlap neighboring frame intervals. Reset the canvas and transforms before every sample.

Our quality recommendation is to evaluate accumulation color space deliberately. Averaging linear-light values is physically meaningful; averaging encoded grayscale yields a different, often darker graphic result. Record the chosen convention. Temporal supersampling and spatial antialiasing solve different problems. A soft CSS filter or a trail of partially cleared previous frames is not a substitute for controlled exposure integration.

## Why the images work: a design synthesis

These principles are our conclusions from the study, not universal rules or claims made by Jacob.

1. **The large form survives the detail.** First make a convincing silhouette or field of motion with few marks. Add detail only while that structure remains clear at thumbnail size.
2. **Every mark explains something.** A point locates a surface; a dash states a tangent; a gap reveals depth; a band exposes compression. Remove marks that contribute only generic busyness.
3. **Randomness is subordinated to structure.** Vary spacing, delay, width, or curvature within an organized family. Seeded variation supplies material richness while shared geometry supplies recognition.
4. **Motion has a hierarchy.** Give the eye a dominant direction or transformation. Small variations enrich that action. Several equally strong motions can obscure the premise.
5. **Black is active space.** Dark regions shape the object and separate layers. A completely filled luminous mass loses the precise edge relationships that make monochrome work compelling.
6. **Highlights are scarce.** Preserve a range from dim structure to concentrated bright accents. Raising opacity everywhere often makes depth worse.
7. **A loop feels inevitable.** A well-designed cycle has no visible reset and no phase that looks like an accidental intermediate state. Some loops make motion seem endless; others make transformation feel cyclic. Choose intentionally.
8. **Restraint makes revisions visible.** With a limited palette and grammar, a small change in camera angle, density, or phase becomes meaningful. Parameter curation is part of authorship.

## Practical recipes for original work

These are design starting points, not reconstructions of the originals listed above.

| Recipe | Construction | Artistic controls | Common failure and repair |
|---|---|---|---|
| Breathing shell | A closed family of curves on a sphere or other manifold; integer temporal harmonics deform radius or latitude. | Tilt, curve count, separation, wave order, deformation amplitude. | If the shell becomes a wire ball, reduce back-layer brightness and emphasize a few moving ridges. |
| Folded passage | A new parametric funnel or ribbon carries replacement queues of short dashes. | Camera, taper, twist, dash length, queue spacing, depth contrast. | If the vanishing region becomes a white knot, cull subpixel marks or reduce opacity as projected density increases. |
| Phase cloth | A regular point field displaced by a smooth periodic vector field with a radial or oblique offset. | Displacement scale, spatial frequency, grain, phase gradient. | If it becomes static noise, restore a simple phase field and reduce the highest frequencies. |
| Traveling filaments | Several closed analytic curves or precomputed flow routes carry identical replacement packets. | Route geometry, packet length, speed distribution, mark taper. | If crossings are ambiguous, separate brightness levels or alter projection before adding effects. |
| Recursive mechanism | A spatial subdivision uses coordinated transformations at successive levels. | Scale ratio, depth, onset delays, filled-to-outline balance. | If all scales compete, reserve solid marks for one scale and impose a minimum projected size. |

A useful preset contains a fixed seed, geometry parameters, timing parameters, camera, tonal settings, and export settings. Do not call a random seed a curated preset until the entire cycle has been reviewed.

## A framework that remains easy to extend

The research suggests this separation of responsibilities:

```text
seed + composition parameters
          ↓
geometry / cached trajectories
          ↓
periodic phase or replacement queue
          ↓
marks + projection + tonal hierarchy
          ↓
render at arbitrary t
          ↓
preview OR sampled export
```

The render function should not depend on wall-clock timing or previous draw calls. The playback controller may translate elapsed seconds into phase, but the scene should accept phase directly. Keep seed and parameters serializable so an interesting result can be reproduced. Restrict interactive controls to quantities whose visible effect is understandable; place advanced sampling choices in export controls or documentation.

For performance, cache time-independent positions, random values, and route samples. Estimate projected mark sizes and skip work that cannot survive the intended display resolution. Begin with low sample counts for interaction, then render a deterministic offline master. Reuse memory rather than allocate thousands of objects per frame. Profile the slowest composition, not only the sparse one.

## Publication and verification standard

This is our proposed acceptance standard. Passing numerical checks supports technical correctness; a separate visual review establishes artistic readiness.

| Check | Evidence to retain | What it catches |
|---|---|---|
| Deterministic rendering | Same seed, settings, and phase render identically when revisited in a different order. | Hidden frame history and changing random state. |
| Mathematical closure | Compare scene state or unwrapped endpoint renders at `t=0` and `t=1`. Do not let a wrapper that forcibly maps both to zero make this the only test. | Nonperiodic attributes and incorrect noise time inputs. |
| Seam transition | Render phases just before and after the wrap; compare their movement with ordinary adjacent phases. | Replacement attribute jumps, tangent discontinuities, and visible reset. |
| Whole-cycle review | A contact sheet at evenly spaced phases, plus playback over several repeats. | Good hero frame but weak intermediate compositions. |
| Motion sampling | Compare representative fast-motion frames at doubled sample count. | Temporal banding or multiple discrete copies in the blur. |
| Spatial sampling | Inspect the actual output at 100% and its intended display size. | Broken hairlines, moiré, oversharpened or disappearing texture. |
| Tonal structure | Check sparse and dense phases on black and in the final surrounding page. | Crushed subtle detail, clipped white clusters, exposed square boundary. |
| Export validity | Record dimensions, frame count, frame rate, duration, format, and file size. Decode and inspect the delivered file. | Incorrect timing, missing frames, truncation, and encoder artifacts. |
| Responsive presentation | Inspect desktop and narrow viewport; verify usable controls and readable text. | Cropping, obstructed art, or controls that cannot be operated. |
| Motion accessibility | Supply pause/scrub and honor reduced-motion preference in the gallery. | Unavoidable movement in the presentation. |

The artist's [FAQ](https://bleuje.com/faq/) distinguishes mathematically seamless animation from media playback: MP4 playback may introduce a small pause on repeat, while GIF can be smoother at the expense of larger files. Therefore inspect the actual delivery route. Keep a lossless frame or still master where practical, use video for efficient playback, and test the final player rather than infer quality from the source renderer.

Suggested iteration order: **structure → motion → framing → tone → density → sampling → packaging**. Raising resolution before the first five decisions are convincing usually makes an unconvincing composition more expensive to render.

## Attribution and source boundaries

The [Processing animations repository](https://github.com/Bleuje/processing-animations-code#acknowledgments-and-licensing) is public for study, but its notice generally reserves rights in Jacob's sketch source and asks users to contact him before reusing it. It separately acknowledges permission for Dave Whyte's motion blur template. Accordingly, this project uses independently implemented mathematics and new compositions. It does not redistribute Jacob's source or animation files.

If a future extension imports a noise implementation, inspect that implementation's own license and retain its notices. Jacob's updated noise link points to [KdotJPG/OpenSimplex2](https://github.com/KdotJPG/OpenSimplex2), which states that most files use CC0 and some marked files use the Unlicense. That is a separate source boundary from Jacob's artwork and sketches. A link to an implementation is not evidence that this toolkit includes or uses it.

Suggested credit for publishing new work from this framework:

> Original generative animation made with this toolkit. Technique research informed by Étienne Jacob's loop tutorials and Dave Whyte's temporal supersampling approach.

Add the actual creator's name and link to the toolkit. Do not present the new work as an Étienne Jacob original. If a specific original animation or sketch is later licensed for use, document that separately with the exact scope.

## Verified reading path

1. [Étienne Jacob / bleuje: about the artist](https://bleuje.com/about/).
2. [FAQ: software, viewing formats, and use of originals](https://bleuje.com/faq/).
3. [Tutorial index](https://bleuje.com/tutorials/).
4. [Periodic function and offset, 28 November 2020](https://bleuje.com/tutorial2/).
5. [Noise loop and propagation, 28 November 2020](https://bleuje.com/tutorial3/).
6. [Replacement technique, 28 November 2020](https://bleuje.com/tutorial4/).
7. [Replacement on a 2D grid, 4 September 2021](https://bleuje.com/tutorial5/).
8. [Motion blur template, 7 January 2023](https://bleuje.com/tutorial6/).
9. [Drawing on computed paths, 7 January 2023](https://bleuje.com/tutorial7/).
10. [Commented Processing animation source and reuse notice](https://github.com/Bleuje/processing-animations-code).
11. [First-person interview, 15 August 2020](https://www.generativehut.com/post/interview-with-etienne-jacob).
12. [OpenSimplex2 source and licensing](https://github.com/KdotJPG/OpenSimplex2).

The [older necessary-disorder blog](https://necessarydisorder.wordpress.com/) remains useful historical context, but its June 2022 notice directs readers to the newer maintained site. The current tutorials above are the main technical references for this project.

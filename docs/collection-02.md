# Collection 02 — eight unfamiliar worlds

Eight original compositions extend the same deterministic renderer into topology, interference, implicit geometry, and recursive motion. Open `output/loop-atelier.html` and choose **New studies**. The original six remain under **Originals**. Every new study supports the existing phase, deformation, seed, density, exposure, palette, recipe, and still-export controls.

| Study | Mathematical construction | Watch for |
|---|---|---|
| **Hopf** | Selected circles of the Hopf fibration on the three-sphere, stereographically projected into three-dimensional space | Linked bands gathering around a dark aperture; every displayed fibre is a circle |
| **Trefoil** | Seven cable bands around a genuine (2,3) torus-knot centreline | The travelling weave and the three lobes passing over and under one another |
| **Klein** | A figure-eight immersion with reversed parameter gluing | A folded wall passing through itself; the apparent surface cannot be embedded in ordinary three-dimensional space without intersections |
| **Gyroid** | A triangulated approximation to a trigonometric nodal surface, with a delayed normal wave | Open tunnels through a translucent, connected labyrinth |
| **Resonance** | Two degenerate square Neumann modes mixed in quadrature | The zero contours exchanging their arrangement as phase changes |
| **Harmonic** | Two real degree-three spherical harmonics mixed continuously and mapped to radial lobes | Angular lobes changing organization while remaining part of the same harmonic eigenspace |
| **Descent** | Identical galleries arranged at logarithmically spaced scales | A recursive passage that seems to expand forever; the complete image closes by exchanging identical layers |
| **Confluence** | A closed ribbon braid transformed by six periodic sine shears | Two scrolls stretching, folding, and changing their crossing through space |

## What makes these loops work

Most scenes return each particle to its initial position with the same velocity after one cycle. The equations use integer-frequency trigonometric time dependence, so a frame can be evaluated in any order without simulating everything before it.

Descent uses a different closure: every layer takes the place of an identical neighbour. A fully dark recycling interval hides the coordinate reset, and the visibility window has vanishing first and second derivatives at its endpoints. The permutation is part of the construction and has its own tests; raw per-particle displacement is not an appropriate loop test for it.

The images accumulate faint point marks in linear light. Local density, perspective, and restrained exposure make filaments and surfaces visible. Final movies average eight nearby times per frame; stills average sixteen. This supplies temporal antialiasing without a feedback trail that would depend on previously rendered frames.

## Make another study from these recipes

- **Topology:** choose a periodic parameterization with explicit gluing, select meaningful curve families, and precompute spatial harmonics. Change the geometry continuously while preserving the intended topological constraints.
- **Implicit fields:** generate an approximate surface once, sample by area, and displace those samples with a spatially delayed periodic field. Document what the deformation does and does not preserve.
- **Eigenmodes:** mix modes sharing one eigenvalue. Decide whether to encode sign, magnitude, nodal contours, or displaced shape; these produce very different visual outcomes from the same field.
- **Recursion:** make identical templates at related scales, then design the exchange and visibility window together. Seeded differences between supposedly identical templates can break the loop.
- **Flow maps:** compose invertible elementary deformations. Sine shears have easily checked unit determinants; their order matters and creates much richer shapes than an unstructured random displacement.

All three source modules export metadata and builder maps. The central catalogue integrates them into the studio and exporter, and the portable bundle gives each module a private scope. There are no new runtime dependencies.

## Detailed mathematics

The [topology notes](new-topology.md) give the Hopf coordinates, trefoil frame, and Klein gluing. The [field notes](new-fields.md) explain the gyroid approximation and mode normalizations. The [dynamics notes](new-dynamics.md) explain scale replacement and the shear Jacobians. The [toolkit guide](toolkit.md) and [export guide](exporting.md) describe how to author and produce another composition.

These are mathematical art constructions. Gyroid uses a nodal approximation rather than an exact minimal-surface solver; Resonance traces a modal field rather than moving grains of sand; Harmonic is a sculptural amplitude encoding rather than a quantum probability calculation; Confluence is a periodic flow-map construction rather than a claimed chaotic attractor. The distinctions keep the recipes useful and their mathematical claims precise.

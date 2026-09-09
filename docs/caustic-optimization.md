# Caustic quadrature optimization experiment

The publication source retains its validated 256-node midpoint rule. The following alternatives were tested independently on 9 September 2026; none was integrated into `src/shaders-fields.js`.

## Accuracy

The aperture and quartic part of the phase are even in the integration variable. Pairing nodes at `±s` therefore gives the identity

`w exp[i(E+O)] + w exp[i(E−O)] = 2w exp(iE) cos(O)`,

where `E=k(s⁴/4+Xs²/2)` and `O=kYs`. This halves the node visits and permits static aperture weights. It does not change the intended wave integral.

`tests/caustic-quadrature-quality.py` compared paired Gaussian and midpoint rules with a 512-node Gaussian reference at the final cubic embedding: 24 phases, three deformation settings, two fields, and a 19×19 image grid, totaling 51,984 wavefront controls.

| Rule | Paired visits | Maximum complex-amplitude error | RMS error |
| --- | ---: | ---: | ---: |
| Gaussian 64 | 32 | 1.371 | .2135 |
| Gaussian 96 | 48 | 1.273 | .1126 |
| Gaussian 128 | 64 | .4615 | .04386 |
| Gaussian 192 | 96 | .03746 | .0003803 |
| Gaussian 224 | 112 | 1.741×10⁻⁹ | 1.473×10⁻¹¹ |
| Gaussian 256 | 128 | 5.343×10⁻¹⁵ | 1.209×10⁻¹⁵ |
| Midpoint 192 | 96 | .0001042 | 1.876×10⁻⁶ |
| Midpoint 224 | 112 | 4.310×10⁻⁶ | 1.633×10⁻⁷ |
| Midpoint 256 | 128 | 7.470×10⁻⁷ | 5.497×10⁻⁸ |

The small Gaussian rules were rejected: they failed to resolve oscillatory cancellation. Gaussian 224 was accurate enough to benchmark. An additional 5,547 controls across the larger rectangle `X∈[−7.02,2.55]`, `Y∈[−5.87,5.87]`, `k∈{16,20,24}` gave a maximum amplitude error of 5.209×10⁻⁶ for Gaussian 224.

## Actual render measurements

`tests/benchmark-caustic.mjs` rendered at 1440×1440, eight shutter samples, phase .5, deformation .5, and recipe seed 42. Timings include synchronous pixel readback after rendering; a preliminary `gl.finish`-only probe was discarded because it did not measure completed browser rendering. Shader compilation was warmed up separately.

For the precomputed constant-array Gaussian 224 implementation, baseline frames took 5.23–6.15 seconds and candidate frames took 5.26–6.08 seconds: no reliable improvement. A fully expanded Gaussian 224 implementation, eliminating dynamic table indexing, took 2.95–3.87 seconds against 5.52–5.83 seconds for the baseline, approximately 1.67× faster on the paired means. These are two measured frames per variant on the same software-rendered browser while other exports were active, not an isolated hardware benchmark.

Both Gaussian implementations differed from the midpoint baseline by mean .004168/255 and maximum 1/255 in the compared image. Paired midpoint variants also had maximum differences of 1/255. This comparison covers one complete displayed frame at publication resolution; the CPU quadrature check covers the wider control sample above.

The publication shader and movie retain one consistent, validated 256-node midpoint implementation. A later investigation identified software graphics as the dominant export bottleneck. Changing the exporter to full Chromium headless enabled the RTX 4070: an 800-pixel, eight-sample comparison measured 1,276 ms on SwiftShader and 40 ms on hardware, with mean RGB difference .0898/255. The final 360-frame, 1,440-pixel Caustic movie completed rendering and encoding in 42.6 seconds. This resolved the production bottleneck without changing the quadrature. These are device-specific observations, not universal speed guarantees; see `output/qa/export-headless-benchmark.json`.

Detailed results and independent source snapshots are in `output/qa/03/caustic/quadrature-comparison.json`, `optimization-source-variants.json`, and `optimization-benchmark-expanded-gauss224.json`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { FIELD_BUILDERS, FIELD_SCENES, gyroidImplicit, degreeThreeModes, membraneModes } from '../src/scenes-fields.js';

// A local seeded source keeps these mathematical tests independent of the
// aggregate scene registry and its other optional scene modules.
const randomSource = (seed = 42) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const close = (a, b, tolerance, message) => assert.ok(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b}`);

test('degree-three fields have equal sphere-average energy and are orthogonal', () => {
  let aa = 0, bb = 0, ab = 0, meanA = 0, meanB = 0;
  const count = 20000, golden = Math.PI * (3 - Math.sqrt(5)), result = new Float64Array(2);
  for (let i = 0; i < count; i++) {
    const z = 1 - 2 * (i + .5) / count, r = Math.sqrt(1 - z * z), phi = golden * i;
    degreeThreeModes(r * Math.cos(phi), r * Math.sin(phi), z, result);
    aa += result[0] ** 2; bb += result[1] ** 2; ab += result[0] * result[1];
    meanA += result[0]; meanB += result[1];
  }
  close(aa / count, 1, 2e-5, 'A mean-square');
  close(bb / count, 1, 2e-5, 'B mean-square');
  close(ab / count, 0, 2e-5, 'cross inner product');
  close(meanA / count, 0, 2e-5, 'A mean'); close(meanB / count, 0, 2e-5, 'B mean');
});

test('degree-three polynomials are homogeneous and harmonic', () => {
  const h = 1e-4;
  for (const p of [[.2, -.3, .7], [-.8, .1, -.4], [.56, .32, -.27]]) {
    const original = degreeThreeModes(...p), scaled = degreeThreeModes(...p.map(x => 1.7 * x));
    const laplace = [0, 0];
    for (let axis = 0; axis < 3; axis++) {
      const lo = p.slice(), hi = p.slice(); lo[axis] -= h; hi[axis] += h;
      const a = degreeThreeModes(...lo), b = degreeThreeModes(...hi);
      for (let mode = 0; mode < 2; mode++) laplace[mode] += (a[mode] - 2 * original[mode] + b[mode]) / (h * h);
    }
    for (let mode = 0; mode < 2; mode++) {
      close(scaled[mode], 1.7 ** 3 * original[mode], 1e-12, 'cubic homogeneity');
      close(laplace[mode], 0, 4e-7, 'Euclidean Laplacian');
    }
  }
});

test('membrane modes share eigenvalue 29π² and satisfy Neumann boundaries', () => {
  const h = 1e-4, eigenvalue = 29 * Math.PI ** 2;
  for (const [u, v] of [[.23, .17], [.59, .76], [.81, .38]]) {
    const c = membraneModes(u, v), ux = membraneModes(u + h, v), lx = membraneModes(u - h, v);
    const uy = membraneModes(u, v + h), ly = membraneModes(u, v - h);
    for (let m = 0; m < 2; m++) {
      const laplace = (ux[m] + lx[m] + uy[m] + ly[m] - 4 * c[m]) / (h * h);
      close(laplace, -eigenvalue * c[m], 1e-4, 'membrane Laplacian');
    }
  }
  for (const boundary of [0, 1]) for (const along of [.13, .49, .81]) {
    const hiU = membraneModes(boundary + h, along), loU = membraneModes(boundary - h, along);
    const hiV = membraneModes(along, boundary + h), loV = membraneModes(along, boundary - h);
    for (let m = 0; m < 2; m++) {
      close((hiU[m] - loU[m]) / (2 * h), 0, 1e-8, 'normal derivative on u edge');
      close((hiV[m] - loV[m]) / (2 * h), 0, 1e-8, 'normal derivative on v edge');
    }
  }
});

test('gyroid samples approximate the nodal set inside the requested cube', () => {
  const count = 16000, data = new Float32Array(count * 4);
  const update = FIELD_BUILDERS.gyroid(count, randomSource(), data);
  const first = Float32Array.from(update(0, .5)), opposite = update(.5, .5);
  const moments = [0, 0, 0]; let squareResidual = 0, maximumResidual = 0;
  for (let i = 0; i < count; i++) {
    const p = [0, 1, 2].map(k => .5 * (first[4 * i + k] + opposite[4 * i + k]));
    for (let k = 0; k < 3; k++) {
      assert.ok(Math.abs(p[k]) <= .655001, 'reference scaffold stays in its cube');
      moments[k] += p[k] * p[k];
    }
    const residual = gyroidImplicit(...p.map(x => x * Math.PI / .655));
    maximumResidual = Math.max(maximumResidual, Math.abs(residual)); squareResidual += residual * residual;
  }
  assert.ok(maximumResidual < .014, `maximum implicit residual ${maximumResidual}`);
  assert.ok(Math.sqrt(squareResidual / count) < .005, 'RMS implicit residual');
  // Cyclic symmetry of the field and cube gives equal second moments. This
  // catches missing branches or a strongly biased projected parameterization.
  const average = moments.reduce((a, b) => a + b) / 3;
  for (const value of moments) close(value / average, 1, .025, 'cyclic sampling symmetry');
});

test('all raw field builders close in value and velocity without a wrapping adapter', () => {
  const count = 2000, h = .0005;
  for (const [id, build] of Object.entries(FIELD_BUILDERS)) {
    const data = new Float32Array(count * 4), update = build(count, randomSource(), data);
    const a = Float32Array.from(update(0, .7)), b = Float32Array.from(update(1, .7));
    const lo = Float32Array.from(update(-h, .7)), hi = Float32Array.from(update(h, .7));
    const endLo = Float32Array.from(update(1 - h, .7)), endHi = Float32Array.from(update(1 + h, .7));
    for (let i = 0; i < data.length; i++) {
      close(a[i], b[i], 1e-7, `${id} value seam`);
      close((hi[i] - lo[i]) / (2 * h), (endHi[i] - endLo[i]) / (2 * h), 1e-5, `${id} velocity seam`);
    }
    const reference = Float32Array.from(update(.13, .36)); update(.88, .95);
    assert.equal(update(.13, .36), data, `${id} keeps its output buffer`);
    assert.deepEqual(data, reference, `${id} is independent of call order`);
  }
});

test('narrow resonance-band left/right velocities converge instead of hiding a seam cusp', () => {
  const count = 6000, data = new Float32Array(count * 4);
  const update = FIELD_BUILDERS.resonance(count, randomSource(), data);
  for (const amount of [0, .5, 1]) {
    const centre = Float32Array.from(update(0, amount));
    let previousGap = Infinity;
    // Each estimate is genuinely one-sided. A cusp would retain a nonzero
    // derivative jump rather than show the expected first-order convergence.
    for (const h of [.001, .0005, .00025]) {
      const before = Float32Array.from(update(-h, amount)), after = update(h, amount);
      let maximumGap = 0;
      for (let i = 3; i < data.length; i += 4) {
        const left = (centre[i] - before[i]) / h;
        const right = (after[i] - centre[i]) / h;
        maximumGap = Math.max(maximumGap, Math.abs(left - right));
      }
      assert.ok(maximumGap < .61 * previousGap, `one-sided derivative gap converges: ${maximumGap} after ${previousGap}`);
      previousGap = maximumGap;
    }
    // Second-order one-sided stencils reduce the large curvature bias while
    // retaining independent evidence from each side of the seam.
    const h = .00005;
    const before = Float32Array.from(update(-h, amount)), before2 = Float32Array.from(update(-2 * h, amount));
    const after = Float32Array.from(update(h, amount)), after2 = update(2 * h, amount);
    let mismatch = 0;
    for (let i = 3; i < data.length; i += 4) {
      const left = (3 * centre[i] - 4 * before[i] + before2[i]) / (2 * h);
      const right = (-3 * centre[i] + 4 * after[i] - after2[i]) / (2 * h);
      mismatch = Math.max(mismatch, Math.abs(left - right));
    }
    assert.ok(mismatch < .02, `second-order derivative mismatch ${mismatch}`);
  }
});

test('field radiance stays normalized and nonnegative through parameter extremes', () => {
  const count = 2000;
  for (const [id, build] of Object.entries(FIELD_BUILDERS)) {
    const data = new Float32Array(count * 4), update = build(count, randomSource(), data);
    for (let phase = 0; phase < 16; phase++) for (const amount of [0, 1]) {
      update(phase / 16, amount);
      for (let i = 0; i < data.length; i += 4) {
        assert.ok(Number.isFinite(data[i] + data[i + 1] + data[i + 2]), `${id} finite geometry`);
        assert.ok(data[i + 3] >= 0 && data[i + 3] <= 1, `${id} normalized radiance`);
      }
    }
  }
});

test('default field cameras retain a publication margin throughout the loop', () => {
  const count = 6000;
  for (const scene of FIELD_SCENES) {
    const data = new Float32Array(count * 4), update = FIELD_BUILDERS[scene.id](count, randomSource(), data);
    const { yaw, pitch, distance } = scene.camera;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    let maximumExtent = 0;
    for (let phase = 0; phase < 24; phase++) for (const amount of [0, .5, 1]) {
      update(phase / 24, amount);
      for (let i = 0; i < data.length; i += 4) {
        const x = cy * data[i] + sy * data[i + 2], z = -sy * data[i] + cy * data[i + 2];
        const y = cp * data[i + 1] - sp * z, depth = sp * data[i + 1] + cp * z;
        assert.ok(distance - depth > .5, `${scene.id} stays ahead of the near plane`);
        maximumExtent = Math.max(maximumExtent, 2.65 * Math.max(Math.abs(x), Math.abs(y)) / (distance - depth));
      }
    }
    assert.ok(maximumExtent < .95, `${scene.id} projected extent ${maximumExtent} leaves a frame margin`);
  }
});

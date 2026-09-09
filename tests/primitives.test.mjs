import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TAU, wrap, seededRandom, phaseAt, loopNoise, createLoopField, harmonicLoop,
  replacementPhase, smoothPeriodicPulse, createClosedPath, sampleClosedPath,
} from '../src/primitives.js';
import { createReplacementScene } from '../src/example.js';

const close = (a, b, epsilon = 1e-9) => assert.ok(Math.abs(a - b) <= epsilon, `${a} differs from ${b}`);
const derivative = (fn, t, h = 1e-6) => (fn(t + h) - fn(t - h)) / (2 * h);
const path = [[0.8, 0, 0.1], [0.15, 0.6, -0.2], [-0.7, 0.2, 0.1], [-0.4, -0.5, 0.3], [0.5, -0.4, -0.1]];

test('phase utilities wrap negative time and offsets', () => {
  close(TAU, Math.PI * 2);
  close(wrap(-0.125), 0.875);
  close(phaseAt(0.9, 0.3), 0.2);
  assert.equal(wrap(Infinity), 0);
  const a = seededRandom(52), b = seededRandom(52), c = seededRandom(53);
  const values = Array.from({ length: 12 }, () => a());
  assert.deepEqual(values, Array.from({ length: 12 }, () => b()));
  assert.notDeepEqual(values, Array.from({ length: 12 }, () => c()));
});

test('circular noise appends the time circle to spatial coordinates', () => {
  const args = loopNoise((...values) => values, 0.25, { coordinates: [3, 7], radius: 2, offsetX: 1, offsetY: -1 });
  assert.equal(args[0], 3); assert.equal(args[1], 7);
  close(args[2], 1); close(args[3], 1);
  const noise = t => loopNoise((x, y, a, b) => Math.sin(x + a) * Math.cos(y - b), t, { coordinates: [0.3, 1.7] });
  close(noise(0), noise(1));
  close(noise(-1e-7), noise(1 - 1e-7));
  close(derivative(noise, -1e-6), derivative(noise, 1e-6), 0.001);
  assert.throws(() => loopNoise(null, 0), TypeError);
});

test('harmonic fields are deterministic, bounded, and close smoothly at the seam', () => {
  const a = createLoopField(123, 5), b = createLoopField(123, 5), other = createLoopField(124, 5);
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    assert.equal(a(t), b(t));
    close(a(t), harmonicLoop(t, 123, 5));
    assert.ok(Math.abs(a(t)) <= 1);
  }
  assert.notEqual(a(0.23), other(0.23));
  assert.equal(a(0), a(1));
  close(a(-1e-7), a(1 - 1e-7));
  close(derivative(a, -1e-7), derivative(a, 1e-7), 0.001);
  assert.throws(() => createLoopField(42, 1.5), RangeError);
});

test('replacement closes by state permutation, including reverse travel', () => {
  for (const cycles of [-3, 1, 4]) {
    for (let i = 0; i < 12; i++) {
      close(replacementPhase(i, 12, 1, cycles), replacementPhase(i + cycles, 12, 0, cycles));
      const attribute = t => Math.sin(TAU * replacementPhase(i, 12, t, cycles));
      const permuted = t => Math.sin(TAU * replacementPhase(i + cycles, 12, t, cycles));
      close(derivative(attribute, 1), derivative(permuted, 0), 1e-8);
    }
  }
  assert.throws(() => replacementPhase(0, 0, 0), RangeError);
  assert.throws(() => replacementPhase(0, 12, 0, 0.5), RangeError);
});

test('periodic pulse peaks at the seam with a matching first derivative', () => {
  assert.equal(smoothPeriodicPulse(0), 1);
  assert.equal(smoothPeriodicPulse(1), 1);
  close(smoothPeriodicPulse(-0.1), smoothPeriodicPulse(0.1));
  assert.ok(smoothPeriodicPulse(0.5) < smoothPeriodicPulse(0.25));
  close(derivative(smoothPeriodicPulse, -1e-7), derivative(smoothPeriodicPulse, 1e-7), 0.0001);
  assert.throws(() => smoothPeriodicPulse(0, 0), RangeError);
});

test('closed path interpolates controls and preserves position and tangent across the seam', () => {
  const sample = createClosedPath(path);
  for (let i = 0; i < path.length; i++) {
    const p = sample(i / path.length);
    p.forEach((x, k) => close(x, path[i][k]));
  }
  assert.deepEqual(sample(0), sample(1));
  assert.deepEqual(sampleClosedPath(path, 0.31), sample(0.31));
  for (let k = 0; k < 3; k++) {
    const coordinate = t => sample(t)[k];
    close(coordinate(-1e-7), coordinate(1 - 1e-7));
    close(derivative(coordinate, -1e-7), derivative(coordinate, 1e-7), 0.0001);
  }
  const out = new Float64Array(3);
  assert.equal(sample(0.4, out), out);
  assert.throws(() => createClosedPath([[0, 0], [1, 1]]), RangeError);
  assert.throws(() => createClosedPath([[0, 0], [1, 1, 2], [2, 1]]), TypeError);
});

test('the replacement recipe matches complete particle attributes under permutation', () => {
  const scene = createReplacementScene({ count: 1200, seed: 91 });
  const first = scene.data.slice(), same = createReplacementScene({ count: 1200, seed: 91 });
  assert.deepEqual(scene.data, same.data);
  const final = scene.update(1), stride = 100 * 4;
  for (let i = 0; i < final.length; i++) {
    assert.equal(final[i], first[(i + stride) % first.length]);
    assert.ok(Number.isFinite(final[i]));
  }
  // The public buffer and requested particle count remain stable.
  assert.equal(final, scene.data);
  assert.equal(scene.count, 1200);
});

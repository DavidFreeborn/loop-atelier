import test from 'node:test';
import assert from 'node:assert/strict';
import { TOPOLOGY_BUILDERS } from '../src/scenes-topology.js';

const subtract = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = a => Math.hypot(...a);

// Infer a circle from three output positions. The test does not use the
// stereographic coefficients or the circle frame from the implementation.
function circumcircle(a, b, c) {
  const ab = subtract(b, a), ac = subtract(c, a), normal = cross(ab, ac);
  const first = cross(ac, normal), second = cross(normal, ab);
  const denominator = 2 * dot(normal, normal);
  assert.ok(denominator > 1e-8, 'Chosen output points must define a circle.');
  const centre = a.map((x, k) => x + (dot(ab, ab) * first[k] + dot(ac, ac) * second[k]) / denominator);
  return { centre, radius: length(subtract(a, centre)), normal, normalLength: length(normal) };
}

const samples = 128, fibres = 144, count = samples * fibres;
const phases = [0, 0.15, 0.37, 0.70, 0.999];
const selectedFibres = [0, 7, 8, 40, 75, 120, 143];
const point = (data, fibre, sample) => Array.from(data.subarray((fibre * samples + sample) * 4, (fibre * samples + sample) * 4 + 3));

test('Hopf output fibres remain planar circles during the 4D transformation', () => {
  const data = new Float32Array(count * 4);
  const update = TOPOLOGY_BUILDERS.hopf(count, () => 0.37123, data);
  for (const variation of [0, 0.5, 1]) for (const phase of phases) {
    update(phase, variation);
    for (const fibre of selectedFibres) {
      const a = point(data, fibre, 0);
      const circle = circumcircle(a, point(data, fibre, 42), point(data, fibre, 85));
      for (let sample = 0; sample < samples; sample++) {
        const p = point(data, fibre, sample);
        const distanceToPlane = Math.abs(dot(subtract(p, a), circle.normal)) / circle.normalLength;
        const radialError = Math.abs(length(subtract(p, circle.centre)) - circle.radius);
        assert.ok(distanceToPlane < 2e-6, `Fibre ${fibre}, phase ${phase}: non-planar output ${distanceToPlane}`);
        assert.ok(radialError < 2e-6, `Fibre ${fibre}, phase ${phase}: non-circular output ${radialError}`);
      }
    }
  }
});

test('Hopf points keep uniform circular spacing, including the closing interval', () => {
  const data = new Float32Array(count * 4);
  const update = TOPOLOGY_BUILDERS.hopf(count, () => 0.6137, data);
  for (const variation of [0, 0.5, 1]) for (const phase of phases) {
    update(phase, variation);
    for (const fibre of selectedFibres) {
      let shortest = Infinity, longest = 0;
      for (let sample = 0; sample < samples; sample++) {
        const chord = length(subtract(point(data, fibre, sample), point(data, fibre, (sample + 1) % samples)));
        shortest = Math.min(shortest, chord); longest = Math.max(longest, chord);
      }
      // Equal chords on a circle imply equal arc intervals. Allow float32
      // round-off while detecting the much larger original projection stretch.
      assert.ok(longest / shortest < 1.0001, `Fibre ${fibre}, phase ${phase}: spacing ratio ${longest / shortest}`);
    }
  }
});

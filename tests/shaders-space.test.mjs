import test from 'node:test';
import assert from 'node:assert/strict';
import { SPACE_SHADERS } from '../src/shaders-space.js';

test('space artworks follow the shared GLSL source contract', () => {
  assert.deepEqual(SPACE_SHADERS.map(s => s.id), ['section', 'inversion']);
  for (const study of SPACE_SHADERS) {
    assert.equal(study.kind, 'shader');
    assert.equal(study.collection, 3);
    assert.equal(study.palette, 'native');
    assert.match(study.source, /vec3\s+artwork\s*\(vec2\s+p\)/);
    assert.doesNotMatch(study.source, /#version|\buniform\s|\bvoid\s+main\s*\(/);
    assert.match(study.source, /fract\(uPhase\)/);
  }
});

test('the GLSL inversion step stays below an independently known exact surface distance', () => {
  const source = SPACE_SHADERS.find(s => s.id === 'inversion').source;
  const expression = source.match(/float safe=([^;]+);/)[1];
  // Evaluate the actual scalar GLSL expression, not a second implementation.
  const bound = new Function('D', 'radius', 'r2', 'gRadius2', `return ${expression.replaceAll('sqrt(', 'Math.sqrt(')};`);
  let cases = 0;
  // A source plane y.x=a inverts to a sphere centred at R²/(2a), with that
  // same radius. Its exact geometric distance is independent of the bound.
  for (const R2 of [0.8, 1.7, 2.4]) for (const a of [0.25, 0.8, 1.6]) {
    const centre = R2 / (2 * a);
    for (let i = 1; i <= 180; i++) {
      const p = [2.9 * Math.sin(i * 1.13), 2.4 * Math.cos(i * 0.77), 2.1 * Math.sin(i * 1.47)];
      const radius = Math.hypot(...p), r2 = radius * radius;
      const D = Math.abs(R2 * p[0] / r2 - a);
      const actual = Math.abs(Math.hypot(p[0] - centre, p[1], p[2]) - centre);
      const step = bound(D, radius, r2, R2);
      assert.ok(Number.isFinite(step) && step >= 0);
      assert.ok(step <= actual + 2e-12, `${step} exceeds the exact surface distance ${actual}`);
      assert.ok(step < radius);
      cases++;
    }
  }
  assert.equal(cases, 1620);
  assert.equal(bound(0, 1, 1, 1.7), 0);
});

test('Section’s actual pair ordering preserves all six distances and the selected material', () => {
  const source = SPACE_SHADERS.find(s => s.id === 'section').source;
  const expressions = source.match(/float smallest=([^;]+);\s*float middle=([^;]+);/);
  assert.ok(expressions, 'Section must expose its ordered pair calculation.');
  const translate = expression => expression.replaceAll('min(', 'Math.min(').replaceAll('max(', 'Math.max(').replace(/d\.([xyzw])/g, (_, c) => `d[${'xyzw'.indexOf(c)}]`);
  const ordered = new Function('d', `return [${translate(expressions[1])},${translate(expressions[2])}];`);
  const square = (x, y, width) => {
    const qx = x - width, qy = y - width;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 0.017;
  };
  const check = (d, width) => {
    const [smallest, middle] = ordered(d);
    const oldIvory = Math.min(square(d[0], d[1], width), square(d[0], d[2], width), square(d[1], d[2], width));
    const oldMetal = Math.min(square(d[0], d[3], width), square(d[1], d[3], width), square(d[2], d[3], width));
    const ivory = square(smallest, middle, width), metal = square(smallest, d[3], width);
    assert.equal(ivory, oldIvory); assert.equal(metal, oldMetal);
    assert.equal(ivory < metal ? 1 : 2, oldIvory < oldMetal ? 1 : 2);
  };
  for (const width of [0.047, 0.0535, 0.060]) {
    for (let i = 1; i <= 5000; i++) check([Math.abs(Math.sin(i * 0.71)), Math.abs(Math.cos(i * 1.19)), Math.abs(Math.sin(i * 1.43)), Math.abs(Math.cos(i * 0.37))], width);
    // Include signed interior distances, exact plane coincidences, and ties.
    const values = [0, width * 0.5, width, width + 1e-6, 0.3];
    for (const x of values) for (const y of values) for (const z of values) for (const w of values) check([x, y, z, w], width);
  }
});

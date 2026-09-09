/**
 * Loop Atelier: small, composable building blocks for seamless motion.
 * Time is expressed in complete cycles. Functions evaluate any frame directly;
 * no simulation, hidden clock, or frame-to-frame accumulation is involved.
 */

export const TAU = 2 * Math.PI;
export { seededRandom } from './scenes.js';
import { seededRandom } from './scenes.js';

export const wrap = t => Number.isFinite(t) ? t - Math.floor(t) : 0;

/** A phase shift is a delay around a circle, not an accumulating timer. */
export const phaseAt = (t, offset = 0) => wrap(t + offset);

/**
 * Turn any continuous N-dimensional noise function into periodic noise.
 * Arguments are ordered noiseFn(...coordinates, circleX, circleY).
 * For example: loopNoise(noise4D, t, { coordinates: [x, y], radius: 0.4 }).
 * A full revolution returns both position AND velocity to their initial values.
 * Larger radii travel farther through the noise field; they do not change the
 * duration. The supplied noise implementation determines the output range.
 */
export function loopNoise(noiseFn, t, {
  radius = 1, offsetX = 0, offsetY = 0, coordinates = [],
} = {}) {
  if (typeof noiseFn !== 'function') throw new TypeError('noiseFn must be a continuous function.');
  if (![radius, offsetX, offsetY, ...coordinates].every(Number.isFinite)) {
    throw new RangeError('Noise coordinates, radius, and offsets must be finite.');
  }
  const angle = TAU * wrap(t);
  return noiseFn(...coordinates, offsetX + radius * Math.cos(angle), offsetY + radius * Math.sin(angle));
}

/**
 * Compile a seeded periodic scalar field, bounded by [-1, 1].
 * Each octave doubles the integer frequency and halves its amplitude.
 * Create the closure once for a particle family instead of inside update().
 */
export function createLoopField(seed = 42, octaves = 4) {
  if (!Number.isInteger(octaves) || octaves < 1 || octaves > 12) {
    throw new RangeError('Use between 1 and 12 integer octaves.');
  }
  const random = seededRandom(seed);
  const coefficients = Array.from({ length: octaves }, (_, i) => ({
    frequency: 2 ** i, amplitude: 0.5 ** i, phase: TAU * random(),
  }));
  const weight = coefficients.reduce((sum, c) => sum + c.amplitude, 0);
  return t => {
    const angle = TAU * wrap(t);
    let sum = 0;
    for (const c of coefficients) sum += c.amplitude * Math.sin(c.frequency * angle + c.phase);
    return sum / weight;
  };
}

// A small cache is convenient for sketches; createLoopField is preferable when
// many independently seeded fields need explicit ownership and lifetime.
const fields = new Map();
export function harmonicLoop(t, seed = 42, octaves = 4) {
  const key = `${Number(seed) >>> 0}:${octaves}`;
  if (!fields.has(key)) {
    const field = createLoopField(seed, octaves);
    if (fields.size >= 64) fields.delete(fields.keys().next().value);
    fields.set(key, field);
  }
  return fields.get(key)(t);
}

/**
 * Advance a queue by an integer number of slots during one timeline cycle.
 * At t=1, index i occupies index i+cycles's old position. The rendered ensemble
 * therefore repeats under permutation, although a single particle need not.
 *
 * All visible attributes must follow the wrapped path position, or repeat
 * identically for each queue item. An index-specific colour, size, random
 * offset, or trail breaks the replacement unless that attribute is permuted
 * too. An open path also needs matched entrance/exit visibility.
 */
export function replacementPhase(index, count, t, cycles = 1) {
  if (!Number.isInteger(count) || count < 1 || !Number.isFinite(index)
      || !Number.isInteger(cycles) || !Number.isFinite(t)) {
    throw new RangeError('Replacement needs a positive integer count, integer cycles, and finite index/time.');
  }
  return wrap((index + cycles * t) / count);
}

/** A C-infinity pulse centred on the loop seam; width is a fraction of a cycle. */
export function smoothPeriodicPulse(t, width = 0.12) {
  if (!Number.isFinite(width) || width < 1e-6) throw new RangeError('Pulse width must be finite and at least 0.000001.');
  return Math.exp((Math.cos(TAU * wrap(t)) - 1) / (TAU * width) ** 2);
}

/**
 * Compile a closed uniform Catmull–Rom spline from 2D or 3D coordinate vectors.
 * Do not duplicate the first control point at the end. The wrapped neighbours
 * make position and first derivative continuous at every join, including t=0.
 * Parameter speed is not constant arc-length speed. For constant travel speed,
 * sample the spline densely and invert a cumulative arc-length lookup table.
 * Pass an output vector to sample(t, out) to avoid per-particle allocation.
 */
export function createClosedPath(points) {
  if (!Array.isArray(points) || points.length < 3) throw new RangeError('A closed path needs at least three coordinate vectors.');
  const dimensions = points[0]?.length;
  if (![2, 3].includes(dimensions) || !points.every(p => p?.length === dimensions && Array.from(p).every(Number.isFinite))) {
    throw new TypeError('All path points must be finite vectors of the same dimension, either 2 or 3.');
  }
  // Copy the controls so editing an unrelated input array cannot mutate a loop.
  const controls = points.map(p => Float64Array.from(p));
  const n = controls.length;
  return (t, out = new Array(dimensions)) => {
    const u = wrap(t) * n, i = Math.floor(u), f = u - i;
    const a = controls[(i + n - 1) % n], b = controls[i];
    const c = controls[(i + 1) % n], d = controls[(i + 2) % n];
    const f2 = f * f, f3 = f2 * f;
    for (let k = 0; k < dimensions; k++) {
      out[k] = 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * f
        + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * f2
        + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * f3);
    }
    return out;
  };
}

/** Convenience form for one-off sampling; compile with createClosedPath for a frame loop. */
export function sampleClosedPath(points, t) {
  return createClosedPath(points)(t);
}

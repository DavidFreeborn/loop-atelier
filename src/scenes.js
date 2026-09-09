/**
 * Loop Atelier — original, deterministic filament geometries.
 *
 * A scene owns one packed Float32Array: [x, y, z, intensity, ...].
 * update(t, variation) mutates and returns that same array; t is measured in
 * complete cycles. All animation is analytic and periodic, so frames may be
 * evaluated in any order and offline exports need no simulation warm-up.
 *
 * The small amount of spatial “noise” is a coherent harmonic field. Spatial
 * harmonics are precomputed; only the time harmonics are evaluated per frame.
 * No third-party artwork, source code, or noise implementation is included.
 */

import { TOPOLOGY_SCENES, TOPOLOGY_BUILDERS } from './scenes-topology.js';
import { FIELD_SCENES, FIELD_BUILDERS } from './scenes-fields.js';
import { DYNAMIC_SCENES, DYNAMIC_BUILDERS } from './scenes-dynamics.js';
import { SPACE_SHADERS } from './shaders-space.js';
import { COMPLEX_SHADERS } from './shaders-fields.js';
import { PATTERN_SHADERS } from './shaders-patterns.js';
import { GEOMETRY_04_SHADERS } from './shaders-geometry-04.js';
import { MATHEMATICS_04_SHADERS } from './shaders-mathematics-04.js';

const TAU = Math.PI * 2;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export const SCENES = [
  {
    id: 'meridian', title: 'Meridian', subtitle: 'A folded annulus',
    description: 'A continuous silk surface turns through a saddle. Fine circular threads gather into bright folds around an unbroken dark aperture.',
    technique: 'A toroidal surface, pleated with travelling integer harmonics. Each luminous thread is a complete closed curve.',
    formula: 'r = R + a cos(v + τt) + b sin(3u + 2v − τt)',
    duration: 8, camera: { yaw: 0.08, pitch: 0.44, distance: 3.4 },
    pointSize: 1.12, exposure: 1.12,
  },
  {
    id: 'bloom', title: 'Bloom', subtitle: 'Five folds, one shell',
    description: 'Long meridian threads describe a lobed hollow vessel. Slow pressure waves move between the petals, opening light and shadow inside the form.',
    technique: 'A fivefold polar shell with a travelling radial mode and a second harmonic in its height. Pole intensity compensates for sampling density.',
    formula: 'r = sin(v) [a + b cos(5u + τt) + c cos(3v − τt)]',
    duration: 8, camera: { yaw: 0.26, pitch: 1.12, distance: 3.4 },
    pointSize: 1.13, exposure: 1.15,
  },
  {
    id: 'undertow', title: 'Undertow', subtitle: 'Threads into a void',
    description: 'Spiral filaments sweep into an oblique throat. The open aperture stays dark as folds travel around the widening mouth.',
    technique: 'An open flared surface with a quadratic radius, helical coordinates, and two periodic travelling deformations. Particles follow closed cycles without respawning.',
    formula: 'r = a + bu²; θ = v + 5u + τt; z = −c + du + εu cos(2v + 10u + τt)',
    duration: 9, camera: { yaw: -0.14, pitch: 0.12, distance: 3.4 },
    pointSize: 1.16, exposure: 1.18,
  },
  {
    id: 'lattice', title: 'Lattice', subtitle: 'A standing wave in six planes',
    description: 'A translucent wire cube bends under a standing wave. Its edges remain exact while the interior mesh alternately compresses and opens.',
    technique: 'Two orthogonal line families on each cube face, displaced by edge-pinned spatial modes. A small periodic rotation exposes the structure.',
    formula: 'δ(p,q,t) = sin(πp) sin(πq) [a sin(2πp + τt) + b cos(2πq − τt)]',
    duration: 8, camera: { yaw: 0.53, pitch: 0.35, distance: 3.4 },
    pointSize: 0.95, exposure: 0.95,
  },
  {
    id: 'ribbon', title: 'Ribbon', subtitle: 'A pleated field in torsion',
    description: 'Parallel threads form a finite sheet of pleated fabric. A travelling crimp passes through its twist, revealing the thin edge and luminous interior.',
    technique: 'A ruled sheet around a sinusoidal spine, rotated by a longitudinal twist. Two travelling corrugations create fine ridges without temporal feedback.',
    formula: 'P(u,v,t) = C(u,t) + Rₓ(1.5πu + a sin τt) [0, bv, ε cos(16πv + 2πu − τt)]',
    duration: 10, camera: { yaw: -0.16, pitch: 0.08, distance: 3.4 },
    pointSize: 1.12, exposure: 1.16,
  },
  {
    id: 'orbit', title: 'Orbit', subtitle: 'Seven entrained planes',
    description: 'Seven separated bands of precise strands precess together. Each band has its own inclination, leaving the centre open and the intersections sharply legible.',
    technique: 'Nested elliptical thread bundles in independently precessing planes. Tiny coherent corrugations preserve a hand-spun edge without blurring the geometry.',
    formula: 'Pₖ(u,t) = Rᵧ(αₖ(t)) Rₓ(βₖ(t)) [rₖ cos u, 0.86rₖ sin u, ε sin(7u + τt)]',
    duration: 10, camera: { yaw: 0.07, pitch: 0.04, distance: 3.4 },
    pointSize: 1.0, exposure: 0.92,
  },
  ...TOPOLOGY_SCENES.map(s => ({ ...s, collection: 2 })),
  ...FIELD_SCENES.map(s => ({ ...s, collection: 2 })),
  ...DYNAMIC_SCENES.map(s => ({ ...s, collection: 2 })),
  ...PATTERN_SHADERS, ...SPACE_SHADERS, ...COMPLEX_SHADERS, ...GEOMETRY_04_SHADERS, ...MATHEMATICS_04_SHADERS,
];

/** Small seeded PRNG: no global random state is touched. */
export function seededRandom(seed = 42) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

/** Repeat a phase exactly, including negative and out-of-order frame times. */
export function loopPhase(t) {
  if (!Number.isFinite(t)) return 0;
  return t - Math.floor(t);
}

function arrays(count, n) {
  return Array.from({ length: n }, () => new Float32Array(count));
}

// Balanced line lengths keep every filament intact at arbitrary point counts.
function filaments(count, requestedLines, random, visit) {
  const lines = Math.max(1, Math.min(count, requestedLines));
  for (let line = 0; line < lines; line++) {
    const start = Math.floor(line * count / lines);
    const end = Math.floor((line + 1) * count / lines);
    const phase = random();
    const offset = random() - 0.5;
    const gain = 0.65 + random() * 0.35;
    for (let i = start; i < end; i++) {
      const s = (i - start + phase) / (end - start);
      visit(i, s, (line + 0.18 * offset) / lines, gain, line);
    }
  }
}

function meridian(count, random, data) {
  const [cu, su, cv, sv, c2u, s2u, c3, s3, c5, s5, gain] = arrays(count, 11);
  filaments(count, 144, random, (i, s, line, brightness) => {
    const u = TAU * s, v = TAU * line;
    cu[i] = Math.cos(u); su[i] = Math.sin(u);
    cv[i] = Math.cos(v); sv[i] = Math.sin(v);
    c2u[i] = Math.cos(2 * u); s2u[i] = Math.sin(2 * u);
    c3[i] = Math.cos(3 * u + 2 * v); s3[i] = Math.sin(3 * u + 2 * v);
    c5[i] = Math.cos(5 * u - 2 * v); s5[i] = Math.sin(5 * u - 2 * v);
    gain[i] = brightness * (0.68 + 0.23 * Math.sin(v) ** 2);
  });
  return (t, amount) => {
    const ct = Math.cos(TAU * t), st = Math.sin(TAU * t);
    const pleat = 0.026 + 0.055 * amount;
    const saddle = 0.105 + 0.15 * amount;
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const vcos = cv[i] * ct - sv[i] * st;
      const vsin = sv[i] * ct + cv[i] * st;
      const ripple = s3[i] * ct - c3[i] * st;
      const r = 0.535 + 0.192 * vcos + pleat * ripple;
      data[j] = r * cu[i];
      data[j + 1] = r * su[i];
      data[j + 2] = 0.185 * vsin + saddle * (s2u[i] * ct + c2u[i] * st)
        + 0.027 * (s5[i] * ct - c5[i] * st);
      data[j + 3] = gain[i] * (0.74 + 0.19 * vcos);
    }
    return data;
  };
}

function bloom(count, random, data) {
  const [cu, su, cv, sv, c3v, s3v, c5u, s5u, c2v, s2v, gain] = arrays(count, 11);
  filaments(count, 168, random, (i, s, line, brightness) => {
    const u = TAU * line, v = Math.PI * (0.004 + 0.992 * s);
    cu[i] = Math.cos(u); su[i] = Math.sin(u);
    cv[i] = Math.cos(v); sv[i] = Math.sin(v);
    c3v[i] = Math.cos(3 * v); s3v[i] = Math.sin(3 * v);
    c5u[i] = Math.cos(5 * u); s5u[i] = Math.sin(5 * u);
    c2v[i] = Math.cos(2 * v); s2v[i] = Math.sin(2 * v);
    gain[i] = brightness * (0.14 + 0.73 * Math.sin(v) ** 0.7);
  });
  return (t, amount) => {
    const ct = Math.cos(TAU * t), st = Math.sin(TAU * t);
    const ct2 = Math.cos(2 * TAU * t), st2 = Math.sin(2 * TAU * t);
    const lobes = 0.105 + amount * 0.12;
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const petal = c5u[i] * ct - s5u[i] * st;
      const wave = c3v[i] * ct + s3v[i] * st;
      const r = sv[i] * (0.565 + lobes * petal + 0.056 * wave);
      data[j] = r * cu[i];
      data[j + 1] = 0.715 * cv[i] + (0.08 + 0.065 * amount) * sv[i] * sv[i] * petal;
      data[j + 2] = r * su[i] + 0.036 * sv[i] * (s2v[i] * ct2 - c2v[i] * st2);
      data[j + 3] = gain[i] * (0.78 + 0.14 * petal);
    }
    return data;
  };
}

function undertow(count, random, data) {
  const [u, radius, ca, sa, c2a, s2a, c3a, s3a, spine, gain] = arrays(count, 10);
  filaments(count, 132, random, (i, s, line, brightness) => {
    const a = TAU * line + 5.0 * s;
    u[i] = s; radius[i] = 0.202 + 0.53 * s * s;
    ca[i] = Math.cos(a); sa[i] = Math.sin(a);
    c2a[i] = Math.cos(2 * a); s2a[i] = Math.sin(2 * a);
    c3a[i] = Math.cos(3 * a); s3a[i] = Math.sin(3 * a);
    spine[i] = 0.115 * Math.sin(Math.PI * s);
    gain[i] = brightness * (0.39 + 0.40 * s);
  });
  const cy = Math.cos(0.66), sy = Math.sin(0.66);
  const cx = Math.cos(-0.36), sx = Math.sin(-0.36);
  return (t, amount) => {
    const ct = Math.cos(TAU * t), st = Math.sin(TAU * t);
    const ct2 = Math.cos(2 * TAU * t), st2 = Math.sin(2 * TAU * t);
    const fold = 0.026 + 0.065 * amount;
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const r = radius[i] * (1 + fold * (s3a[i] * ct2 - c3a[i] * st2) * u[i]);
      const x = r * (ca[i] * ct - sa[i] * st) + spine[i] - 0.09;
      const y = r * (sa[i] * ct + ca[i] * st) + 0.08 * u[i] * u[i];
      const z = -0.52 + 1.08 * u[i] + (0.025 + 0.075 * amount) * u[i]
        * (c2a[i] * ct - s2a[i] * st);
      const xx = cy * x + sy * z;
      const zz = -sy * x + cy * z;
      data[j] = xx - 0.08;
      data[j + 1] = cx * y - sx * zz;
      data[j + 2] = sx * y + cx * zz;
      data[j + 3] = gain[i];
    }
    return data;
  };
}

function lattice(count, random, data) {
  const [px, py, pz, nx, ny, nz, envelope, sp, cp, sq, cq, gain] = arrays(count, 12);
  // 23 lines per family omit exact duplicate edge lines on adjacent faces.
  const grid = 23, totalLines = 6 * 2 * grid;
  filaments(count, totalLines, random, (i, s, _line, brightness, line) => {
    const face = Math.floor(line / (2 * grid));
    const axis = Math.floor(face / 2), sign = face % 2 ? 1 : -1;
    const family = Math.floor(line / grid) % 2;
    const across = (line % grid + 0.5) / grid;
    const p = family ? across : s, q = family ? s : across;
    const a = (p - 0.5) * 1.16, b = (q - 0.5) * 1.16;
    if (axis === 0) { px[i] = sign * 0.58; py[i] = a; pz[i] = b; nx[i] = sign; }
    if (axis === 1) { px[i] = a; py[i] = sign * 0.58; pz[i] = b; ny[i] = sign; }
    if (axis === 2) { px[i] = a; py[i] = b; pz[i] = sign * 0.58; nz[i] = sign; }
    envelope[i] = Math.sin(Math.PI * p) * Math.sin(Math.PI * q);
    sp[i] = Math.sin(TAU * p); cp[i] = Math.cos(TAU * p);
    sq[i] = Math.sin(TAU * q); cq[i] = Math.cos(TAU * q);
    gain[i] = brightness * (0.40 + 0.10 * (1 - envelope[i]));
  });
  return (t, amount) => {
    const ct = Math.cos(TAU * t), st = Math.sin(TAU * t);
    const rot = 0.115 * st, cr = Math.cos(rot), sr = Math.sin(rot);
    const amplitude = 0.027 + amount * 0.15;
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const wave = amplitude * envelope[i] * ((sp[i] * ct + cp[i] * st)
        + 0.46 * (cq[i] * ct + sq[i] * st));
      const x = px[i] + wave * nx[i];
      const y = py[i] + wave * ny[i];
      const z = pz[i] + wave * nz[i];
      data[j] = cr * x + sr * z;
      data[j + 1] = y;
      data[j + 2] = -sr * x + cr * z;
      data[j + 3] = gain[i];
    }
    return data;
  };
}

function ribbon(count, random, data) {
  const [u, v, csp, ssp, ctw, stw, cfold, sfold, cfine, sfine, gain] = arrays(count, 11);
  filaments(count, 176, random, (i, s, line, brightness) => {
    const along = 2 * s - 1, across = 2 * line - 1;
    u[i] = along; v[i] = across;
    csp[i] = Math.cos(Math.PI * along); ssp[i] = Math.sin(Math.PI * along);
    ctw[i] = Math.cos(1.5 * Math.PI * along); stw[i] = Math.sin(1.5 * Math.PI * along);
    cfold[i] = Math.cos(16 * Math.PI * across + TAU * along);
    sfold[i] = Math.sin(16 * Math.PI * across + TAU * along);
    cfine[i] = Math.cos(28 * Math.PI * across - 2 * TAU * along);
    sfine[i] = Math.sin(28 * Math.PI * across - 2 * TAU * along);
    gain[i] = brightness * (0.64 + 0.16 * Math.cos(Math.PI * along / 2));
  });
  return (t, amount) => {
    const ct = Math.cos(TAU * t), st = Math.sin(TAU * t);
    const ct2 = Math.cos(2 * TAU * t), st2 = Math.sin(2 * TAU * t);
    const roll = 0.45 * st, cr = Math.cos(roll), sr = Math.sin(roll);
    const pleat = 0.016 + 0.035 * amount;
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const co = ctw[i] * cr - stw[i] * sr;
      const si = stw[i] * cr + ctw[i] * sr;
      const spineY = 0.135 * (ssp[i] * ct + csp[i] * st);
      const spineZ = 0.15 * (csp[i] * ct + ssp[i] * st);
      const width = 0.385 * v[i] * (0.94 + 0.08 * (csp[i] * ct + ssp[i] * st));
      const fold = pleat * (cfold[i] * ct + sfold[i] * st)
        + 0.011 * (cfine[i] * ct2 - sfine[i] * st2);
      data[j] = 0.84 * u[i];
      data[j + 1] = spineY + width * co - fold * si;
      data[j + 2] = spineZ + width * si + fold * co;
      data[j + 3] = gain[i];
    }
    return data;
  };
}

function orbit(count, random, data) {
  const [px, py, c7, s7, ringIndex, gain] = arrays(count, 6);
  const rings = 7, strands = 7, radii = [0.255, 0.350, 0.445, 0.540, 0.635, 0.730, 0.825];
  filaments(count, rings * strands, random, (i, s, _line, brightness, line) => {
    const ring = Math.floor(line / strands), strand = line % strands;
    const angle = TAU * s;
    const r = radii[ring] + (strand - (strands - 1) / 2) * 0.0028;
    px[i] = r * Math.cos(angle); py[i] = r * 0.86 * Math.sin(angle);
    c7[i] = Math.cos(7 * angle + ring * 0.71);
    s7[i] = Math.sin(7 * angle + ring * 0.71);
    ringIndex[i] = ring;
    gain[i] = brightness * (0.30 + ring * 0.027) * (strand === 3 ? 1.15 : 0.87);
  });
  const matrices = Array.from({ length: rings }, () => new Float64Array(4));
  return (t, amount) => {
    const ct = Math.cos(TAU * t), st = Math.sin(TAU * t);
    for (let k = 0; k < rings; k++) {
      const phase = k * 0.79;
      const alpha = 0.88 * Math.sin(k * 1.43) + (0.05 + 0.23 * amount) * Math.sin(TAU * t + phase);
      const beta = 0.75 * Math.cos(k * 1.17) + (0.06 + 0.21 * amount) * Math.cos(TAU * t + phase);
      matrices[k][0] = Math.cos(alpha); matrices[k][1] = Math.sin(alpha);
      matrices[k][2] = Math.cos(beta); matrices[k][3] = Math.sin(beta);
    }
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const m = matrices[ringIndex[i]];
      const z = (0.003 + 0.011 * amount) * (s7[i] * ct + c7[i] * st);
      const yy = py[i] * m[2] - z * m[3];
      const zz = py[i] * m[3] + z * m[2];
      data[j] = px[i] * m[0] + zz * m[1];
      data[j + 1] = yy;
      data[j + 2] = -px[i] * m[1] + zz * m[0];
      data[j + 3] = gain[i];
    }
    return data;
  };
}

const BUILDERS = { meridian, bloom, undertow, lattice, ribbon, orbit, ...TOPOLOGY_BUILDERS, ...FIELD_BUILDERS, ...DYNAMIC_BUILDERS };

/**
 * Construct a geometry once, then reuse its buffer for every render.
 * @param {string} id One of SCENES[].id.
 * @param {{count?: number, seed?: number, variation?: number}} options
 * @returns {{count: number, data: Float32Array, update: (t:number, variation?:number)=>Float32Array}}
 */
export function createScene(id, { count = 50000, seed = 42, variation = 0.5 } = {}) {
  const meta=SCENES.find(s=>s.id===id);
  if(meta?.kind==='shader') return {kind:'shader',id,source:meta.source,palette:meta.palette,seed:seededRandom(seed)()*1000};
  const build = BUILDERS[id];
  if (!build) throw new RangeError(`Unknown study “${id}”. Choose ${Object.keys(BUILDERS).join(', ')}.`);
  if (!Number.isFinite(count) || count < 1 || count > 2000000) {
    throw new RangeError('Particle count must be between 1 and 2,000,000.');
  }
  count = Math.floor(count);
  const data = new Float32Array(count * 4);
  const evaluate = build(count, seededRandom(seed), data);
  let amount = Number.isFinite(variation) ? clamp(variation, 0, 1) : 0.5;
  const scene = {
    count, data,
    update(t, nextVariation = amount) {
      if (Number.isFinite(nextVariation)) amount = clamp(nextVariation, 0, 1);
      return evaluate(loopPhase(t), amount);
    },
  };
  scene.update(0);
  return scene;
}

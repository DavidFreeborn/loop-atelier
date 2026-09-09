/**
 * Three original field studies. No copied artwork, sketch, or noise code.
 * Builders own static samples and return update(t, amount), filling the supplied
 * [x,y,z,intensity] Float32Array without allocating in the frame loop.
 */
const TAU = 2 * Math.PI;

export const FIELD_SCENES = [
  {
    id: 'gyroid', title: 'Gyroid', subtitle: 'A porous nodal architecture',
    description: 'A continuous labyrinth of saddle surfaces breathes inside a cut cube. Its openings pass through the sculpture; fine granular light reveals the walls between them.',
    technique: 'Area-weighted samples of a marching-tetrahedra approximation to sin x cos y + sin y cos z + sin z cos x = 0. A periodic normal wave deforms this nodal approximation; it is not an exact minimal-surface solver.',
    formula: 'G = sin x cos y + sin y cos z + sin z cos x = 0; P(t) = P₀ + a n sin(τt + φ)',
    duration: 10, camera: { yaw: 0.48, pitch: 0.29, distance: 3.5 },
    pointSize: 1.28, exposure: 1.3,
  },
  {
    id: 'resonance', title: 'Resonance', subtitle: 'Two modes in quadrature',
    description: 'Luminous nodal curves travel across a dark square membrane. Straight divisions open into curved chambers and exchange places as two resonant modes interfere.',
    technique: 'Quadrature superposition of the degenerate square Neumann modes (2,5) and (5,2). Brightness traces the instantaneous zero set, displayed on an undulating saddle. This is an analytic modal field, not a simulation of sand or a bending plate.',
    formula: 'F(u,v,t) = cos(2πu)cos(5πv)cos τt + cos(5πu)cos(2πv)sin τt',
    duration: 12, camera: { yaw: 0.12, pitch: 0.64, distance: 3.55 },
    pointSize: 1.13, exposure: 7.861,
  },
  {
    id: 'harmonic', title: 'Harmonic', subtitle: 'An octupole changing basis',
    description: 'Eight layered lobes gather into an axial sculpture with a folded equatorial belt, then separate again. The centre stays dark as the entire harmonic form slowly turns.',
    technique: 'Two equal-energy, orthogonal real degree-three spherical harmonics are mixed continuously. A smooth magnitude maps the angular field to lobed radial volumes; it is a sculptural field visualization, not an electron-density calculation.',
    formula: 'Q = √105 xyz cos τt + (√7/2)(5z³ − 3z) sin τt, |n| = 1; r ∝ √(Q² + ε²) − ε',
    duration: 12, camera: { yaw: 0.48, pitch: 0.64, distance: 3.5 },
    pointSize: 1.22, exposure: 1.48,
  },
];

function arrays(count, n) { return Array.from({ length: n }, () => new Float32Array(count)); }

export function gyroidImplicit(x, y, z) {
  return Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x);
}

/** Analytic equations are exposed for mathematical validation and reuse. */
export function degreeThreeModes(x, y, z, out = new Float64Array(2)) {
  out[0] = Math.sqrt(105) * x * y * z;
  out[1] = .5 * Math.sqrt(7) * (2 * z * z * z - 3 * z * x * x - 3 * z * y * y);
  return out;
}

export function membraneModes(u, v, out = new Float64Array(2)) {
  out[0] = Math.cos(2 * Math.PI * u) * Math.cos(5 * Math.PI * v);
  out[1] = Math.cos(5 * Math.PI * u) * Math.cos(2 * Math.PI * v);
  return out;
}

// The topology is independent of seed and count, so compile it once per module.
let gyroidMesh;
function buildGyroidMesh() {
  if (gyroidMesh) return gyroidMesh;
  const divisions = 32, side = divisions + 1, step = TAU / divisions;
  const values = new Float64Array(side ** 3);
  const idx = (x, y, z) => (z * side + y) * side + x;
  for (let z = 0; z < side; z++) for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    values[idx(x, y, z)] = gyroidImplicit(-Math.PI + step * x, -Math.PI + step * y, -Math.PI + step * z);
  }
  const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
  const corners = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  const triangles = [], cumulative = [];
  let area = 0;
  const triangle = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const crossX = uy * vz - uz * vy, crossY = uz * vx - ux * vz, crossZ = ux * vy - uy * vx;
    const size = .5 * Math.hypot(crossX, crossY, crossZ);
    if (size < 1e-11) return;
    triangles.push(...a, ...b, ...c); area += size; cumulative.push(area);
  };
  for (let z = 0; z < divisions; z++) for (let y = 0; y < divisions; y++) for (let x = 0; x < divisions; x++) {
    const p = corners.map(([dx, dy, dz]) => [-Math.PI + step * (x + dx), -Math.PI + step * (y + dy), -Math.PI + step * (z + dz)]);
    const v = corners.map(([dx, dy, dz]) => values[idx(x + dx, y + dy, z + dz)]);
    const edge = (a, b) => {
      const t = v[a] / (v[a] - v[b]);
      return [p[a][0] + t * (p[b][0] - p[a][0]), p[a][1] + t * (p[b][1] - p[a][1]), p[a][2] + t * (p[b][2] - p[a][2])];
    };
    for (const tetra of tetrahedra) {
      const inside = tetra.filter(i => v[i] < 0), outside = tetra.filter(i => v[i] >= 0);
      if (inside.length === 1 || inside.length === 3) {
        const one = inside.length === 1 ? inside : outside, other = inside.length === 1 ? outside : inside;
        triangle(edge(one[0], other[0]), edge(one[0], other[1]), edge(one[0], other[2]));
      } else if (inside.length === 2) {
        const a = edge(inside[0], outside[0]), b = edge(inside[0], outside[1]);
        const c = edge(inside[1], outside[0]), d = edge(inside[1], outside[1]);
        triangle(a, b, d); triangle(a, d, c);
      }
    }
  }
  gyroidMesh = { triangles: Float64Array.from(triangles), cumulative: Float64Array.from(cumulative), area };
  return gyroidMesh;
}

function gyroid(count, random, data) {
  const mesh = buildGyroidMesh(), scale = .655 / Math.PI;
  const [px, py, pz, nx, ny, nz, phaseC, phaseS, gain] = arrays(count, 9);
  let triangle = 0;
  for (let i = 0; i < count; i++) {
    const target = (i + random()) / count * mesh.area;
    while (triangle < mesh.cumulative.length - 1 && mesh.cumulative[triangle] < target) triangle++;
    const k = triangle * 9, s = Math.sqrt(random()), b = random();
    const w0 = 1 - s, w1 = s * (1 - b), w2 = s * b;
    const m = mesh.triangles;
    const x = w0 * m[k] + w1 * m[k + 3] + w2 * m[k + 6];
    const y = w0 * m[k + 1] + w1 * m[k + 4] + w2 * m[k + 7];
    const z = w0 * m[k + 2] + w1 * m[k + 5] + w2 * m[k + 8];
    const gx = Math.cos(x) * Math.cos(y) - Math.sin(z) * Math.sin(x);
    const gy = -Math.sin(x) * Math.sin(y) + Math.cos(y) * Math.cos(z);
    const gz = -Math.sin(y) * Math.sin(z) + Math.cos(z) * Math.cos(x);
    const norm = Math.hypot(gx, gy, gz) || 1;
    px[i] = x * scale; py[i] = y * scale; pz[i] = z * scale;
    nx[i] = gx / norm; ny[i] = gy / norm; nz[i] = gz / norm;
    const phase = 1.1 * x - .8 * y + .65 * z;
    phaseC[i] = Math.cos(phase); phaseS[i] = Math.sin(phase);
    // Surface normals model the static scaffold, not exact normals after deformation.
    const illumination = .17 + .83 * Math.abs((.36 * gx + .67 * gy + .64 * gz) / norm);
    gain[i] = (.74 + .26 * random()) * illumination * .64;
  }
  return (t, amount = .5) => {
    const ct = Math.cos(TAU * t), st = Math.sin(TAU * t);
    const angle = .12 * st, ca = Math.cos(angle), sa = Math.sin(angle);
    const breath = .007 + .024 * amount;
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const wave = phaseS[i] * ct + phaseC[i] * st;
      const x = px[i] + breath * nx[i] * wave;
      const y = py[i] + breath * ny[i] * wave;
      const z = pz[i] + breath * nz[i] * wave;
      data[j] = ca * x + sa * z;
      data[j + 1] = y;
      data[j + 2] = -sa * x + ca * z;
      data[j + 3] = gain[i] * (.88 + .12 * wave);
    }
    return data;
  };
}

function resonance(count, random, data) {
  const [px, py, modeA, modeB, saddle, gain] = arrays(count, 6);
  const side = Math.ceil(Math.sqrt(count));
  const modes = new Float64Array(2);
  // Jittered strata avoid regular point-grid moiré while retaining uniform coverage.
  for (let i = 0; i < count; i++) {
    const u = ((i % side) + random()) / side;
    const v = (Math.floor(i / side) + random()) / side;
    px[i] = 1.66 * (u - .5); py[i] = 1.66 * (v - .5);
    saddle[i] = (u - .5) * (u - .5) - (v - .5) * (v - .5);
    membraneModes(u, v, modes); modeA[i] = modes[0]; modeB[i] = modes[1];
    gain[i] = .8 + .2 * random();
  }
  return (t, amount = .5) => {
    const angle = TAU * t + .19;
    const a = Math.cos(angle), b = Math.sin(angle);
    const width = .032 + .026 * amount, inverseWidth2 = 1 / (width * width);
    const relief = .10 + .18 * amount;
    const bow = .8 + .25 * Math.sin(TAU * t);
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const value = a * modeA[i] + b * modeB[i];
      const denominator = 1 + value * value * inverseWidth2;
      const nodal = 1 / (denominator * denominator);
      data[j] = px[i]; data[j + 1] = py[i]; data[j + 2] = relief * value + bow * saddle[i];
      data[j + 3] = gain[i] * (.015 + 5.6 * nodal) / 5.615;
    }
    return data;
  };
}

function harmonic(count, random, data) {
  const [nx, ny, nz, modeA, modeB, radial, gain] = arrays(count, 7);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const rotation = TAU * random();
  const modes = new Float64Array(2);
  for (let i = 0; i < count; i++) {
    // Equal-area directions interleave thirteen lightly jittered radial layers.
    const y = 1 - 2 * (i + .5) / count;
    const angle = golden * i + rotation, r = Math.sqrt(Math.max(0, 1 - y * y));
    const x = r * Math.cos(angle), z = r * Math.sin(angle);
    nx[i] = x; ny[i] = y; nz[i] = z;
    // Both restrictions of homogeneous harmonic polynomials of degree three.
    // Constants make the sphere averages of A² and B² equal to one.
    degreeThreeModes(x, y, z, modes); modeA[i] = modes[0]; modeB[i] = modes[1];
    const layer = i % 13;
    radial[i] = .38 + .62 * Math.pow(layer / 12, .8) + (random() - .5) * .004;
    gain[i] = (.8 + .2 * random()) * (layer === 12 ? .95 : .22 + .40 * layer / 12);
  }
  return (t, amount = .5) => {
    const angle = TAU * t + .07, ct = Math.cos(angle), st = Math.sin(angle);
    const delta = .06 + .09 * (1 - amount), factor = .41;
    const rotation = .32 * Math.sin(TAU * t), cr = Math.cos(rotation), sr = Math.sin(rotation);
    const pitch = .27 * Math.cos(TAU * t), cp = Math.cos(pitch), sp = Math.sin(pitch);
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const value = ct * modeA[i] + st * modeB[i], squared = value * value;
      // Smooth through every nodal crossing; sqrt(x²+δ²) has finite derivatives.
      const radius = factor * (Math.sqrt(squared + delta * delta) - delta) * radial[i];
      const x = radius * nx[i], y = radius * ny[i], z = radius * nz[i];
      const yy = cp * y - sp * z, zz = sp * y + cp * z;
      data[j] = cr * x - sr * yy; data[j + 1] = sr * x + cr * yy; data[j + 2] = zz;
      // A smooth radial visibility window prevents density collapse at the
      // shared nodal centre. Signed brightness helps distinguish overlapping lobes.
      const r2 = radius * radius, r4 = r2 * r2;
      const centreFade = r4 / (r4 + .00042);
      const signLight = .72 + .28 * value / Math.sqrt(squared + .12);
      data[j + 3] = gain[i] * squared / (.24 + squared) * centreFade * signLight;
    }
    return data;
  };
}

export const FIELD_BUILDERS = { gyroid, resonance, harmonic };

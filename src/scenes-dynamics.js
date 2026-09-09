/**
 * Original recursive and dynamical studies for Loop Atelier.
 *
 * Builders fill [x, y, z, intensity] in the supplied Float32Array. Confluence
 * is pointwise periodic. Descent is visibly periodic under a layer permutation;
 * identical templates and an exactly dark recycling interval make that explicit.
 * Neither builder integrates persistent state or allocates inside update().
 */
const TAU = Math.PI * 2;
const wrap = value => Number.isFinite(value) ? value - Math.floor(value) : 0;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth5 = value => {
  const x = clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

export const DYNAMIC_SCENES = [
  {
    id: 'descent', title: 'Descent', subtitle: 'An endless spiral of thresholds',
    previewCount: 360000,
    description: 'Nested, finely ruled thresholds expand toward the viewer. Each reveals another inside it, while the entire stairwell turns through a quiet logarithmic spiral.',
    technique: 'Identical pleated square galleries occupy eight logarithmic scales. A quintic visibility window conceals recycling; each loop permutes the galleries exactly.',
    formula: 'sₖ = (k − t) mod 8; rₖ = 1.18 exp(−0.405 sₖ); θₖ = αsₖ + ε sin(τt)',
    duration: 8, camera: { yaw: 0.10, pitch: 0.30, distance: 3.85 },
    pointSize: 1.20, exposure: 2.45, loopTopology: 'permutation',
  },
  {
    id: 'confluence', title: 'Confluence', subtitle: 'Three currents through a double scroll',
    description: 'Three broad ruled ribbons braid around a double-scroll orbit. A sequence of smooth shears stretches its lobes and turns the crossing through space, keeping every thread distinct.',
    technique: 'A closed, three-strand ribbon braid is carried by six cyclic sine shears. Each shear has unit Jacobian determinant; their composition creates a smooth, volume-preserving deformation.',
    formula: 'Sₓ: x ← x + a sin(ky + τt); Sᵧ: y ← y + b sin(kz − τt); S_z: z ← z + c sin(kx + τt)',
    duration: 10, camera: { yaw: 0.12, pitch: 0.22, distance: 3.65 },
    pointSize: 1.02, exposure: 1.06,
  },
];

function descent(count, random, data) {
  const layers = Math.min(8, count);
  const perLayer = Math.floor(count / layers);
  const active = layers * perLayer;
  const lineCount = Math.min(32, perLayer);
  const tx = new Float32Array(perLayer);
  const ty = new Float32Array(perLayer);
  const terrace = new Float32Array(perLayer);
  const c4 = new Float32Array(perLayer);
  const s4 = new Float32Array(perLayer);
  const c12 = new Float32Array(perLayer);
  const s12 = new Float32Array(perLayer);
  const pleatEnvelope = new Float32Array(perLayer);
  const gain = new Float32Array(perLayer);
  // Every gallery uses this SAME template, including sampling and light. Unique
  // random offsets per gallery would break the exact permutation at the seam.
  for (let line = 0; line < lineCount; line++) {
    const start = Math.floor(line * perLayer / lineCount);
    const end = Math.floor((line + 1) * perLayer / lineCount);
    const offset = random();
    const v = lineCount === 1 ? 0.5 : (line + 0.12 * (random() - 0.5)) / (lineCount - 1);
    const brightness = 0.84 + 0.16 * random();
    const radius = 0.725 + 0.265 * v;
    const bevelTwist = 0.20 * (v - 0.5);
    const cb = Math.cos(bevelTwist), sb = Math.sin(bevelTwist);
    for (let i = start; i < end; i++) {
      const u = TAU * (i - start + offset) / (end - start);
      const cu = Math.cos(u), su = Math.sin(u);
      // Polar superellipse parametrisation avoids the point-density singularity
      // of the customary signed |cos(u)|^(2/p) representation near its axes.
      const squareness = Math.pow(cu ** 6 + su ** 6, -1 / 6);
      tx[i] = radius * squareness * (cu * cb - su * sb);
      ty[i] = radius * squareness * (cu * sb + su * cb);
      terrace[i] = 0.39 * (v - 0.5) + 0.085 * Math.cos(4 * u) * (2 * v - 1);
      c4[i] = Math.cos(4 * u);
      s4[i] = Math.sin(4 * u);
      c12[i] = Math.cos(12 * u + 1.2 * v);
      s12[i] = Math.sin(12 * u + 1.2 * v);
      pleatEnvelope[i] = Math.sin(Math.PI * clamp(v, 0, 1));
      gain[i] = brightness * (0.85 + 0.15 * Math.sin(2 * u) ** 2)
        * (line === 0 || line === lineCount - 1 ? 1.14 : 0.92);
    }
  }
  const fadeWidth = Math.min(0.72, layers * 0.28);
  const darkMargin = Math.min(0.16, layers * 0.08);
  // At arbitrary counts, fewer than eight unused particles remain black. This
  // preserves equal populations per gallery and therefore the exact image loop.
  for (let i = active * 4; i < data.length; i++) data[i] = 0;
  return (time, amount = 0.5) => {
    const t = wrap(time), a = clamp(amount, 0, 1);
    const ct = Math.cos(TAU * t), st = Math.sin(TAU * t);
    const twist = 0.37 + 0.54 * a;
    for (let layer = 0; layer < layers; layer++) {
      let s = layer - t;
      if (s < 0) s += layers;
      const scale = 1.18 * Math.exp(-0.405 * s);
      const theta = twist * s + 0.08 * st;
      const ca = Math.cos(theta), sa = Math.sin(theta);
      const window = smooth5((s - darkMargin) / fadeWidth)
        * smooth5((layers - darkMargin - s) / fadeWidth);
      const light = window * Math.pow(scale, 1.45);
      const depth = 0.032 * ((layers - 1) / 2 - s);
      for (let i = 0, j = layer * perLayer * 4; i < perLayer; i++, j += 4) {
        const x = tx[i] * scale, y = ty[i] * scale;
        data[j] = x * ca - y * sa;
        data[j + 1] = x * sa + y * ca;
        data[j + 2] = depth + scale * (terrace[i]
          + (0.025 + 0.035 * a) * (s4[i] * ct + c4[i] * st)
          + (0.055 + 0.045 * a) * pleatEnvelope[i] * (s12[i] * ct - c12[i] * st));
        data[j + 3] = gain[i] * light;
      }
    }
    return data;
  };
}

function confluence(count, random, data) {
  const strands = 3;
  const linesPerStrand = 36;
  const lines = Math.min(strands * linesPerStrand, count);
  const px = new Float32Array(count);
  const py = new Float32Array(count);
  const pz = new Float32Array(count);
  const c2 = new Float32Array(count);
  const s2 = new Float32Array(count);
  const gain = new Float32Array(count);
  for (let line = 0; line < lines; line++) {
    const start = Math.floor(line * count / lines);
    const end = Math.floor((line + 1) * count / lines);
    const strand = Math.floor(line * strands / lines);
    const first = Math.floor(strand * lines / strands);
    const last = Math.floor((strand + 1) * lines / strands);
    const v = last - first <= 1 ? 0 : (line - first) / (last - first - 1) - 0.5;
    const sampleOffset = random();
    const brightness = 0.85 + 0.15 * random();
    const phase = strand * TAU / strands;
    for (let i = start; i < end; i++) {
      const u = TAU * (i - start + sampleOffset) / (end - start);
      const su = Math.sin(u), cu = Math.cos(u);
      const s2u = Math.sin(2 * u), c2u = Math.cos(2 * u);
      // A closed double-scroll centreline. Its tangent never vanishes. Using
      // its projected normal rather than a Frenet frame avoids inflection flips.
      let dx = 0.67 * cu, dy = 0.88 * c2u, dz = -0.245 * su;
      const tangentLength = Math.hypot(dx, dy, dz);
      dx /= tangentLength; dy /= tangentLength; dz /= tangentLength;
      const horizontalLength = Math.hypot(dx, dy);
      const nx = -dy / horizontalLength, ny = dx / horizontalLength;
      const bx = -dz * ny, by = dz * nx, bz = dx * ny - dy * nx;
      const braidAngle = 3 * u + phase;
      const radius = 0.125 + 0.115 * v;
      const normal = radius * Math.cos(braidAngle);
      const binormal = radius * Math.sin(braidAngle);
      px[i] = 0.67 * su + normal * nx + binormal * bx;
      py[i] = 0.44 * s2u + normal * ny + binormal * by;
      pz[i] = 0.245 * cu + binormal * bz;
      c2[i] = c2u; s2[i] = s2u;
      gain[i] = brightness * (0.43 + 0.11 * Math.abs(v) * 2);
    }
  }
  return (time, amount = 0.5) => {
    const t = wrap(time), a = clamp(amount, 0, 1);
    const phase = TAU * t, ct = Math.cos(phase), st = Math.sin(phase);
    const ax = 0.14 + 0.16 * a, ay = 0.11 + 0.12 * a, az = 0.14 + 0.15 * a;
    const secondary = 0.055 + 0.065 * a;
    const displayScale = 0.99 / (1 + 0.12 * a);
    // Evaluate the same shear composition at the origin and subtract it: this
    // translation keeps the sculpture framed without changing its Jacobian.
    let ox = ax * st;
    let oy = ay * Math.sin(-phase);
    let oz = az * Math.sin(3.7 * ox + phase);
    ox += secondary * Math.sin(4.2 * oy - phase);
    oy += secondary * Math.sin(3.9 * oz + 2 * phase);
    oz += secondary * Math.sin(3.4 * ox - 2 * phase);
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      let x = px[i], y = py[i], z = pz[i];
      x += ax * Math.sin(3.4 * y + phase);
      y += ay * Math.sin(3.1 * z - phase);
      z += az * Math.sin(3.7 * x + phase);
      x += secondary * Math.sin(4.2 * y - phase);
      y += secondary * Math.sin(3.9 * z + 2 * phase);
      z += secondary * Math.sin(3.4 * x - 2 * phase);
      data[j] = displayScale * (x - ox);
      data[j + 1] = displayScale * (y - oy);
      data[j + 2] = displayScale * (z - oz);
      const travellingLight = c2[i] * ct + s2[i] * st;
      data[j + 3] = gain[i] * (0.77 + 0.23 * travellingLight * travellingLight);
    }
    return data;
  };
}

export const DYNAMIC_BUILDERS = { descent, confluence };

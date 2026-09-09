/**
 * Loop Atelier — three original topology studies.
 *
 * Builder contract: (count, seededRandom, packedBuffer) => update(phase, amount).
 * Buffer layout is [x, y, z, intensity]. Builders allocate their immutable
 * spatial coefficients once. Every temporal component is periodic and smooth.
 * No original artist source, meshes, or artwork are used.
 */

const TAU = 2 * Math.PI;
const phaseOf = t => Number.isFinite(t) ? t - Math.floor(t) : 0;
const amountOf = a => Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 0.5;
const arrays = (count, n) => Array.from({ length: n }, () => new Float32Array(count));

export const TOPOLOGY_SCENES = [
  {
    id: 'hopf', title: 'Hopf', subtitle: 'Every circle linked to every other',
    description: 'Eighteen bands of linked circles swell, contract, and exchange prominence as the three-sphere turns beneath a stereographic projection. Every pair remains linked throughout the transformation.',
    technique: 'Complex Hopf fibres on S³ undergo a periodic SU(2) rotation before stereographic projection. The unitary transformation mixes the two complex coordinates while preserving the exact circles and their linkage.',
    formula: '(z₁,z₂) = (cos η eⁱ⁽ψ⁺φ⁾, sin η eⁱψ); P = (Re z₁, Im z₁, Re z₂)/(1 − Im z₂)',
    duration: 10, camera: { yaw: 0.18, pitch: 0.68, distance: 3.4 },
    pointSize: 1.13, exposure: 1.14,
  },
  {
    id: 'trefoil', title: 'Trefoil', subtitle: 'A knot carrying seven braids',
    description: 'Seven fine cable ribbons wind around a trefoil. A travelling twist threads the three crossings while a slow rocking motion reveals which strands pass over and under.',
    technique: 'A (2,3) torus knot with a periodic orthonormal frame. Seven separated filament bands travel around its cross-section; a smooth rigid precession reveals the crossings.',
    formula: 'C(u) = ((R+r cos 3u) cos 2u, (R+r cos 3u) sin 2u, r sin 3u); P = C + aN + bB',
    duration: 9, camera: { yaw: -0.15, pitch: 0.44, distance: 3.4 },
    pointSize: 1.15, exposure: 1.13,
  },
  {
    id: 'klein', title: 'Klein', subtitle: 'A surface that changes sides',
    description: 'A figure-eight cross-section makes one half-twist around a ring. Fine threads pass through the immersion’s shared circle, exposing the geometry of a non-orientable surface.',
    technique: 'A figure-eight immersion of the Klein bottle in R³. A double traversal closes each filament; the self-intersection is intrinsic to this particular 3D immersion and is shown openly.',
    formula: 'A+iB = eⁱ⁽ᵘ⁄²⁺δ⁾(sin v + iκ sin 2v); P = ((R+A) cos u, (R+A) sin u, B)',
    duration: 10, camera: { yaw: 0.23, pitch: 0.68, distance: 3.4 },
    pointSize: 1.10, exposure: 1.08,
  },
];

/** Balanced, independently phase-offset sampling keeps each curve continuous. */
function sampleLines(count, requestedLines, random, setup, visit) {
  const lines = Math.max(1, Math.min(requestedLines, count));
  for (let line = 0; line < lines; line++) {
    const start = Math.floor(line * count / lines);
    const end = Math.floor((line + 1) * count / lines);
    const offset = random(), gain = 0.76 + random() * 0.24;
    setup(line, gain);
    for (let i = start; i < end; i++) visit(i, (i - start + offset) / (end - start), line, gain);
  }
  return lines;
}

function hopf(count, random, data) {
  const [cpsi, spsi, ringIndex, gain, shimmer] = arrays(count, 5);
  const requestedLines = 144, lineParameters = [];
  sampleLines(count, requestedLines, random, (line, brightness) => {
    // A band is eight nearby but distinct fibres. Latitude ranges are disjoint,
    // and azimuth spacing within each latitude remains fixed throughout a loop.
    const band = Math.floor(line / 8), strand = line % 8;
    const shell = Math.floor(band / 6), azimuth = band % 6;
    const across = (strand + 0.5) / 8 - 0.5;
    const phi = TAU * azimuth / 6;
    lineParameters.push({
      eta: [0.245, 0.435, 0.625][shell] + across * 0.026,
      phi: phi + across * 0.16,
      shell, pulse: phi + shell * 1.1,
      gain: brightness * (0.57 + 0.23 * Math.cos(Math.PI * across)),
    });
  }, (i, s, line) => {
    const psi = TAU * s;
    cpsi[i] = Math.cos(psi); spsi[i] = Math.sin(psi);
    ringIndex[i] = line;
    gain[i] = lineParameters[line].gain;
    shimmer[i] = 0.66 + 0.22 * Math.cos(3 * psi + lineParameters[line].phi);
  });
  const coefficients = lineParameters.map(() => new Float64Array(9));
  return (time, variation = 0.5) => {
    const t = phaseOf(time), amount = amountOf(variation), angle = TAU * t;
    const ct = Math.cos(angle), st = Math.sin(angle);
    // This SU(2) transformation commutes with the fibre's common complex phase.
    // It therefore sends complete Hopf circles to complete Hopf circles. Turning
    // the three-sphere relative to the projection pole changes their apparent
    // sizes and centres much more substantially than a rigid 3D camera orbit.
    const mixing = (0.15 + 0.24 * amount) * st;
    const cm = Math.cos(mixing), sm = Math.sin(mixing);
    const axis = 0.65 * ct + 0.25 * Math.sin(2 * angle);
    const cg = Math.cos(axis), sg = Math.sin(axis);
    const scale = 0.467 / (1 + 5.4 * mixing * mixing);
    for (let line = 0; line < lineParameters.length; line++) {
      const p = lineParameters[line], c = coefficients[line];
      const eta = p.eta + (0.014 + 0.021 * amount) * Math.sin(angle + p.pulse);
      const phi = p.phi + (0.13 + 0.31 * amount) * Math.sin(angle + p.shell * 1.4);
      const ce = Math.cos(eta), se = Math.sin(eta);
      const ar = ce * Math.cos(phi), ai = ce * Math.sin(phi);
      // (a',b') = (cos β a + sin β e^(iγ)b,
      //           -sin β e^(-iγ)a + cos β b), with a gently moving mixing axis.
      const aReal = cm * ar + sm * se * cg;
      const aImag = cm * ai + sm * se * sg;
      const bReal = -sm * (ar * cg + ai * sg) + cm * se;
      const bImag = -sm * (ai * cg - ar * sg);
      // Projected circles are sampled uniformly in Euclidean arc length. Direct
      // uniform S³ samples become sparse on the expanded arcs and dotted in a
      // live one-sample render. The following exact circle frame removes that
      // distortion without fitting or approximating the Hopf fibre.
      const a2 = aReal * aReal + aImag * aImag;
      const denominator = 1 - bImag;
      const centreX = (aReal * bImag - aImag * bReal) / a2;
      const centreY = (aImag * bImag + aReal * bReal) / a2;
      const radius = scale / Math.sqrt(a2);
      c[0] = scale * centreX; c[1] = scale * centreY; c[2] = 0;
      // First radius vector: image of ψ=0 minus the circle centre. Second:
      // normalized derivative at ψ=0, times the radius. Both remain smooth even
      // if b'=0, unlike a frame defined by the argument of the complex b'.
      c[3] = scale * (aReal / denominator - centreX);
      c[4] = scale * (aImag / denominator - centreY);
      c[5] = scale * bReal / denominator;
      c[6] = radius * (-aImag + aReal * bReal / denominator);
      c[7] = radius * (aReal + aImag * bReal / denominator);
      c[8] = radius * (-bImag + bReal * bReal / denominator);
    }
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const c = coefficients[ringIndex[i]];
      // Advect samples once around the exact circle, in addition to moving its
      // base point. This is a change of parameter, not an approximate spline.
      const cp = cpsi[i] * ct - spsi[i] * st;
      const sp = spsi[i] * ct + cpsi[i] * st;
      data[j] = c[0] + c[3] * cp + c[6] * sp;
      data[j + 1] = c[1] + c[4] * cp + c[7] * sp;
      data[j + 2] = c[2] + c[5] * cp + c[8] * sp;
      data[j + 3] = gain[i] * shimmer[i];
    }
    return data;
  };
}

function trefoil(count, random, data) {
  const [px, py, pz, nx, ny, nz, bx, by, bz, cb, sb, c3u, s3u, gain] = arrays(count, 14);
  const R = 0.535, r = 0.235;
  sampleLines(count, 168, random, () => {}, (i, s, line, brightness) => {
    const u = TAU * s;
    const c2 = Math.cos(2 * u), s2 = Math.sin(2 * u);
    const c3 = Math.cos(3 * u), s3 = Math.sin(3 * u);
    const rho = R + r * c3, tangentLength = Math.hypot(3 * r, 2 * rho);
    px[i] = rho * c2; py[i] = rho * s2; pz[i] = r * s3;
    // N is the unit normal of the supporting torus. B = T × N is orthogonal
    // to both N and the knot tangent. This avoids a Frenet-frame singularity.
    nx[i] = c3 * c2; ny[i] = c3 * s2; nz[i] = s3;
    const radial = 2 * rho * s3 / tangentLength;
    const angular = 3 * r / tangentLength;
    bx[i] = radial * c2 - angular * s2;
    by[i] = radial * s2 + angular * c2;
    bz[i] = -2 * rho * c3 / tangentLength;
    const band = Math.floor(line / 24), strand = line % 24;
    const across = (strand + 0.5) / 24 - 0.5;
    const v = TAU * (band + across * 0.56) / 7;
    cb[i] = Math.cos(v + 5 * u); sb[i] = Math.sin(v + 5 * u);
    c3u[i] = c3; s3u[i] = s3;
    gain[i] = brightness * (0.57 + 0.26 * Math.cos(Math.PI * across));
  });
  return (time, variation = 0.5) => {
    const t = phaseOf(time), amount = amountOf(variation), angle = TAU * t;
    const ct = Math.cos(angle), st = Math.sin(angle);
    const ct2 = Math.cos(2 * angle), st2 = Math.sin(2 * angle);
    const radius = 0.071 + 0.020 * amount;
    const yaw = 0.65 * st, pitch = 0.22 * ct, roll = 0.14 * st2;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const pulse = s3u[i] * ct2 - c3u[i] * st2;
      const tube = radius * (1 + 0.12 * pulse);
      const breath = (0.007 + 0.013 * amount) * (s3u[i] * ct - c3u[i] * st);
      const a = breath + tube * (cb[i] * ct - sb[i] * st);
      const b = tube * (sb[i] * ct + cb[i] * st);
      const x = px[i] + a * nx[i] + b * bx[i];
      const y = py[i] + a * ny[i] + b * by[i];
      const z = pz[i] + a * nz[i] + b * bz[i];
      const xx = cy * x + sy * z, zz = -sy * x + cy * z;
      const yy = cp * y - sp * zz, zzz = sp * y + cp * zz;
      data[j] = cr * xx - sr * yy;
      data[j + 1] = sr * xx + cr * yy;
      data[j + 2] = zzz;
      data[j + 3] = gain[i] * (0.72 + 0.14 * pulse);
    }
    return data;
  };
}

function klein(count, random, data) {
  const [cu, su, ch, sh, pv, qv, gain] = arrays(count, 7);
  const requestedLines = 176, lines = Math.min(count, requestedLines);
  sampleLines(count, requestedLines, random, () => {}, (i, s, line, brightness) => {
    // u traverses twice, while v covers half its usual domain. This samples
    // the quotient once and closes every filament under its reversed gluing.
    const u = 2 * TAU * s, v = Math.PI * (line + 0.5) / lines;
    cu[i] = Math.cos(u); su[i] = Math.sin(u);
    ch[i] = Math.cos(u / 2); sh[i] = Math.sin(u / 2);
    pv[i] = Math.sin(v); qv[i] = Math.sin(2 * v);
    gain[i] = brightness * (0.38 + 0.40 * Math.sin(v));
  });
  return (time, variation = 0.5) => {
    const t = phaseOf(time), amount = amountOf(variation), angle = TAU * t;
    const ct = Math.cos(angle), st = Math.sin(angle);
    const roll = 0.70 * st, cr = Math.cos(roll), sr = Math.sin(roll);
    const crossSection = 0.81 + 0.20 * amount, ratio = 0.74 + 0.065 * ct;
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const co = ch[i] * cr - sh[i] * sr, si = sh[i] * cr + ch[i] * sr;
      const wave = cu[i] * ct + su[i] * st;
      const width = crossSection * (1 + 0.05 * wave);
      const a = width * (pv[i] * co - ratio * qv[i] * si);
      const b = width * (pv[i] * si + ratio * qv[i] * co);
      const R = 1.75 + (0.04 + 0.13 * amount) * (su[i] * ct - cu[i] * st);
      data[j] = 0.33 * (R + a) * cu[i];
      data[j + 1] = 0.33 * (R + a) * su[i];
      data[j + 2] = 0.33 * b;
      data[j + 3] = gain[i] * (0.76 + 0.09 * wave);
    }
    return data;
  };
}

export const TOPOLOGY_BUILDERS = { hopf, trefoil, klein };

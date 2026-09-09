/**
 * Beginner recipe: a queue of identical luminous clusters on a closed spline.
 * This implements the same {count, data, update(t)} interface as the six studies.
 *
 * const scene = createReplacementScene({ count: 15000, seed: 42 });
 * renderer.render(scene, phase, {
 *   pointSize: 1.2, exposure: 1.0,
 *   camera: { yaw: 0.1, pitch: 0.2, distance: 3.4 },
 * });
 *
 * To change the artwork, first change PATH, then the width of a cluster. Keep
 * the per-cluster samples identical: arbitrary randomness per queue item would
 * reveal the replacement at the seam. The geometry contains no trail history.
 */

import { createClosedPath, seededRandom, replacementPhase } from './primitives.js';

const PATH = [
  [0.78, 0.02, 0.0], [0.35, 0.58, -0.18], [-0.45, 0.48, 0.22],
  [-0.76, -0.12, -0.08], [-0.22, -0.55, 0.16], [0.56, -0.42, 0.25],
];

export function createReplacementScene({ count = 15000, seed = 42 } = {}) {
  if (!Number.isInteger(count) || count < 12 || count > 2000000) {
    throw new RangeError('The replacement example needs an integer count between 12 and 2,000,000.');
  }
  // A divisor gives every cluster exactly the same samples even for custom
  // counts. Prime counts fall back to one cluster, which simply closes itself.
  let clusters = Math.min(12, count);
  while (count % clusters) clusters--;
  const perCluster = count / clusters;
  const random = seededRandom(seed), sample = createClosedPath(PATH);
  const offsets = new Float32Array(perCluster * 5);
  for (let i = 0; i < perCluster; i++) {
    const j = i * 5, along = random();
    offsets[j] = (along - 0.5) * 0.50 / clusters;
    // Summing two uniform samples gives a soft centre without a noise package.
    offsets[j + 1] = (random() + random() - 1) * 0.018;
    offsets[j + 2] = (random() + random() - 1) * 0.018;
    offsets[j + 3] = (random() + random() - 1) * 0.018;
    offsets[j + 4] = 0.08 + 0.64 * Math.sin(Math.PI * along) ** 2;
  }
  const data = new Float32Array(count * 4), position = new Float64Array(3);
  const scene = {
    count, data,
    update(t) {
      for (let cluster = 0; cluster < clusters; cluster++) {
        const centre = replacementPhase(cluster, clusters, t);
        for (let i = 0; i < perCluster; i++) {
          const source = i * 5, target = (cluster * perCluster + i) * 4;
          sample(centre + offsets[source], position);
          data[target] = position[0] + offsets[source + 1];
          data[target + 1] = position[1] + offsets[source + 2];
          data[target + 2] = position[2] + offsets[source + 3];
          data[target + 3] = offsets[source + 4];
        }
      }
      return data;
    },
  };
  scene.update(0);
  return scene;
}

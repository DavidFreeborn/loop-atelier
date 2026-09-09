import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, SCENES } from '../src/scenes.js';

test('Descent explicitly declares its visible permutation topology', () => {
  assert.equal(SCENES.find(scene => scene.id === 'descent').loopTopology, 'permutation');
  assert.notEqual(SCENES.find(scene => scene.id === 'confluence').loopTopology, 'permutation');
});

// Include nonmultiples of eight: unequal gallery populations would cause a real
// image seam even when an endpoint-only test happened to pass after phase wrap.
for (const count of [4096, 4099, 60000, 60003, 180000, 360000]) {
  test(`Descent: ${count} particles preserve visible positions and velocities under the gallery permutation`, () => {
    const scene = createScene('descent', { count, seed: 1831 });
    const layers = 8, perLayer = Math.floor(count / layers), active = layers * perLayer;
    const h = 0.0005;
    for (const amount of [0, 0.5, 1]) {
      const centre = scene.update(0, amount).slice();
      const left = scene.update(1 - h, amount).slice();
      const right = scene.update(h, amount).slice();
      assert.deepEqual(scene.update(1, amount), centre);
      let squaredVelocityError = 0;
      let maximumVisibleStep = 0;
      let visibleParticles = 0;
      for (let layer = 0; layer < layers; layer++) {
        // The previous cycle's next gallery arrives at this gallery's scale.
        const previousLayer = (layer + 1) % layers;
        for (let point = 0; point < perLayer; point++) {
          const middleIndex = (layer * perLayer + point) * 4;
          const previousIndex = (previousLayer * perLayer + point) * 4;
          const w0 = centre[middleIndex + 3], wl = left[previousIndex + 3], wr = right[middleIndex + 3];
          if (layer === 0) {
            // Coordinates reset here; the ENTIRE replacement interval is black.
            assert.equal(w0, 0); assert.equal(wl, 0); assert.equal(wr, 0);
          }
          if (w0 > 0.0001) {
            visibleParticles++;
            assert.ok(wl > 0 && wr > 0, 'A visible strand disappeared at the cycle boundary.');
            for (let coordinate = 0; coordinate < 3; coordinate++) {
              maximumVisibleStep = Math.max(maximumVisibleStep,
                Math.abs(centre[middleIndex + coordinate] - left[previousIndex + coordinate]),
                Math.abs(right[middleIndex + coordinate] - centre[middleIndex + coordinate]));
            }
          }
          // Check emitted light and its first moments, not meaningless movement
          // of zero-radiance particles. With the matched visible coordinates
          // above, this checks the actual position/intensity seam and its slope.
          for (let component = 0; component < 4; component++) {
            const middle = component === 3 ? w0 : w0 * centre[middleIndex + component];
            const before = component === 3 ? wl : wl * left[previousIndex + component];
            const after = component === 3 ? wr : wr * right[middleIndex + component];
            const velocityLeft = (middle - before) / h;
            const velocityRight = (after - middle) / h;
            squaredVelocityError += (velocityLeft - velocityRight) ** 2;
          }
        }
      }
      const disagreement = Math.sqrt(squaredVelocityError / (active * 4));
      assert.ok(visibleParticles > count / 2, 'The test must inspect a substantial visible population.');
      assert.ok(maximumVisibleStep < 8 * h, `Visible position discontinuity: ${maximumVisibleStep}.`);
      assert.ok(disagreement < 0.02, `Radiance velocity cusp after permutation: RMS ${disagreement}.`);
      for (const frame of [centre, left, right]) {
        for (let index = active * 4; index < frame.length; index++) {
          assert.equal(frame[index], 0, 'Remainder particles must stay black and stationary.');
        }
      }
    }
  });
}

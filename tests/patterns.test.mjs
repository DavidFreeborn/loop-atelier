/** Test the actual GLSL with an unwrapped phase uniform. Testing only capture(0)
 * against capture(1) would be vacuous: the public renderer wraps both to zero. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { PATTERN_SHADERS } from '../src/shaders-patterns.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }

test('Pattern GLSL: actual unwrapped images repeat, remain finite, and retain graphic contrast', async t => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    for (const shader of PATTERN_SHADERS) {
      await t.test(shader.id, async () => {
        await page.setContent('<canvas width="320" height="320"></canvas>');
        const result = await page.evaluate(({ source }) => {
          const canvas = document.querySelector('canvas');
          const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
          if (!gl) throw new Error('WebGL 2 unavailable');
          const compile = (type, code) => {
            const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
            return s;
          };
          const vs = compile(gl.VERTEX_SHADER, `#version 300 es
            void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`);
          const fs = compile(gl.FRAGMENT_SHADER, `#version 300 es
            precision highp float;
            uniform float uPhase,uVariation,uSeed,uResolution;
            uniform int uInspect;
            out vec4 colour;
            ${source}
            void main(){
              vec3 c=artwork(gl_FragCoord.xy/uResolution*2.-1.);
              bool invalid=any(isnan(c))||any(isinf(c))||any(lessThan(c,vec3(0.)))||any(greaterThan(c,vec3(32.)));
              if(uInspect==1){colour=vec4(invalid?vec3(1.):vec3(0.),1.);return;}
              vec3 v=1.-exp(-max(c,vec3(0.)));
              colour=vec4(mix(12.92*v,1.055*pow(v,vec3(1./2.4))-.055,step(vec3(.0031308),v)),1.);
            }`);
          const program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
          gl.useProgram(program); gl.bindVertexArray(gl.createVertexArray());
          gl.viewport(0, 0, 320, 320);
          const uniforms = Object.fromEntries(['uPhase','uVariation','uSeed','uResolution','uInspect'].map(k => [k, gl.getUniformLocation(program, k)]));
          gl.uniform1f(uniforms.uResolution, 320);
          const render = (phase, variation, seed, inspect = false) => {
            gl.uniform1f(uniforms.uPhase, phase); gl.uniform1f(uniforms.uVariation, variation); gl.uniform1f(uniforms.uSeed, seed);
            gl.uniform1i(uniforms.uInspect, inspect ? 1 : 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            const data = new Uint8Array(320 * 320 * 4); gl.readPixels(0, 0, 320, 320, gl.RGBA, gl.UNSIGNED_BYTE, data);
            if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL error during pattern validation');
            return data;
          };
          const difference = (a, b) => {
            let sum = 0, maximum = 0;
            for (let i = 0; i < a.length; i++) if (i % 4 !== 3) { const d = Math.abs(a[i] - b[i]); sum += d; maximum = Math.max(maximum, d); }
            return { mean: sum / (320 * 320 * 3), maximum };
          };
          const periods = [], invalid = [];
          for (const variation of [0, .5, 1]) for (const seed of [7, 42]) {
            // Negative phases and >1 phases test the material's symmetry itself.
            for (const phase of [-1/360, 0, .173, .5, .917]) {
              const a = render(phase, variation, seed), b = render(phase + 1, variation, seed);
              periods.push({ phase, variation, seed, ...difference(a, b) });
              const flag = render(phase, variation, seed, true);
              let invalidPixels = 0;
              for (let i = 0; i < flag.length; i += 4) if (flag[i]) invalidPixels++;
              if (invalidPixels) invalid.push({ phase, variation, seed, invalidPixels });
            }
          }
          const canonical = render(.173, .5, 42);
          const repeat = difference(canonical, render(.173, .5, 42));
          let dark = 0, bright = 0, accent = 0;
          for (let i = 0; i < canonical.length; i += 4) {
            const r=canonical[i], g=canonical[i+1], b=canonical[i+2];
            if (Math.max(r,g,b) < 40) dark++;
            if (Math.min(r,g,b) > 220) bright++;
            if (r > 180 && g < 120 && b < 100) accent++;
          }
          gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
          return { periods, invalid, repeat, fractions: { dark: dark/102400, bright: bright/102400, accent: accent/102400 } };
        }, { source: shader.source });
        assert.deepEqual(result.invalid, [], 'radiance must be finite, nonnegative and within shared HDR bounds');
        assert.equal(result.repeat.maximum, 0, 'arbitrary-phase rendering must be deterministic');
        for (const entry of result.periods) {
          assert.ok(entry.mean < .025, `raw t/t+1 mean error exceeds .025/255: ${JSON.stringify(entry)}`);
          assert.ok(entry.maximum <= 6, `raw t/t+1 edge error exceeds 6/255: ${JSON.stringify(entry)}`);
        }
        assert.ok(result.fractions.dark > .1 && result.fractions.bright > .1, `lost the black/white ground: ${JSON.stringify(result.fractions)}`);
        assert.ok(result.fractions.accent > .0008, `lost the vermilion accent: ${JSON.stringify(result.fractions)}`);
        t.diagnostic(`${shader.id}: largest period MAE ${Math.max(...result.periods.map(e => e.mean)).toFixed(6)}/255; ${JSON.stringify(result.fractions)}`);
      });
    }
  } finally { await browser.close(); }
});

/** Direct float-buffer checks: no renderer clamping or phase wrapping. */
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { createServer } from './serve.mjs';
import { SPACE_SHADERS } from '../src/shaders-space.js';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
const server = await createServer({ port: 0 });
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/__raw-shader-qa__`);
  const report = await page.evaluate(studies => {
    const size = 120, canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const gl = canvas.getContext('webgl2', { antialias: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) throw new Error('Float-buffer shader QA unavailable.');
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const framebuffer = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete float target.');
    gl.viewport(0, 0, size, size); gl.bindVertexArray(gl.createVertexArray());
    function compile(type, source) {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    const vertex = compile(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}');
    function program(source) {
      const fs = compile(gl.FRAGMENT_SHADER, `#version 300 es\nprecision highp float;uniform float uPhase,uVariation,uSeed,uResolution;out vec4 colour;\n${source}\nvoid main(){colour=vec4(artwork(gl_FragCoord.xy/${size}.0*2.-1.),1.);}`);
      const p = gl.createProgram(); gl.attachShader(p, vertex); gl.attachShader(p, fs); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      gl.deleteShader(fs);
      return { p, u: Object.fromEntries(['uPhase', 'uVariation', 'uSeed', 'uResolution'].map(n => [n, gl.getUniformLocation(p, n)])) };
    }
    function render(pr, phase, variation = 0.5, seed = 42, resolution = 2400) {
      gl.useProgram(pr.p);
      for (const [key, value] of Object.entries({ uPhase: phase, uVariation: variation, uSeed: seed, uResolution: resolution })) gl.uniform1f(pr.u[key], value);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const data = new Float32Array(size * size * 4); gl.readPixels(0, 0, size, size, gl.RGBA, gl.FLOAT, data);
      return data;
    }
    function difference(a, b) {
      let sum = 0, max = 0, significant = 0;
      for (let i = 0; i < a.length; i += 4) {
        let pixel = 0;
        for (let k = 0; k < 3; k++) { const d = Math.abs(a[i + k] - b[i + k]); sum += d; max = Math.max(max, d); pixel = Math.max(pixel, d); }
        if (pixel > 0.08) significant++;
      }
      return { meanLinearError: sum / (size * size * 3), maxLinearError: max, pixelsOver008: significant, pixelFractionOver008: significant / (size * size) };
    }
    const results = [];
    for (const study of studies) {
      const pr = program(study.source);
      const referenceSource = study.source.replace('int steps=uResolution<800.0?68:80;', 'int steps=160;').replace('for(int i=0;i<80;i++)', 'for(int i=0;i<160;i++)');
      if (referenceSource === study.source) throw new Error('Reference trace substitution failed.');
      const reference = program(referenceSource);
      let nonfinite = 0, negative = 0, peak = 0, configurations = 0, rawSeamMax = 0;
      for (const seed of [0, 1, 42, 7349, 4294967295]) for (const variation of [0, 0.5, 1]) {
        const first = render(pr, 0, variation, seed), last = render(pr, 1, variation, seed);
        rawSeamMax = Math.max(rawSeamMax, difference(first, last).maxLinearError);
        for (const phase of [0, 0.17, 0.39, 0.71]) {
          const data = phase === 0 ? first : render(pr, phase, variation, seed);
          configurations++;
          for (let i = 0; i < data.length; i += 4) for (let k = 0; k < 3; k++) {
            const x = data[i + k]; if (!Number.isFinite(x)) nonfinite++;
            if (x < 0) negative++; peak = Math.max(peak, x);
          }
        }
      }
      const tracing = [];
      for (const phase of [0, 0.15, 0.30, 0.50, 0.70, 0.85]) {
        const normal = render(pr, phase), preview = render(pr, phase, 0.5, 42, 720), deep = render(reference, phase);
        tracing.push({ phase, previewVsPublication: difference(preview, normal), publicationVs160: difference(normal, deep) });
      }
      results.push({ id: study.id, size, configurations, rawSeamMax, nonfinite, negative, peak, tracing });
      gl.deleteProgram(pr.p); gl.deleteProgram(reference.p);
    }
    return results;
  }, SPACE_SHADERS.map(({ id, source }) => ({ id, source })));
  await mkdir('output/qa/03', { recursive: true });
  await writeFile('output/qa/03/space-numeric.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.some(r => r.nonfinite || r.negative || r.rawSeamMax)) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
}

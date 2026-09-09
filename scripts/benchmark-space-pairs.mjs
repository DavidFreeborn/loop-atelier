/** Isolated exact-pair-ordering prototype. Never edits production shader source. */
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { createServer } from './serve.mjs';
import { SPACE_SHADERS } from '../src/shaders-space.js';

function prototype(study) {
  if (study.id === 'section') return study.source.replace(
    /  float a=squareBeam\(d\.xy,gWidth,0\.017\);[\s\S]*?  float ivory=min\(a,min\(b,c\)\),metal=min\(e,min\(f,g\)\);/,
    `  float smallest=min(d.x,min(d.y,d.z));
  float middle=max(min(d.x,d.y),min(max(d.x,d.y),d.z));
  float ivory=squareBeam(vec2(smallest,middle),gWidth,0.017);
  float metal=squareBeam(vec2(smallest,d.w),gWidth,0.017);`);
  return study.source.replace(
    /  float a=squareBeam\(d\.xy,0\.040,0\.045\);[\s\S]*?  return vec2\(distance,a<b&&a<c\?1\.0:\(b<c\?2\.0:3\.0\)\);/,
    `  float smallest=min(d.x,min(d.y,d.z));
  float middle=max(min(d.x,d.y),min(max(d.x,d.y),d.z));
  float distance=squareBeam(vec2(smallest,middle),0.040,0.045);
  vec3 ranked=d-vec3(0.040),positive=max(ranked,0.0);
  vec3 squared=positive*positive;
  float a=squared.x+squared.y+min(max(ranked.x,ranked.y),0.0);
  float b=squared.x+squared.z+min(max(ranked.x,ranked.z),0.0);
  float c=squared.y+squared.z+min(max(ranked.y,ranked.z),0.0);
  return vec2(distance,a<b&&a<c?1.0:(b<c?2.0:3.0));`);
}

// Section's verified prototype is now production. Reconstruct its former
// six-pair baseline so this comparison remains reproducible after adoption.
function baseline(study) {
  if (study.id !== 'section') return study.source;
  return study.source.replace(
    /  float smallest=min\(d\.x,min\(d\.y,d\.z\)\);[\s\S]*?  float metal=squareBeam\(vec2\(smallest,d\.w\),gWidth,0\.017\);/,
    `  float a=squareBeam(d.xy,gWidth,0.017);
  float b=squareBeam(d.xz,gWidth,0.017);
  float c=squareBeam(d.yz,gWidth,0.017);
  float e=squareBeam(d.xw,gWidth,0.017);
  float f=squareBeam(d.yw,gWidth,0.017);
  float g=squareBeam(d.zw,gWidth,0.017);
  float ivory=min(a,min(b,c)),metal=min(e,min(f,g));`);
}

function algebraCheck() {
  const width=0.04,bevel=0.045;
  const square=(x,y)=>{x-=width;y-=width;return Math.hypot(Math.max(x,0),Math.max(y,0))+Math.min(Math.max(x,y),0)-bevel;};
  const key=(x,y)=>{x-=width;y-=width;return Math.max(x,0)**2+Math.max(y,0)**2+Math.min(Math.max(x,y),0);};
  let maximumError=0,materialMismatches=0,cases=0;
  function inspect(d) {
    const a=square(d[0],d[1]),b=square(d[0],d[2]),c=square(d[1],d[2]);
    const smallest=Math.min(...d),middle=Math.max(Math.min(d[0],d[1]),Math.min(Math.max(d[0],d[1]),d[2]));
    maximumError=Math.max(maximumError,Math.abs(Math.min(a,b,c)-square(smallest,middle)));
    const ak=key(d[0],d[1]),bk=key(d[0],d[2]),ck=key(d[1],d[2]);
    const original=a<b&&a<c?1:(b<c?2:3),optimized=ak<bk&&ak<ck?1:(bk<ck?2:3);
    if(original!==optimized)materialMismatches++;
    cases++;
  }
  for(let i=1;i<=300000;i++) inspect([Math.abs(Math.sin(i*1.718)),Math.abs(Math.cos(i*.617)),Math.abs(Math.sin(i*.931))]);
  const special=[0,.01,.02,.039999,.04,.040001,.05,.2,1];
  for(const x of special)for(const y of special)for(const z of special)inspect([x,y,z]);
  return {cases,maximumError,materialMismatches};
}

const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const server=await createServer({port:0}),browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/__space-pair-benchmark__`);
  const studies=SPACE_SHADERS.map(s=>{const original=baseline(s);return {id:s.id,original,optimized:prototype({...s,source:original})};});
  if(studies.some(s=>s.original===s.optimized))throw new Error('Prototype substitution failed.');
  const gpu=await page.evaluate(studies=>{
    const size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const gl=canvas.getContext('webgl2',{antialias:false});if(!gl?.getExtension('EXT_color_buffer_float'))throw new Error('Float target unavailable.');
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,size,size,0,gl.RGBA,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    gl.viewport(0,0,size,size);gl.bindVertexArray(gl.createVertexArray());
    function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
    const vertex=compile(gl.VERTEX_SHADER,'#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}');
    function program(source){const fs=compile(gl.FRAGMENT_SHADER,`#version 300 es\nprecision highp float;uniform float uPhase,uVariation,uSeed,uResolution;out vec4 colour;\n${source}\nvoid main(){colour=vec4(artwork(gl_FragCoord.xy/${size}.0*2.-1.),1.);}`);const p=gl.createProgram();gl.attachShader(p,vertex);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));gl.deleteShader(fs);return {p,u:Object.fromEntries(['uPhase','uVariation','uSeed','uResolution'].map(n=>[n,gl.getUniformLocation(p,n)]))};}
    const read=new Float32Array(size*size*4);
    function render(pr,phase,variation=.5,seed=42){gl.useProgram(pr.p);gl.uniform1f(pr.u.uPhase,phase);gl.uniform1f(pr.u.uVariation,variation);gl.uniform1f(pr.u.uSeed,seed);gl.uniform1f(pr.u.uResolution,1440);gl.drawArrays(gl.TRIANGLES,0,3);gl.readPixels(0,0,size,size,gl.RGBA,gl.FLOAT,read);return read;}
    const median=x=>x.slice().sort((a,b)=>a-b)[Math.floor(x.length/2)];
    const results=[];
    for(const s of studies){
      const a=program(s.original),b=program(s.optimized);let maxError=0,sumError=0,different=0,pixels=0;
      for(const seed of[0,42,7349])for(const variation of[0,.5,1])for(const phase of[0,.15,.3,.7]){
        const original=render(a,phase,variation,seed).slice(),optimized=render(b,phase,variation,seed);
        for(let i=0;i<original.length;i+=4){let pixel=0;for(let k=0;k<3;k++){const d=Math.abs(original[i+k]-optimized[i+k]);maxError=Math.max(maxError,d);sumError+=d;pixel=Math.max(pixel,d);}if(pixel>1e-6)different++;pixels++;}
      }
      // Alternating ABBA groups reduce interference from thermal/scheduler drift.
      const timesA=[],timesB=[];
      for(let group=0;group<12;group++)for(const which of[0,1,1,0]){
        const pr=which?b:a,start=performance.now();
        for(let n=0;n<4;n++)render(pr,(group*4+n)/48);
        (which?timesB:timesA).push((performance.now()-start)/4);
      }
      results.push({id:s.id,size,configurations:36,maxLinearError:maxError,meanLinearError:sumError/(pixels*3),differentPixelsOver1e6:different,totalPixels:pixels,originalMedianMs:median(timesA),optimizedMedianMs:median(timesB),speedup:median(timesA)/median(timesB),originalSamplesMs:timesA,optimizedSamplesMs:timesB});
      gl.deleteProgram(a.p);gl.deleteProgram(b.p);
    }
    return results;
  },studies);
  const report={algebra:algebraCheck(),gpu};await mkdir('output/qa/03',{recursive:true});await writeFile('output/qa/03/space-pair-optimization.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({algebra:report.algebra,gpu:gpu.map(({originalSamplesMs,optimizedSamplesMs,...summary})=>summary)},null,2));
} finally {await browser.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}

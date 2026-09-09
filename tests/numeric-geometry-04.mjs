/** Raw float GLSL validation; bypasses renderer phase wrapping and clamping. */
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import path from 'node:path';
import {writeFile,mkdir} from 'node:fs/promises';
import {createServer} from '../scripts/serve.mjs';
import {GEOMETRY_04_SHADERS} from '../src/shaders-geometry-04.js';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const server=await createServer({port:0}),browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/__geometry_numeric__`);
 const report=await page.evaluate(studies=>{
  const size=112,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const gl=canvas.getContext('webgl2',{antialias:false,powerPreference:'high-performance'});
  if(!gl||!gl.getExtension('EXT_color_buffer_float'))throw new Error('Float target unavailable');
  const ext=gl.getExtension('WEBGL_debug_renderer_info'),renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;
  if(!renderer||renderer.includes('SwiftShader'))throw new Error('Hardware backend required');
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,size,size,0,gl.RGBA,gl.FLOAT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Incomplete target');
  gl.viewport(0,0,size,size);gl.bindVertexArray(gl.createVertexArray());
  function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  const vs=compile(gl.VERTEX_SHADER,'#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}');
  function program(source){
   const fs=compile(gl.FRAGMENT_SHADER,`#version 300 es\nprecision highp float;uniform float uPhase,uVariation,uSeed,uResolution;out vec4 colour;\n${source}\nvoid main(){colour=vec4(artwork(gl_FragCoord.xy/${size}.0*2.-1.),1.);}`);
   const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(fs);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
   return {p,u:Object.fromEntries(['uPhase','uVariation','uSeed','uResolution'].map(n=>[n,gl.getUniformLocation(p,n)]))};
  }
  function render(pr,t,v=.5,seed=42){gl.useProgram(pr.p);for(const [key,value] of Object.entries({uPhase:t,uVariation:v,uSeed:seed,uResolution:1440}))gl.uniform1f(pr.u[key],value);gl.drawArrays(gl.TRIANGLES,0,3);const a=new Float32Array(size*size*4);gl.readPixels(0,0,size,size,gl.RGBA,gl.FLOAT,a);return a;}
  function compare(a,b){let max=0,sum=0,significant=0,missed=0;for(let i=0;i<a.length;i+=4){let diff=0;for(let k=0;k<3;k++){const d=Math.abs(a[i+k]-b[i+k]);max=Math.max(max,d);sum+=d;diff=Math.max(diff,d);}if(diff>.1)significant++;if(Math.max(a[i],a[i+1],a[i+2])<.019&&Math.max(b[i],b[i+1],b[i+2])>.06)missed++;}return {max,mean:sum/(size*size*3),significant,missed};}
  const results=[];
  for(const s of studies){
   const deepSource=s.source.replace('i<180;i++){\n  hit=cellMap','i<512;i++){\n  hit=cellMap').replace('i<240;i++){\n  hit=milnorMap','i<512;i++){\n  hit=milnorMap');
   if(s.id!=='surgery'&&deepSource===s.source)throw new Error('Deeper primary tracing substitution failed');
   const laguerreMarch=String.raw`float cellShadow(vec3 p,vec3 direction){
 float t=.005,end=sphereInterval(p,direction,1.57).y;
 for(int i=0;i<2048;i++){
  float d=cellMap(p+direction*t).x;if(d<.00035)return .065;
  t+=max(d*.98,.00035);if(t>end)return 1.0;
 }
 return .065;
}
`;
   const deepShadowSource=s.id==='laguerre'?s.source.replace(/float cellShadow\(vec3 p,vec3 direction\)\{[\s\S]*?(?=vec3 artwork\(vec2 p\))/,laguerreMarch):(s.id==='milnor'?s.source.replace('i<180;i++','i<512;i++'):s.source);
   const pr=program(s.source),reference=program(deepSource),shadowReference=program(deepShadowSource);
   let nonfinite=0,negative=0,peak=0,seamMax=0,configs=0;
   for(const seed of [0,42,7349])for(const v of [0,.5,1]){
    for(const t of [0,.125,.375,.75]){
     const a=render(pr,t,v,seed),b=render(pr,t+1,v,seed);seamMax=Math.max(seamMax,compare(a,b).max);configs++;
     for(let i=0;i<a.length;i+=4)for(let k=0;k<3;k++){if(!Number.isFinite(a[i+k]))nonfinite++;if(a[i+k]<0)negative++;peak=Math.max(peak,a[i+k]);}
    }
   }
   const trace=[0,.15,.30,.5,.70,.85].map(t=>({phase:t,...compare(render(pr,t),render(reference,t))}));
   const shadowTrace=[0,.15,.30,.5,.70,.85].map(t=>({phase:t,...compare(render(pr,t),render(shadowReference,t))}));
   results.push({id:s.id,configs,nonfinite,negative,peak,seamMax,trace,shadowTrace});gl.deleteProgram(pr.p);gl.deleteProgram(reference.p);gl.deleteProgram(shadowReference.p);
  }
  return {size,renderer,results};
 },GEOMETRY_04_SHADERS);
 report.browser=browser.version();await mkdir('output/qa/04/geometry',{recursive:true});await writeFile('output/qa/04/geometry/numeric.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(report.results.some(r=>r.nonfinite||r.negative||r.seamMax))process.exitCode=1;
}finally{await browser.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}

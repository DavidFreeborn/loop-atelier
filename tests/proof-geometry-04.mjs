/** Bounded visual proofs of the collection 04 geometry; full Chromium / hardware. */
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from '../scripts/serve.mjs';
import { GEOMETRY_04_SHADERS } from '../src/shaders-geometry-04.js';
const require=createRequire(import.meta.url);let chromium;
try {({chromium}=require('playwright'));}
catch {({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const args=process.argv.slice(2),selected=GEOMETRY_04_SHADERS.filter(s=>!args.filter(a=>!a.startsWith('--')).length||args.includes(s.id));
const size=Number(args.find(x=>x.startsWith('--size='))?.split('=')[1]||640);
const samples=Number(args.find(x=>x.startsWith('--samples='))?.split('=')[1]||2);
const camera=args.find(x=>x.startsWith('--camera='))?.split('=')[1];
if(camera&&!['left','right'].includes(camera))throw new Error('Camera audition must be left or right');
if(camera)for(const scene of selected){if(scene.id==='milnor')scene.source=scene.source.replace(/vec3 ro=vec3\([\d.,]+\);ro.xz/,camera==='left'?'vec3 ro=vec3(2.20,2.32,4.683);ro.xz':'vec3 ro=vec3(4.25,2.15,3.078);ro.xz');}
const phases=args.includes('--motion')?Array.from({length:48},(_,i)=>i/48):[0,.15,.30,.50,.70,.85];
const server=await createServer({port:0});
const browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/__geometry_proof__`);
 const renderer=await page.evaluate(async ({size})=>{
  const {LoopRenderer}=await import('/src/renderer.js');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;document.body.append(canvas);
  window.proofRenderer=new LoopRenderer(canvas);
  const gl=proofRenderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');
  return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):null;
 },{size});
 if(!renderer||/SwiftShader/i.test(renderer))throw new Error(`Hardware proof requested, actual renderer: ${renderer}`);
 const report={browser:browser.version(),renderer,size,samples,results:[]};
 for(const scene of selected){
  const folder=`output/qa/04/geometry/${scene.id}${camera?'-camera-'+camera:''}`;await mkdir(folder,{recursive:true});
  const start=Date.now();
  for(const [i,time] of phases.entries()){
   const png=await page.evaluate(({scene,time,samples})=>{
    proofRenderer.render({...scene,seed:42},time,{samples,duration:12,variation:.5,palette:'native'});
    return proofRenderer.canvas.toDataURL('image/png');
   },{scene,time,samples});
   await writeFile(`${folder}/${args.includes('--motion')?'frame':'proof'}-${String(i).padStart(3,'0')}.png`,Buffer.from(png.split(',')[1],'base64'));
  }
  report.results.push({id:scene.id,frames:phases.length,seconds:(Date.now()-start)/1000});console.log(report.results.at(-1));
 }
 await mkdir('output/qa/04/geometry',{recursive:true});
 await writeFile('output/qa/04/geometry/proofs.json',JSON.stringify(report,null,2));
} finally {await browser.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}

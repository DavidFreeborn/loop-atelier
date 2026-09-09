/** Direct shader proofs, independent of app registration; Chromium hardware GPU. */
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {MATHEMATICS_04_SHADERS} from '../src/shaders-mathematics-04.js';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const args=process.argv.slice(2),motion=args.includes('--motion');
const selected=MATHEMATICS_04_SHADERS.filter(s=>!args.some(a=>!a.startsWith('--'))||args.includes(s.id));
const browser=await chromium.launch({channel:'chromium',headless:true});
try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:4173/?export=1');
 const device=await page.evaluate(async()=>{const{LoopRenderer}=await import('/src/renderer.js');const c=document.createElement('canvas');c.width=800;window.mathProof={canvas:c,renderer:new LoopRenderer(c)};const gl=mathProof.renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),hdr:mathProof.renderer.hdr};});
 console.log(JSON.stringify(device));
 for(const shader of selected){
  const out=`output/qa/04-mathematics/${shader.id}`;await mkdir(out,{recursive:true});
  const phases=motion?Array.from({length:120},(_,i)=>i/120):[0,.17,.33,.5,.67,.83];
  const started=Date.now();
  for(const [i,time]of phases.entries()){
   const data=await page.evaluate(o=>{const{canvas,renderer}=mathProof;renderer.resize(o.size);renderer.render({kind:'shader',source:o.source,seed:601.1037519201636},o.time,{samples:o.samples,palette:'native',variation:.5,duration:12,fps:o.fps,shutter:.65,exposure:1});return canvas.toDataURL('image/png');},{source:shader.source,time,size:motion?480:800,samples:motion?2:4,fps:motion?10:30});
   await writeFile(`${out}/${motion?'frame':'proof'}-${String(i).padStart(3,'0')}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
  console.log(`${shader.id}: ${phases.length} frames in ${(Date.now()-started)/1000}s`);
 }
}finally{await browser.close();}

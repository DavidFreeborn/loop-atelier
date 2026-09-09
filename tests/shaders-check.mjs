/** Image-based contracts for procedural fields; they do not pretend to be particles. */
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {SCENES} from '../src/scenes.js';import {createServer} from '../scripts/serve.mjs';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const collection=Math.max(...SCENES.map(s=>s.collection||1));
const server=await createServer({port:0});const browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-unsafe-swiftshader']});const results=[],errors=[];
try{
 const page=await browser.newPage({reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/?export=1`);await page.waitForFunction(()=>window.loopStudio?.ready);
 for(const meta of SCENES.filter(s=>s.kind==='shader'&&s.collection===collection)){
  const result=await page.evaluate(async meta=>{
   const pixels=async(time,more={})=>{const im=new Image();im.src=loopStudio.capture({scene:meta.id,size:256,time,samples:1,...more});await im.decode();const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);return x.getImageData(0,0,256,256).data;};
   const diff=(a,b)=>{let e=0;for(let i=0;i<a.length;i++)if(i%4!==3)e+=Math.abs(a[i]-b[i]);return e/(a.length*.75);};
   const start=performance.now(),a=await pixels(.173),seed=await pixels(.173,{seed:9182}),vary=await pixels(.173,{variation:.9});
   const repeat=diff(a,await pixels(.173)),seedDifference=diff(a,seed),variationDifference=diff(a,vary);
   const f0=await pixels(0),f1=await pixels(1),h=1/(30*meta.duration),left=await pixels(1-h),right=await pixels(h);
   const seam=diff(left,f0),next=diff(f0,right);let regular=[];let previous=f0;
   for(let i=1;i<=16;i++){const p=await pixels(i/16);regular.push(diff(previous,p));previous=p;}
   const samplingDifference=diff(await pixels(.173,{samples:8}),await pixels(.173,{samples:16}));
   let min=255,max=0;for(let i=0;i<a.length;i++)if(i%4!==3){min=Math.min(min,a[i]);max=Math.max(max,a[i]);}
   return {scene:meta.id,repeat,periodDifference:diff(f0,f1),seedDifference,variationDifference,seamStep:seam,nextStep:next,seamRatio:seam/Math.max(next,.001),phaseChanges:regular,samplingDifference,min,max,seconds:(performance.now()-start)/1000};
  },meta);
  results.push(result);console.log(JSON.stringify(result));
  assert.equal(result.repeat,0);assert.equal(result.periodDifference,0);assert.ok(result.max-result.min>50,'Nonblank dynamic range');assert.ok(result.seedDifference>.02,'Seed has visible effect');assert.ok(result.variationDifference>.1,'Variation has visible effect');assert.ok(Math.max(...result.phaseChanges)>2,'Substantial structure changes');assert.ok(result.seamRatio>.2&&result.seamRatio<5,'Loop seam agrees with neighbouring motion');
 }
 assert.deepEqual(errors,[]);
}finally{const out=`output/qa/${String(collection).padStart(2,'0')}`;await mkdir(out,{recursive:true});await writeFile(`${out}/shader-checks.json`,JSON.stringify({collection,results,errors},null,2));await browser.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}

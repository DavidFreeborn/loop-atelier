/** Compare displayed movie frame zero against its exact source frame. */
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { SCENES } from '../src/scenes.js';
import { createServer } from '../scripts/serve.mjs';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const flags=process.argv.slice(2);
for(const flag of flags) if(!['--available','--new-only'].includes(flag)) throw new Error(`Unknown option: ${flag}`);
const results=[];
const available=flags.includes('--available'),newOnly=flags.includes('--new-only');
const latestCollection=Math.max(...SCENES.map(s=>s.collection||1));
const selected=SCENES.filter(s=>(!newOnly||s.collection===latestCollection)&&(!available||(existsSync(`output/loops/${s.id}.mp4`)&&existsSync(`output/loops/${s.id}.mp4.manifest.json`))));
assert.ok(selected.length>0,'No publication movies matched the requested scope.');
const server=await createServer({port:0});
let browser;
try{
  browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({reducedMotion:'reduce'});
  await page.goto(`http://127.0.0.1:${server.address().port}/?export=1`);await page.waitForFunction(()=>window.loopStudio?.ready);
  for(const scene of selected){
    const manifest=JSON.parse(await readFile(`output/loops/${scene.id}.mp4.manifest.json`,'utf8'));
    assert.equal(manifest.parameters.scene,scene.id,'Movie manifest names a different study.');
    assert.ok(Number.isInteger(manifest.parameters.size)&&manifest.parameters.size>=64,'Movie manifest must specify its actual raster size.');
    const result=await page.evaluate(async ({meta,parameters})=>{
      const size=parameters.size,colour=meta.kind==='shader';
      const image=new Image();
      // The manifest is the source of truth for seed, palette, shutter, sample
      // count, exposure and size. A default recipe is not an exact frame match.
      image.src=loopStudio.capture({...parameters,time:0});
      await image.decode();
      const video=document.createElement('video');video.muted=true;video.preload='auto';video.src=`output/loops/${meta.id}.mp4`;
      try{
        await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(new Error(`Video load failed: ${meta.id}.`));});
        if(video.videoWidth!==size||video.videoHeight!==size||video.currentTime!==0) throw new Error('Decoded movie frame does not match manifest size and frame-zero time.');
        const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
        const a=ctx.getImageData(0,0,size,size).data;ctx.drawImage(video,0,0);
        const b=ctx.getImageData(0,0,size,size).data;
        let n=0;const source=[0,0,0],movie=[0,0,0],absolute=[0,0,0];
        const channels=colour?[0,1,2]:[0];
        for(let i=0;i<a.length;i+=4)if((colour?Math.max(a[i],a[i+1],a[i+2]):a[i])>24){
          n++;
          for(const channel of channels){source[channel]+=a[i+channel];movie[channel]+=b[i+channel];absolute[channel]+=Math.abs(a[i+channel]-b[i+channel]);}
        }
        if(!n) throw new Error('Source image has no foreground pixels.');
        const average=values=>channels.reduce((sum,channel)=>sum+values[channel],0)/(n*channels.length);
        return {scene:meta.id,size,channels:colour?'RGB':'R',foregroundPixels:n,sourceMean:average(source),videoMean:average(movie),meanAbsoluteByteDifference:average(absolute),perChannel:Object.fromEntries(channels.map(c=>[['red','green','blue'][c],{sourceMean:source[c]/n,videoMean:movie[c]/n,meanAbsoluteByteDifference:absolute[c]/n}]))};
      }finally{video.removeAttribute('src');video.load();}
    },{meta:scene,parameters:manifest.parameters});
    results.push(result);console.log(JSON.stringify(result));
  }
  assert.ok(results.length>0&&results.every(r=>Object.values(r.perChannel).every(channel=>channel.meanAbsoluteByteDifference<4)),'Every measured colour channel should preserve source appearance within mean codec/raster error <4/255.');
}finally{
  await mkdir('output/qa',{recursive:true});
  await writeFile(`output/qa/video-appearance${newOnly?'.new':''}${available?'.available':''}.json`,JSON.stringify({scope:newOnly?`collection_${latestCollection}`:'complete_collection',partial:available,method:'Chromium canvas comparison of decoded video frame zero with the exact manifest recipe. Colour studies compare R, G and B separately where max(source RGB)>24; monochrome particle studies retain the original R comparison where source R>24. Every measured channel must have mean absolute difference <4/255.',results},null,2));
  await browser?.close();
  await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
}

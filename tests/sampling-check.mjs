/** Compare 8 vs 16 shutter samples near each scene's sampled maximum speed. */
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { SCENES, createScene } from '../src/scenes.js';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
await mkdir('output/qa/sampling',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:4173/?export=1');await page.waitForFunction(()=>window.loopStudio?.ready);
const records=[];
try{
  for(const meta of SCENES.filter(s=>s.kind!=='shader')){
    const scene=createScene(meta.id,{count:4096});let best={time:0,speed:0};
    for(let i=0;i<32;i++){
      const t=i/32,a=scene.update(t).slice(),b=scene.update(t+1/(30*meta.duration));let energy=0;
      for(let j=0;j<a.length;j+=4){
        // Invisible recycling coordinates carry no motion energy in the image.
        const visibility=Math.min(a[j+3],b[j+3]);
        energy+=visibility*((a[j]-b[j])**2+(a[j+1]-b[j+1])**2+(a[j+2]-b[j+2])**2)+(a[j+3]-b[j+3])**2;
      }
      if(energy>best.speed)best={time:t,speed:energy};
    }
    const o={scene:meta.id,size:900,count:360000,time:best.time,duration:meta.duration,fps:30,shutter:.65};
    for(const samples of [8,16]){
      const data=await page.evaluate(params=>loopStudio.capture(params),{...o,samples});
      await writeFile(`output/qa/sampling/${meta.id}-${samples}.png`,Buffer.from(data.split(',')[1],'base64'));
    }
    records.push({...o,selection:'Largest visibility-weighted geometry and intensity displacement among 32 evenly spaced candidate phases.'});
  }
  await writeFile('output/qa/sampling/parameters.json',JSON.stringify(records,null,2));
}finally{await browser.close();}
console.log(`Sampling comparisons rendered for ${records.length} studies.`);

/** Multi-phase art-direction proofs for collection 02. Optional scene ids. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { createServer } from './serve.mjs';
import { SCENES } from '../src/scenes.js';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const ids=process.argv.slice(2);
const scenes=SCENES.filter(s=>s.collection===2&&(!ids.length||ids.includes(s.id)));
await mkdir('output/qa/new',{recursive:true});await mkdir('output/thumbnails',{recursive:true});
await writeFile('output/catalog.json',JSON.stringify(SCENES,null,2)+'\n');
const server=await createServer({port:0});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  page.on('pageerror',e=>{throw e;});
  await page.goto(`http://127.0.0.1:${server.address().port}/?export=1`);
  await page.waitForFunction(()=>window.loopStudio?.ready);
  for(const scene of scenes){
    for(const time of [.15,.4,.7]){
      const data=await page.evaluate(o=>loopStudio.capture(o),{scene:scene.id,size:1000,time,count:360000,samples:8});
      await writeFile(`output/qa/new/${scene.id}-${time}.png`,Buffer.from(data.split(',')[1],'base64'));
    }
    console.log(`${scene.title}: three phases rendered.`);
  }
}finally{await browser.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}

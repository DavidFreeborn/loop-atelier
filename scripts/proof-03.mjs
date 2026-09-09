/** Low-resolution motion comes before publication rendering. */
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from './serve.mjs';
import {SCENES} from '../src/scenes.js';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const args=process.argv.slice(2),stills=args.includes('--stills');
const scenes=SCENES.filter(s=>s.collection===3&&(!args.filter(a=>!a.startsWith('--')).length||args.includes(s.id)));
const server=await createServer({port:0});const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/?export=1`);await page.waitForFunction(()=>window.loopStudio?.ready);
 for(const s of scenes){
  const out=`output/qa/03/${s.id}`;await mkdir(out,{recursive:true});const start=Date.now();
  const phases=stills?[0,.15,.3,.5,.7,.85]:Array.from({length:60},(_,i)=>i/60);
  for(const [i,time] of phases.entries()){
   const data=await page.evaluate(o=>loopStudio.capture(o),{scene:s.id,time,size:stills?720:420,samples:stills?4:1});
   await writeFile(`${out}/${stills?'proof':'frame'}-${String(i).padStart(3,'0')}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
  console.log(`${s.id}: ${phases.length} frames, ${((Date.now()-start)/1000).toFixed(1)}s.`);
 }
 if(errors.length)throw new Error(errors.join('\n'));
 await writeFile('output/catalog.json',JSON.stringify(SCENES,null,2)+'\n');
}finally{await browser.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}

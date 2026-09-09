/** Render a selected collection or named studies before making publication masters. */
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from './serve.mjs';
import {SCENES} from '../src/scenes.js';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const flags=process.argv.slice(2), options={stills:false,collection:Math.max(...SCENES.map(s=>s.collection||1)),names:[]};
for(let i=0;i<flags.length;i++){
  const flag=flags[i];
  if(flag==='--stills')options.stills=true;
  else if(['--collection','--size','--samples','--frames'].includes(flag)){
    const value=Number(flags[++i]);if(!Number.isInteger(value)||value<1)throw new Error(`Invalid ${flag}.`);
    options[flag.slice(2)]=value;
  }else if(SCENES.some(s=>s.id===flag))options.names.push(flag);
  else throw new Error(`Unknown argument: ${flag}`);
}
const size=options.size||(options.stills?720:420),samples=options.samples||(options.stills?4:1),frames=options.frames||60;
if(size<64||size>2400||samples>64||frames>360)throw new Error('Proof limits: size64–2400, samples1–64, frames1–360.');
const selected=SCENES.filter(s=>options.names.length?options.names.includes(s.id):(s.collection||1)===options.collection);
if(!selected.length)throw new Error('No studies selected.');
const server=await createServer({port:0});let browser;
try{
  browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?export=1`);await page.waitForFunction(()=>window.loopStudio?.ready);
  for(const s of selected){
    const out=`output/qa/${String(s.collection||1).padStart(2,'0')}/${s.id}`;await mkdir(out,{recursive:true});
    const phases=options.stills?[0,.15,.3,.5,.7,.85]:Array.from({length:frames},(_,i)=>i/frames),start=Date.now();
    for(const [i,time] of phases.entries()){
      const data=await page.evaluate(o=>loopStudio.capture(o),{scene:s.id,time,size,samples});
      await writeFile(`${out}/${options.stills?'proof':'frame'}-${String(i).padStart(3,'0')}.png`,Buffer.from(data.split(',')[1],'base64'));
    }
    await writeFile(`${out}/${options.stills?'proof':'motion'}-metadata.json`,JSON.stringify({scene:s.id,size,samples,phases,browser:browser.version(),seconds:(Date.now()-start)/1000},null,2)+'\n');
    console.log(`${s.id}: ${phases.length} frames in ${((Date.now()-start)/1000).toFixed(1)}s.`);
  }
  if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser?.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}

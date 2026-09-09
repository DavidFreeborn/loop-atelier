import {SCENES} from '../src/scenes.js';
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';
import {pathToFileURL} from 'node:url';import {writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const b=await chromium.launch({headless:true,channel:'chromium',args:['--enable-unsafe-swiftshader']});const results=[],errors=[];
try{
 const p=await b.newPage({viewport:{width:760,height:1000},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
 // Keep the real native observer; retain its callback so the regression below
 // can deliver the valid multi-entry batch that exposed the startup bug.
 await p.addInitScript(()=>{
  const Native=IntersectionObserver;
  window.IntersectionObserver=class extends Native{
   constructor(callback,options){super(callback,options);window.qaSamplerVisibility=entries=>callback(entries,this);}
  };
 });
 // The optional wrapper helpers are irrelevant to this native-control sampler.
 await p.route(/^https?:\/\//,route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
 await p.goto(pathToFileURL(path.resolve('output/qa/inline-preview.html')).href);
 const f=p.frames().find(x=>x!==p.mainFrame());await f.waitForSelector('#sampler-select');
 const ids=await f.locator('select option').evaluateAll(xs=>xs.map(x=>x.value));assert.equal(ids.length,SCENES.length);assert.equal(await f.locator('optgroup').count(),0);
 const hashes=[];
 for(const id of ids){
  await f.locator('select').selectOption(id);await f.waitForFunction(()=>document.querySelector('output').value==='0.150');
  await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const png=await f.locator('canvas').evaluate(c=>{const d=document.createElement('canvas');d.width=d.height=64;d.getContext('2d').drawImage(c,0,0,64,64);return d.toDataURL();});
  hashes.push(createHash('sha256').update(png).digest('hex'));
 }
 assert.equal(new Set(hashes).size,SCENES.length);results.push({name:'All studies render distinctly in one flat selector',passed:true});
 await f.locator('select').selectOption('palimpsest');
 await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const beforeBatch=await f.locator('canvas').evaluate(c=>c.toDataURL());
 await f.evaluate(()=>{const target=document.querySelector('canvas');qaSamplerVisibility([{target,isIntersecting:false},{target,isIntersecting:true}]);});
 await f.locator('input').fill('370');await f.locator('input').dispatchEvent('input');
 await f.waitForFunction(()=>document.querySelector('output').value==='0.370');
 assert.notEqual(await f.locator('canvas').evaluate(c=>c.toDataURL()),beforeBatch);
 await f.evaluate(()=>{const target=document.querySelector('canvas');qaSamplerVisibility([{target,isIntersecting:true},{target,isIntersecting:false}]);});
 await f.locator('input').fill('600');await f.locator('input').dispatchEvent('input');
 await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
 assert.equal(await f.locator('output').evaluate(e=>e.value),'0.370');
 await f.evaluate(()=>qaSamplerVisibility([{target:document.querySelector('canvas'),isIntersecting:true}]));
 await f.waitForFunction(()=>document.querySelector('output').value==='0.600');
 results.push({name:'Batched visibility uses the latest entry and rendering resumes when visible',passed:true});
 assert.equal(await f.locator('button').textContent(),'Play');
 await f.locator('select').selectOption('palimpsest');await f.locator('input').fill('500');await f.locator('input').dispatchEvent('input');await f.waitForFunction(()=>document.querySelector('output').value==='0.500');
 await f.locator('button').click();await f.waitForFunction(()=>Number(document.querySelector('output').value)>.505);await f.locator('button').click();assert.equal(await f.locator('button').textContent(),'Play');
 results.push({name:'Reduced-motion, scrubbing and playback controls work',passed:true});
 for(const width of [320,760]){
  await p.setViewportSize({width,height:1000});await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:`output/qa/inline-final-${width}.png`,fullPage:true});
 }
 results.push({name:'320/760 pixel layouts fit',passed:true});assert.deepEqual(errors,[]);
}finally{await writeFile('output/qa/inline-final.json',JSON.stringify({results,errors},null,2));await b.close();}
console.log(JSON.stringify({results,errors}));

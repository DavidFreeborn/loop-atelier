/** Verify the two delivered HTML forms and the native-video gallery. */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createServer } from '../scripts/serve.mjs';
import { SCENES } from '../src/scenes.js';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const results=[],errors=[];
const browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
page.on('pageerror',e=>errors.push(e.message));
const file=p=>pathToFileURL(path.resolve(p)).href;
try{
  await page.goto(file('output/loop-atelier.html'));await page.waitForFunction(()=>window.loopStudio?.ready && !window.loopStudio.getStats().contextLost);
  assert.equal(await page.locator('#scene-select option').count(),SCENES.length);
  assert.equal(await page.locator('#scene-select optgroup').count(),0);
  const exactPhase=await page.evaluate(()=>{loopStudio.setPhase(.1234567890123456);return {state:loopStudio.getState().time,recipe:loopStudio.getRecipe().time};});
  assert.equal(exactPhase.state,exactPhase.recipe,'Recipes preserve the complete stored phase without decimal truncation.');
  await page.locator('#scene-select').selectOption('undertow');
  assert.equal(await page.evaluate(()=>loopStudio.getState().scene),'undertow');
  const png=await page.evaluate(()=>loopStudio.capture({scene:'ribbon',size:128,samples:2}));
  assert.ok(png.startsWith('data:image/png;base64,'));
  results.push({name:'Self-contained studio opens from disk, all studies are selectable and capture works',passed:true});
  await page.setViewportSize({width:760,height:1000});
  await page.goto(file('output/qa/inline-preview.html'));
  const frame=page.frames().find(f=>f!==page.mainFrame());
  await frame.waitForSelector('#sampler-art');
  await frame.waitForFunction(()=>document.querySelector('canvas').getContext('webgl2')?.getParameter(7937));
  assert.equal(await frame.locator('select option').count(),SCENES.length);
  await frame.locator('select').selectOption('bloom');
  await frame.locator('input').fill('400');await frame.locator('input').dispatchEvent('input');
  await frame.waitForFunction(()=>document.querySelector('output').value==='0.400');
  assert.equal(await frame.locator('button').textContent(),'Play');
  assert.ok((await frame.locator('canvas').getAttribute('aria-label')).startsWith('Bloom.'));
  await page.screenshot({path:'output/qa/inline-sampler.png',fullPage:true});
  results.push({name:'Sandboxed inline sampler renders and responds to study/phase controls',passed:true});
  await page.goto(file('output/gallery.html'));
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('video')).every(v=>v.readyState>=1),null,{timeout:60000});
  const videos=await page.locator('video').evaluateAll(vs=>vs.map(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,loop:v.loop,controls:v.controls})));
  assert.equal(videos.length,SCENES.length);assert.ok(videos.every(v=>v.width===1440&&v.height===1440&&v.loop&&v.controls));
  await page.locator('video').first().evaluate(v=>v.play());
  await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);
  await page.locator('video').first().evaluate(v=>v.pause());
  results.push({name:'Native gallery opens from disk, all videos load and playback advances',passed:true,videos});
  const server=await createServer({port:0});
  try{
    await page.setViewportSize({width:1180,height:1100});
    await page.goto(`http://127.0.0.1:${server.address().port}/examples/replacement.html`);
    await page.waitForFunction(()=>!document.querySelector('#play').disabled);
    assert.equal(await page.locator('#play').textContent(),'Play');
    await page.locator('#play').click();
    await page.waitForFunction(()=>Number(document.querySelector('#phase').value)>0.01);
    await page.locator('#play').click();
    await page.locator('#phase').fill('0.75');await page.locator('#phase').dispatchEvent('input');
    assert.equal(await page.locator('#phase-value').textContent(),'0.750 / 1.000');
    await page.screenshot({path:'output/qa/replacement-example.png',fullPage:true});
    await page.setViewportSize({width:320,height:850});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320);
    results.push({name:'Replacement authoring example renders, plays, scrubs, and fits 320px',passed:true});
  }finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
  assert.deepEqual(errors,[]);
}finally{
  await writeFile('output/qa/package-qa.json',JSON.stringify({results,errors},null,2));
  await browser.close();
}
console.log(JSON.stringify({results,errors}));

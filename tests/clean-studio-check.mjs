/** Presentation checks for the uncluttered studio; catalogue size is dynamic. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from '../scripts/serve.mjs';

const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const flags=process.argv.slice(2);for(const flag of flags)if(flag!=='--standalone')throw Error(`Unknown option ${flag}`);
const server=await createServer({port:0});let browser;
const results=[],errors=[];
await mkdir('output/qa',{recursive:true});
const source=`http://127.0.0.1:${server.address().port}/?export=1`;
const surfaces=[['source',source],...(flags.includes('--standalone')?[['standalone',pathToFileURL(path.resolve('output/loop-atelier.html')).href]]:[])];
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function check(surface,name,work){try{const detail=await work();results.push({surface,name,passed:true,...(detail?{detail}:{})});console.log(`${surface}: ${name} passed`);}catch(error){results.push({surface,name,passed:false,error:error.message});errors.push(`${surface}: ${name}: ${error.message}`);console.error(`${surface}: ${name} FAILED: ${error.message}`);}}

try{
 try{browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-unsafe-swiftshader']});}catch{browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});}
 for(const [surface,url] of surfaces){
  const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
  const pageErrors=[],requests=[];page.on('pageerror',e=>pageErrors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  try{
   await page.goto(url);await page.waitForFunction(()=>window.loopStudio?.ready);await settle(page);
   const catalogue=await page.evaluate(()=>loopStudio.scenes.map(({id,title,technique,formula,kind})=>({id,title,technique,formula,kind})).sort((a,b)=>a.title.localeCompare(b.title,'en')));
   await check(surface,'One title and one flat alphabetical selector, without promotional sections',async()=>{
    assert.deepEqual(await page.locator('h1').allTextContents(),['Loop atelier']);
    assert.equal(await page.title(),'Loop atelier');
    assert.equal(await page.locator('#scene-select optgroup').count(),0);
    assert.deepEqual(await page.locator('#scene-select option').evaluateAll(options=>options.map(o=>({id:o.value,title:o.textContent}))),catalogue.map(({id,title})=>({id,title})));
    assert.equal(await page.locator('.intro,.eyebrow,.masthead-note,.edition,.collection,.collection-note,.caption,.method-strip,footer,[data-collection-choice],#art-number,#art-title,#render-label,#technique-title,.micro-note').count(),0);
    assert.deepEqual(await page.locator('.masthead nav button').allTextContents(),['Studio','Sources']);
    return {studies:catalogue.length};
   });
   await check(surface,'Every study selection updates its mathematics and appropriate controls',async()=>{
    for(const scene of catalogue){
     await page.locator('#scene-select').selectOption(scene.id);
     assert.equal(await page.evaluate(()=>loopStudio.getState().scene),scene.id);
     assert.equal(await page.locator('#technique-description').textContent(),scene.technique);
     assert.equal(await page.locator('#formula').textContent(),scene.formula);
     assert.equal(await page.locator('#density').isVisible(),scene.kind!=='shader');
     assert.ok((await page.locator('#art-canvas').getAttribute('aria-label')).startsWith(scene.title+'.'));
    }
    await page.locator('#scene-select').focus();await page.keyboard.press('Home');
    assert.equal(await page.evaluate(()=>loopStudio.getState().scene),catalogue[0].id);
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(()=>loopStudio.getState().scene),catalogue.at(-1).id);
    return {studies:catalogue.length,keyboardSelection:true};
   });
   await check(surface,'Normal status is accessible and visually hidden; errors remain visible',async()=>{
    await page.locator('#scene-select').selectOption('palimpsest');
    const status=await page.locator('#status').evaluate(e=>({text:e.textContent,role:e.getAttribute('role'),live:e.getAttribute('aria-live'),hidden:e.hidden,ariaHidden:e.getAttribute('aria-hidden'),clip:getComputedStyle(e).clip,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
    assert.match(status.text,/selected/);assert.equal(status.role,'status');assert.equal(status.live,'polite');assert.equal(status.hidden,false);assert.notEqual(status.ariaHidden,'true');assert.equal(status.width,1);assert.equal(status.height,1);assert.notEqual(status.clip,'auto');
    await page.locator('#seed').fill('-1');await page.locator('#seed').blur();
    assert.equal(await page.locator('#error-message').isVisible(),true);
    assert.match(await page.locator('#error-message').textContent(),/Seed must be an integer/);
    await page.locator('#reset').click();assert.equal(await page.locator('#error-message').isVisible(),false);
    return {normalStatusClipped:true,validationErrorVisible:true};
   });
   await check(surface,'Sources has direct navigation and the core bibliography without a duplicate heading',async()=>{
    const recipe=await page.evaluate(()=>loopStudio.getRecipe());
    await page.locator('#guide-tab').click();assert.equal(new URL(page.url()).hash,'#sources');
    assert.equal(await page.locator('#guide-view').isVisible(),true);assert.equal(await page.locator('#studio-view').isVisible(),false);
    const urls=await page.locator('#bibliography a').evaluateAll(links=>links.map(a=>a.href));
    for(const expected of ['https://bleuje.com/tutorials/','https://bleuje.com/tutorial6/','https://github.com/Bleuje/processing-animations-code'])assert.ok(urls.includes(expected));
    assert.match(await page.locator('#bibliography').textContent(),/Dave Whyte/);
    assert.equal(await page.locator('#guide-view h1,#guide-view h2').count(),0);
    await page.locator('#studio-tab').click();assert.equal(new URL(page.url()).hash,'');assert.deepEqual(await page.evaluate(()=>loopStudio.getRecipe()),recipe);
    await page.goto(url+'#sources');await page.waitForFunction(()=>window.loopStudio?.ready);
    assert.equal(await page.locator('#guide-view').isVisible(),true);
    await page.locator('.brand').click();assert.equal(await page.locator('#studio-view').isVisible(),true);
    return {bibliographyEntries:urls.length};
   });
   await check(surface,'Layout stays within 320px through desktop widths',async()=>{
    const layouts=[];
    for(const width of [320,360,390,414,620,700,701,760,900,1280,1600]){
     await page.setViewportSize({width,height:1000});await settle(page);
     const layout=await page.evaluate(()=>{
      const targets=Array.from(document.querySelectorAll('button,input,select,summary,#formula,#technique-description')).filter(e=>e.getClientRects().length&&!e.closest('[hidden]'));
      const overflow=targets.filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5;}).map(e=>e.id||e.tagName);
      const canvas=document.querySelector('#art-canvas').getBoundingClientRect();
      return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow,canvas:{width:canvas.width,height:canvas.height},errorVisible:!document.querySelector('#canvas-error').hidden};
     });
     layouts.push(layout);assert.ok(layout.scrollWidth<=width,JSON.stringify(layout));assert.deepEqual(layout.overflow,[],JSON.stringify(layout));assert.ok(Math.abs(layout.canvas.width-layout.canvas.height)<1);assert.ok(layout.canvas.width>=250);
     if([320,760,1280].includes(width))await page.screenshot({path:`output/qa/clean-studio-${surface}-${width}.png`,fullPage:true});
    }
    await page.setViewportSize({width:320,height:1000});await page.locator('#guide-tab').click();await settle(page);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:`output/qa/clean-sources-${surface}-320.png`,fullPage:true});
    return layouts;
   });
   await check(surface,'Reduced motion and local-only resources survive the cleanup',async()=>{
    assert.equal(await page.evaluate(()=>loopStudio.getState().playing),false);assert.deepEqual(pageErrors,[]);
    if(surface==='standalone')assert.deepEqual(requests,[]);else assert.ok(requests.every(request=>new URL(request).origin===new URL(source).origin));
    return {pageErrors,remoteRequests:requests.filter(r=>new URL(r).origin!==new URL(source).origin)};
   });
  }finally{await page.close();}
 }
}finally{
 await browser?.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});
 await writeFile('output/qa/clean-studio-check.json',JSON.stringify({results,errors},null,2));
}
assert.deepEqual(errors,[]);

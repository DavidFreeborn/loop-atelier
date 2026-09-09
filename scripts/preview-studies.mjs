import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
const require=createRequire(import.meta.url);
let chromium;
try { ({chromium}=require('playwright')); } catch { ({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
await mkdir('output/qa',{recursive:true});await mkdir('output/thumbnails',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:1});
await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.loopStudio?.ready);await page.evaluate(()=>window.loopStudio.pause());
const ids=await page.evaluate(()=>window.loopStudio.scenes.map(s=>s.id));
for(const scene of ids){
  for(const time of [.15,.4,.7]){
    const url=await page.evaluate(o=>window.loopStudio.capture(o),{scene,size:800,time,samples:8});
    await writeFile(`output/qa/${scene}-${time}.png`,Buffer.from(url.split(',')[1],'base64'));
  }
  const thumb=await page.evaluate(o=>window.loopStudio.capture(o),{scene,size:240,time:.15,samples:8});
  await writeFile(`output/thumbnails/${scene}.png`,Buffer.from(thumb.split(',')[1],'base64'));
  console.log(scene);
}
await page.reload();await page.waitForFunction(()=>window.loopStudio?.ready);await page.evaluate(()=>{window.loopStudio.pause();window.loopStudio.setPhase(.15);});
await page.screenshot({path:'output/qa/studio-desktop.png',fullPage:true});
await browser.close();

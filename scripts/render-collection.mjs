/** Render the curated publication collection. Runs serially to bound GPU memory. */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { SCENES } from '../src/scenes.js';
import { existsSync } from 'node:fs';

await mkdir('output/stills',{recursive:true});await mkdir('output/loops',{recursive:true});
const flags=process.argv.slice(2);
for(const flag of flags) if(!['--movies-only','--stills-only','--new-only','--missing-only','--overwrite'].includes(flag)) throw new Error(`Unknown option: ${flag}`);
if(flags.includes('--movies-only')&&flags.includes('--stills-only')) throw new Error('Choose either --movies-only or --stills-only.');
await writeFile('output/catalog.json',JSON.stringify(SCENES,null,2)+'\n');
for(const s of SCENES.filter(s=>!flags.includes('--new-only')||s.collection===Math.max(...SCENES.map(s=>s.collection||1)))) {
  for(const format of flags.includes('--movies-only')?['mp4']:flags.includes('--stills-only')?['png']:['png','mp4']) {
    const output=`output/${format==='png'?'stills':'loops'}/${s.id}.${format}`;
    if(flags.includes('--missing-only')&&existsSync(output)&&existsSync(output+'.manifest.json')){console.log(`${s.title} ${format}: existing asset and manifest retained.`);continue;}
    const args=['scripts/render.mjs','--scene',s.id,'--format',format,'--size',format==='png'?'2400':'1440','--fps','30','--samples',format==='png'?'16':'8','--count','360000','--output',output];
    if(flags.includes('--overwrite')) args.push('--overwrite');
    await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error(`${s.id} ${format}: exit ${code}`)));});
  }
}
console.log('Publication collection complete.');

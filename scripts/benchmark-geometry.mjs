/** Geometry-only timings; deliberately not advertised as playback frame rates. */
import { SCENES, createScene } from '../src/scenes.js';
import { writeFile } from 'node:fs/promises';
const records=[];
for(const meta of SCENES.filter(s=>s.kind!=='shader')){
  const start=performance.now(),scene=createScene(meta.id,{count:180000,seed:42});
  const constructionMs=performance.now()-start;
  for(let i=0;i<8;i++)scene.update(i/8);
  const times=[];
  for(let i=0;i<48;i++){const start=performance.now();scene.update(i/48);times.push(performance.now()-start);}
  times.sort((a,b)=>a-b);
  records.push({scene:meta.id,count:180000,constructionMs,medianMs:times[24],p95Ms:times[45]});
}
const report={runtime:process.version,platform:process.platform,method:'48 geometry updates after 8 warmup updates. Excludes GPU work, projection, browser UI and temporal supersampling.',records};
await writeFile('output/qa/geometry-performance.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
